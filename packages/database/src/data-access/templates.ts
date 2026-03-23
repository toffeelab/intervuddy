import { SYSTEM_USER_ID } from '@intervuddy/shared';
import type { InterviewCategory, InterviewQuestion } from '@intervuddy/shared';
import { eq, and, isNull, asc, count, inArray } from 'drizzle-orm';
import type { Database, DbOrTx } from '../connection';
import { interviewCategories, interviewQuestions, followupQuestions } from '../schema';

export async function getSystemCategories(db: DbOrTx): Promise<InterviewCategory[]> {
  const rows = await db
    .select({
      id: interviewCategories.id,
      jdId: interviewCategories.jdId,
      name: interviewCategories.name,
      slug: interviewCategories.slug,
      displayLabel: interviewCategories.displayLabel,
      icon: interviewCategories.icon,
      displayOrder: interviewCategories.displayOrder,
      questionCount: count(interviewQuestions.id),
      deletedAt: interviewCategories.deletedAt,
      createdAt: interviewCategories.createdAt,
      updatedAt: interviewCategories.updatedAt,
    })
    .from(interviewCategories)
    .leftJoin(
      interviewQuestions,
      and(
        eq(interviewQuestions.categoryId, interviewCategories.id),
        isNull(interviewQuestions.deletedAt)
      )
    )
    .where(
      and(
        eq(interviewCategories.userId, SYSTEM_USER_ID),
        isNull(interviewCategories.jdId),
        isNull(interviewCategories.deletedAt)
      )
    )
    .groupBy(interviewCategories.id)
    .orderBy(asc(interviewCategories.displayOrder));

  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
}

export async function getSystemQuestions(db: DbOrTx): Promise<InterviewQuestion[]> {
  const rows = await db
    .select({
      id: interviewQuestions.id,
      categoryId: interviewQuestions.categoryId,
      categoryName: interviewCategories.name,
      categorySlug: interviewCategories.slug,
      categoryDisplayLabel: interviewCategories.displayLabel,
      jdId: interviewQuestions.jdId,
      originQuestionId: interviewQuestions.originQuestionId,
      question: interviewQuestions.question,
      answer: interviewQuestions.answer,
      tip: interviewQuestions.tip,
      keywords: interviewQuestions.keywords,
      displayOrder: interviewQuestions.displayOrder,
      deletedAt: interviewQuestions.deletedAt,
      createdAt: interviewQuestions.createdAt,
      updatedAt: interviewQuestions.updatedAt,
    })
    .from(interviewQuestions)
    .innerJoin(interviewCategories, eq(interviewCategories.id, interviewQuestions.categoryId))
    .where(and(eq(interviewQuestions.userId, SYSTEM_USER_ID), isNull(interviewQuestions.deletedAt)))
    .orderBy(asc(interviewCategories.displayOrder), asc(interviewQuestions.displayOrder));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const followupsMap = await batchLoadFollowups(db, ids);
  return rows.map((row) => ({
    ...row,
    followups: followupsMap.get(row.id) ?? [],
  }));
}

export async function getSystemQuestionsByCategory(
  db: DbOrTx,
  categoryId: number
): Promise<InterviewQuestion[]> {
  const rows = await db
    .select({
      id: interviewQuestions.id,
      categoryId: interviewQuestions.categoryId,
      categoryName: interviewCategories.name,
      categorySlug: interviewCategories.slug,
      categoryDisplayLabel: interviewCategories.displayLabel,
      jdId: interviewQuestions.jdId,
      originQuestionId: interviewQuestions.originQuestionId,
      question: interviewQuestions.question,
      answer: interviewQuestions.answer,
      tip: interviewQuestions.tip,
      keywords: interviewQuestions.keywords,
      displayOrder: interviewQuestions.displayOrder,
      deletedAt: interviewQuestions.deletedAt,
      createdAt: interviewQuestions.createdAt,
      updatedAt: interviewQuestions.updatedAt,
    })
    .from(interviewQuestions)
    .innerJoin(interviewCategories, eq(interviewCategories.id, interviewQuestions.categoryId))
    .where(
      and(
        eq(interviewQuestions.userId, SYSTEM_USER_ID),
        eq(interviewQuestions.categoryId, categoryId),
        isNull(interviewQuestions.deletedAt)
      )
    )
    .orderBy(asc(interviewQuestions.displayOrder));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const followupsMap = await batchLoadFollowups(db, ids);
  return rows.map((row) => ({
    ...row,
    followups: followupsMap.get(row.id) ?? [],
  }));
}

async function batchLoadFollowups(
  db: DbOrTx,
  questionIds: string[]
): Promise<Map<string, InterviewQuestion['followups']>> {
  const map = new Map<string, InterviewQuestion['followups']>();
  if (questionIds.length === 0) return map;

  const rows = await db
    .select({
      id: followupQuestions.id,
      questionId: followupQuestions.questionId,
      question: followupQuestions.question,
      answer: followupQuestions.answer,
      displayOrder: followupQuestions.displayOrder,
      deletedAt: followupQuestions.deletedAt,
      createdAt: followupQuestions.createdAt,
      updatedAt: followupQuestions.updatedAt,
    })
    .from(followupQuestions)
    .where(
      and(inArray(followupQuestions.questionId, questionIds), isNull(followupQuestions.deletedAt))
    )
    .orderBy(asc(followupQuestions.displayOrder));

  for (const r of rows) {
    const arr = map.get(r.questionId) ?? [];
    arr.push(r);
    map.set(r.questionId, arr);
  }
  return map;
}

export interface ImportSystemToLibraryResult {
  importedCategories: number;
  importedQuestions: number;
}

export async function importSystemToLibrary(
  db: Database,
  userId: string,
  params: {
    categoryIds?: number[];
    questionIds?: string[];
  }
): Promise<ImportSystemToLibraryResult> {
  let importedCategories = 0;
  let importedQuestions = 0;

  await db.transaction(async (tx) => {
    // Import categories
    if (params.categoryIds && params.categoryIds.length > 0) {
      const systemCats = await tx
        .select()
        .from(interviewCategories)
        .where(
          and(
            eq(interviewCategories.userId, SYSTEM_USER_ID),
            inArray(interviewCategories.id, params.categoryIds),
            isNull(interviewCategories.deletedAt)
          )
        );

      for (const cat of systemCats) {
        await tx.insert(interviewCategories).values({
          userId,
          sourceCategoryId: cat.id,
          name: cat.name,
          slug: cat.slug,
          displayLabel: cat.displayLabel,
          icon: cat.icon,
          displayOrder: cat.displayOrder,
        });
        importedCategories++;
      }
    }

    // Import questions
    if (params.questionIds && params.questionIds.length > 0) {
      const systemQuestions = await tx
        .select({
          id: interviewQuestions.id,
          categoryId: interviewQuestions.categoryId,
          question: interviewQuestions.question,
          answer: interviewQuestions.answer,
          tip: interviewQuestions.tip,
          keywords: interviewQuestions.keywords,
          displayOrder: interviewQuestions.displayOrder,
        })
        .from(interviewQuestions)
        .where(
          and(
            eq(interviewQuestions.userId, SYSTEM_USER_ID),
            inArray(interviewQuestions.id, params.questionIds),
            isNull(interviewQuestions.deletedAt)
          )
        );

      for (const q of systemQuestions) {
        const [newQuestion] = await tx
          .insert(interviewQuestions)
          .values({
            userId,
            categoryId: q.categoryId,
            originQuestionId: q.id,
            question: q.question,
            answer: q.answer,
            tip: q.tip,
            keywords: q.keywords,
            displayOrder: q.displayOrder,
          })
          .returning({ id: interviewQuestions.id });

        const origFollowups = await tx
          .select({
            question: followupQuestions.question,
            answer: followupQuestions.answer,
            displayOrder: followupQuestions.displayOrder,
          })
          .from(followupQuestions)
          .where(and(eq(followupQuestions.questionId, q.id), isNull(followupQuestions.deletedAt)))
          .orderBy(asc(followupQuestions.displayOrder));

        for (const fu of origFollowups) {
          await tx.insert(followupQuestions).values({
            userId,
            questionId: newQuestion.id,
            question: fu.question,
            answer: fu.answer,
            displayOrder: fu.displayOrder,
          });
        }

        importedQuestions++;
      }
    }
  });

  return { importedCategories, importedQuestions };
}
