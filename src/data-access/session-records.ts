import { eq, and, asc } from 'drizzle-orm';
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

  const records: SessionQuestionRecord[] = [];

  for (const q of questions) {
    const answers = await db
      .select({
        userId: sessionAnswers.userId,
        content: sessionAnswers.content,
        answeredAt: sessionAnswers.answeredAt,
      })
      .from(sessionAnswers)
      .where(eq(sessionAnswers.sessionQuestionId, q.id));

    const feedbacks = await db
      .select({
        userId: sessionFeedbacks.userId,
        content: sessionFeedbacks.content,
        score: sessionFeedbacks.score,
        createdAt: sessionFeedbacks.createdAt,
      })
      .from(sessionFeedbacks)
      .where(eq(sessionFeedbacks.sessionQuestionId, q.id));

    records.push({
      ...q,
      answer: answers[0] ?? null,
      feedbacks,
    });
  }

  return records;
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
