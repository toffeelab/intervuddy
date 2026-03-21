import { eq, and, isNull, isNotNull, desc, asc, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db/index';
import { interviewQuestions, interviewCategories, followupQuestions } from '@/db/schema';
import type {
  InterviewQuestion,
  FollowupQuestion,
  CreateQuestionInput,
  UpdateQuestionInput,
} from './types';

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

async function batchLoadFollowups(ids: string[]): Promise<Map<string, FollowupQuestion[]>> {
  const map = new Map<string, FollowupQuestion[]>();
  if (ids.length === 0) return map;

  const rows = await getDb()
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
  const followupsMap = await batchLoadFollowups(ids);
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

export async function getLibraryQuestions(userId: string): Promise<InterviewQuestion[]> {
  const rows = await getDb()
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

  return mapRows(rows);
}

export async function getQuestionsByJdId(
  userId: string,
  jdId: string
): Promise<InterviewQuestion[]> {
  const rows = await getDb()
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

  return mapRows(rows);
}

export async function getQuestionsByCategory(
  userId: string,
  categoryId: number
): Promise<InterviewQuestion[]> {
  const rows = await getDb()
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

  return mapRows(rows);
}

export async function createQuestion(userId: string, input: CreateQuestionInput): Promise<string> {
  const categoryId = input.categoryId;

  const [result] = await getDb()
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

export async function updateQuestion(userId: string, input: UpdateQuestionInput): Promise<void> {
  const updates: Partial<typeof interviewQuestions.$inferInsert> = {};

  // categoryId 변경은 허용하지 않음 (display_order 계산 로직 깨짐 방지, 생성 시에만 설정)
  if (input.question !== undefined) updates.question = input.question;
  if (input.answer !== undefined) updates.answer = input.answer;
  if (input.tip !== undefined) updates.tip = input.tip;
  if (input.keywords !== undefined) updates.keywords = input.keywords;

  if (Object.keys(updates).length === 0) return;

  await getDb()
    .update(interviewQuestions)
    .set(updates)
    .where(and(eq(interviewQuestions.id, input.id), eq(interviewQuestions.userId, userId)));
}

export async function updateQuestionKeywords(
  userId: string,
  id: string,
  keywords: string[]
): Promise<void> {
  await getDb()
    .update(interviewQuestions)
    .set({ keywords })
    .where(and(eq(interviewQuestions.id, id), eq(interviewQuestions.userId, userId)));
}

export async function softDeleteQuestion(userId: string, id: string): Promise<void> {
  await getDb()
    .update(interviewQuestions)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(interviewQuestions.id, id), eq(interviewQuestions.userId, userId)));
}

export async function restoreQuestion(userId: string, id: string): Promise<void> {
  await getDb()
    .update(interviewQuestions)
    .set({ deletedAt: null })
    .where(and(eq(interviewQuestions.id, id), eq(interviewQuestions.userId, userId)));
}

export async function getDeletedQuestions(
  userId: string,
  jdId?: string
): Promise<InterviewQuestion[]> {
  const rows = await getDb()
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

  return mapRows(rows);
}
