import type {
  InterviewQuestion,
  FollowupQuestion,
  CreateQuestionInput,
  UpdateQuestionInput,
} from '@intervuddy/shared';
import { eq, and, isNull, isNotNull, desc, asc, inArray, sql } from 'drizzle-orm';
import type { DbOrTx } from '../connection';
import { interviewQuestions, interviewCategories, followupQuestions } from '../schema';

interface FollowupRow {
  id: string;
  questionId: string;
  question: string;
  answer: string;
  displayOrder: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(
  row: {
    id: string;
    categoryId: number;
    categoryName: string;
    categorySlug: string;
    categoryDisplayLabel: string;
    jdId: string | null;
    originQuestionId: string | null;
    question: string;
    answer: string;
    tip: string | null;
    keywords: string[];
    displayOrder: number;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  followups: FollowupQuestion[] = []
): InterviewQuestion {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    categoryDisplayLabel: row.categoryDisplayLabel,
    jdId: row.jdId,
    originQuestionId: row.originQuestionId,
    question: row.question,
    answer: row.answer,
    tip: row.tip,
    displayOrder: row.displayOrder,
    keywords: row.keywords,
    followups,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function batchLoadFollowups(
  db: DbOrTx,
  ids: string[]
): Promise<Map<string, FollowupQuestion[]>> {
  const map = new Map<string, FollowupQuestion[]>();
  if (ids.length === 0) return map;

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
    .where(and(inArray(followupQuestions.questionId, ids), isNull(followupQuestions.deletedAt)))
    .orderBy(asc(followupQuestions.displayOrder));

  for (const r of rows as FollowupRow[]) {
    const arr = map.get(r.questionId) ?? [];
    arr.push({
      id: r.id,
      questionId: r.questionId,
      question: r.question,
      answer: r.answer,
      displayOrder: r.displayOrder,
      deletedAt: r.deletedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
    map.set(r.questionId, arr);
  }
  return map;
}

async function mapRows(
  db: DbOrTx,
  rows: {
    id: string;
    categoryId: number;
    categoryName: string;
    categorySlug: string;
    categoryDisplayLabel: string;
    jdId: string | null;
    originQuestionId: string | null;
    question: string;
    answer: string;
    tip: string | null;
    keywords: string[];
    displayOrder: number;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }[]
): Promise<InterviewQuestion[]> {
  const ids = rows.map((r) => r.id);
  const followupsMap = await batchLoadFollowups(db, ids);
  return rows.map((row) => mapRow(row, followupsMap.get(row.id) ?? []));
}

const questionSelect = {
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
};

export async function getLibraryQuestions(
  db: DbOrTx,
  userId: string
): Promise<InterviewQuestion[]> {
  const rows = await db
    .select(questionSelect)
    .from(interviewQuestions)
    .innerJoin(interviewCategories, eq(interviewCategories.id, interviewQuestions.categoryId))
    .where(
      and(
        eq(interviewQuestions.userId, userId),
        isNull(interviewQuestions.jdId),
        isNull(interviewQuestions.deletedAt)
      )
    )
    .orderBy(asc(interviewCategories.displayOrder), asc(interviewQuestions.displayOrder));

  return mapRows(db, rows);
}

export async function getQuestionsByJdId(
  db: DbOrTx,
  userId: string,
  jdId: string
): Promise<InterviewQuestion[]> {
  const rows = await db
    .select(questionSelect)
    .from(interviewQuestions)
    .innerJoin(interviewCategories, eq(interviewCategories.id, interviewQuestions.categoryId))
    .where(
      and(
        eq(interviewQuestions.userId, userId),
        eq(interviewQuestions.jdId, jdId),
        isNull(interviewQuestions.deletedAt)
      )
    )
    .orderBy(asc(interviewCategories.displayOrder), asc(interviewQuestions.displayOrder));

  return mapRows(db, rows);
}

export async function getQuestionsByCategory(
  db: DbOrTx,
  userId: string,
  categoryId: number
): Promise<InterviewQuestion[]> {
  const rows = await db
    .select(questionSelect)
    .from(interviewQuestions)
    .innerJoin(interviewCategories, eq(interviewCategories.id, interviewQuestions.categoryId))
    .where(
      and(
        eq(interviewQuestions.userId, userId),
        eq(interviewQuestions.categoryId, categoryId),
        isNull(interviewQuestions.deletedAt)
      )
    )
    .orderBy(asc(interviewQuestions.displayOrder));

  return mapRows(db, rows);
}

export async function createQuestion(
  db: DbOrTx,
  userId: string,
  input: CreateQuestionInput
): Promise<string> {
  const categoryId = input.categoryId;

  const [result] = await db
    .insert(interviewQuestions)
    .values({
      userId,
      categoryId,
      jdId: input.jdId ?? null,
      question: input.question,
      answer: input.answer,
      tip: input.tip ?? null,
      keywords: input.keywords ?? [],
      displayOrder: sql`COALESCE((SELECT MAX(${interviewQuestions.displayOrder}) + 1 FROM ${interviewQuestions} WHERE ${interviewQuestions.categoryId} = ${categoryId} AND ${interviewQuestions.deletedAt} IS NULL), 0)`,
    })
    .returning({ id: interviewQuestions.id });

  return result.id;
}

export async function updateQuestion(
  db: DbOrTx,
  userId: string,
  input: UpdateQuestionInput
): Promise<void> {
  const updates: Partial<typeof interviewQuestions.$inferInsert> = {};

  // categoryId 변경은 허용하지 않음 (display_order 계산 로직 깨짐 방지, 생성 시에만 설정)
  if (input.question !== undefined) updates.question = input.question;
  if (input.answer !== undefined) updates.answer = input.answer;
  if (input.tip !== undefined) updates.tip = input.tip;
  if (input.keywords !== undefined) updates.keywords = input.keywords;

  if (Object.keys(updates).length === 0) return;

  await db
    .update(interviewQuestions)
    .set(updates)
    .where(and(eq(interviewQuestions.id, input.id), eq(interviewQuestions.userId, userId)));
}

export async function updateQuestionKeywords(
  db: DbOrTx,
  userId: string,
  id: string,
  keywords: string[]
): Promise<void> {
  await db
    .update(interviewQuestions)
    .set({ keywords })
    .where(and(eq(interviewQuestions.id, id), eq(interviewQuestions.userId, userId)));
}

export async function softDeleteQuestion(db: DbOrTx, userId: string, id: string): Promise<void> {
  await db
    .update(interviewQuestions)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(interviewQuestions.id, id), eq(interviewQuestions.userId, userId)));
}

export async function restoreQuestion(db: DbOrTx, userId: string, id: string): Promise<void> {
  await db
    .update(interviewQuestions)
    .set({ deletedAt: null })
    .where(and(eq(interviewQuestions.id, id), eq(interviewQuestions.userId, userId)));
}

export async function getDeletedQuestions(
  db: DbOrTx,
  userId: string,
  jdId?: string
): Promise<InterviewQuestion[]> {
  const rows = await db
    .select(questionSelect)
    .from(interviewQuestions)
    .innerJoin(interviewCategories, eq(interviewCategories.id, interviewQuestions.categoryId))
    .where(
      jdId !== undefined
        ? and(
            eq(interviewQuestions.userId, userId),
            eq(interviewQuestions.jdId, jdId),
            isNotNull(interviewQuestions.deletedAt)
          )
        : and(eq(interviewQuestions.userId, userId), isNotNull(interviewQuestions.deletedAt))
    )
    .orderBy(desc(interviewQuestions.deletedAt));

  return mapRows(db, rows);
}
