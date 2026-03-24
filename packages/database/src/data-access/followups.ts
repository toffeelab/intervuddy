import type {
  FollowupQuestion,
  CreateFollowupInput,
  UpdateFollowupInput,
} from '@intervuddy/shared';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/index';
import { followupQuestions } from '@/db/schema';

export async function getFollowupsByQuestionId(
  userId: string,
  questionId: string
): Promise<FollowupQuestion[]> {
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
    .where(
      and(
        eq(followupQuestions.userId, userId),
        eq(followupQuestions.questionId, questionId),
        isNull(followupQuestions.deletedAt)
      )
    )
    .orderBy(followupQuestions.displayOrder);

  return rows;
}

export async function createFollowup(userId: string, input: CreateFollowupInput): Promise<string> {
  const questionId = input.questionId;

  const [result] = await getDb()
    .insert(followupQuestions)
    .values({
      userId,
      questionId,
      question: input.question,
      answer: input.answer,
      displayOrder: sql`COALESCE((SELECT MAX(${followupQuestions.displayOrder}) + 1 FROM ${followupQuestions} WHERE ${followupQuestions.questionId} = ${questionId} AND ${followupQuestions.deletedAt} IS NULL), 0)`,
    })
    .returning({ id: followupQuestions.id });

  return result.id;
}

export async function updateFollowup(userId: string, input: UpdateFollowupInput): Promise<void> {
  const updates: Partial<typeof followupQuestions.$inferInsert> = {};

  if (input.question !== undefined) updates.question = input.question;
  if (input.answer !== undefined) updates.answer = input.answer;

  if (Object.keys(updates).length === 0) return;

  await getDb()
    .update(followupQuestions)
    .set(updates)
    .where(and(eq(followupQuestions.id, input.id), eq(followupQuestions.userId, userId)));
}

export async function softDeleteFollowup(userId: string, id: string): Promise<void> {
  await getDb()
    .update(followupQuestions)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(followupQuestions.id, id), eq(followupQuestions.userId, userId)));
}

export async function restoreFollowup(userId: string, id: string): Promise<void> {
  await getDb()
    .update(followupQuestions)
    .set({ deletedAt: null })
    .where(and(eq(followupQuestions.id, id), eq(followupQuestions.userId, userId)));
}
