import { eq, and, asc, inArray } from 'drizzle-orm';
import { getDb } from '@/db/index';
import { sessionQuestions, sessionAnswers, sessionFeedbacks } from '@/db/schema';
import type { SessionQuestionRecord } from './types';

export async function recordQuestion(
  sessionId: string,
  input: { questionId?: string; content: string; displayOrder: number }
): Promise<string> {
  const db = getDb();

  const [result] = await db
    .insert(sessionQuestions)
    .values({
      sessionId,
      questionId: input.questionId ?? null,
      content: input.content,
      displayOrder: input.displayOrder,
    })
    .returning({ id: sessionQuestions.id });

  return result.id;
}

export async function recordAnswer(
  sessionQuestionId: string,
  userId: string,
  content: string
): Promise<string> {
  const db = getDb();

  const [result] = await db
    .insert(sessionAnswers)
    .values({
      sessionQuestionId,
      userId,
      content,
    })
    .returning({ id: sessionAnswers.id });

  return result.id;
}

export async function recordFeedback(
  sessionQuestionId: string,
  userId: string,
  content: string | null,
  score: number | null
): Promise<string> {
  const db = getDb();

  const [result] = await db
    .insert(sessionFeedbacks)
    .values({
      sessionQuestionId,
      userId,
      content,
      score,
    })
    .returning({ id: sessionFeedbacks.id });

  return result.id;
}

export async function getSessionRecords(sessionId: string): Promise<SessionQuestionRecord[]> {
  const db = getDb();

  // Fetch questions
  const questions = await db
    .select({
      id: sessionQuestions.id,
      sessionId: sessionQuestions.sessionId,
      questionId: sessionQuestions.questionId,
      content: sessionQuestions.content,
      displayOrder: sessionQuestions.displayOrder,
      askedAt: sessionQuestions.askedAt,
    })
    .from(sessionQuestions)
    .where(eq(sessionQuestions.sessionId, sessionId))
    .orderBy(asc(sessionQuestions.displayOrder));

  if (questions.length === 0) return [];

  const questionIds = questions.map((q) => q.id);

  // Batch fetch answers and feedbacks using IN clause
  const allAnswers = await db
    .select({
      sessionQuestionId: sessionAnswers.sessionQuestionId,
      userId: sessionAnswers.userId,
      content: sessionAnswers.content,
      answeredAt: sessionAnswers.answeredAt,
    })
    .from(sessionAnswers)
    .where(inArray(sessionAnswers.sessionQuestionId, questionIds));

  const allFeedbacks = await db
    .select({
      sessionQuestionId: sessionFeedbacks.sessionQuestionId,
      userId: sessionFeedbacks.userId,
      content: sessionFeedbacks.content,
      score: sessionFeedbacks.score,
      createdAt: sessionFeedbacks.createdAt,
    })
    .from(sessionFeedbacks)
    .where(inArray(sessionFeedbacks.sessionQuestionId, questionIds));

  // Group by sessionQuestionId
  const answerMap = new Map<string, { userId: string; content: string; answeredAt: Date }>();
  for (const a of allAnswers) {
    answerMap.set(a.sessionQuestionId, {
      userId: a.userId,
      content: a.content,
      answeredAt: a.answeredAt,
    });
  }

  const feedbackMap = new Map<
    string,
    Array<{ userId: string; content: string | null; score: number | null; createdAt: Date }>
  >();
  for (const f of allFeedbacks) {
    const existing = feedbackMap.get(f.sessionQuestionId) ?? [];
    existing.push({
      userId: f.userId,
      content: f.content,
      score: f.score,
      createdAt: f.createdAt,
    });
    feedbackMap.set(f.sessionQuestionId, existing);
  }

  return questions.map((q) => ({
    ...q,
    answer: answerMap.get(q.id) ?? null,
    feedbacks: feedbackMap.get(q.id) ?? [],
  }));
}

export async function getSessionQuestionByDisplayOrder(
  sessionId: string,
  displayOrder: number
): Promise<{ id: string } | null> {
  const db = getDb();

  const [row] = await db
    .select({ id: sessionQuestions.id })
    .from(sessionQuestions)
    .where(
      and(
        eq(sessionQuestions.sessionId, sessionId),
        eq(sessionQuestions.displayOrder, displayOrder)
      )
    );

  return row ?? null;
}
