import type { InterviewSession, SessionStatus, CreateSessionInput } from '@intervuddy/shared';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import type { Database, DbOrTx } from '../connection';
import { interviewSessions, sessionParticipants } from '../schema';

export async function createSession(
  db: Database,
  userId: string,
  input: CreateSessionInput
): Promise<string> {
  return await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(interviewSessions)
      .values({
        title: input.title,
        status: 'waiting',
        createdBy: userId,
        qaOwnerId: input.qaOwnerId ?? null,
        jdId: input.jdId ?? null,
        categoryId: input.categoryId ?? null,
      })
      .returning({ id: interviewSessions.id });

    await tx.insert(sessionParticipants).values({
      sessionId: session.id,
      userId,
      role: input.role,
    });

    return session.id;
  });
}

export async function getSessionById(
  db: DbOrTx,
  userId: string,
  sessionId: string
): Promise<InterviewSession | null> {
  const rows = await db
    .select({
      id: interviewSessions.id,
      title: interviewSessions.title,
      status: interviewSessions.status,
      createdBy: interviewSessions.createdBy,
      qaOwnerId: interviewSessions.qaOwnerId,
      jdId: interviewSessions.jdId,
      categoryId: interviewSessions.categoryId,
      summary: interviewSessions.summary,
      startedAt: interviewSessions.startedAt,
      endedAt: interviewSessions.endedAt,
      deletedAt: interviewSessions.deletedAt,
      createdAt: interviewSessions.createdAt,
      updatedAt: interviewSessions.updatedAt,
    })
    .from(interviewSessions)
    .innerJoin(
      sessionParticipants,
      and(
        eq(sessionParticipants.sessionId, interviewSessions.id),
        eq(sessionParticipants.userId, userId)
      )
    )
    .where(and(eq(interviewSessions.id, sessionId), isNull(interviewSessions.deletedAt)));

  const row = rows[0];
  if (!row) return null;
  return { ...row, status: row.status as SessionStatus };
}

export async function getSessionsByUserId(db: DbOrTx, userId: string): Promise<InterviewSession[]> {
  const rows = await db
    .select({
      id: interviewSessions.id,
      title: interviewSessions.title,
      status: interviewSessions.status,
      createdBy: interviewSessions.createdBy,
      qaOwnerId: interviewSessions.qaOwnerId,
      jdId: interviewSessions.jdId,
      categoryId: interviewSessions.categoryId,
      summary: interviewSessions.summary,
      startedAt: interviewSessions.startedAt,
      endedAt: interviewSessions.endedAt,
      deletedAt: interviewSessions.deletedAt,
      createdAt: interviewSessions.createdAt,
      updatedAt: interviewSessions.updatedAt,
    })
    .from(interviewSessions)
    .innerJoin(
      sessionParticipants,
      and(
        eq(sessionParticipants.sessionId, interviewSessions.id),
        eq(sessionParticipants.userId, userId)
      )
    )
    .where(isNull(interviewSessions.deletedAt))
    .orderBy(desc(interviewSessions.createdAt));

  return rows.map((row) => ({ ...row, status: row.status as SessionStatus }));
}

export async function updateSessionStatus(
  db: DbOrTx,
  userId: string,
  sessionId: string,
  status: SessionStatus,
  options?: { summary?: string }
): Promise<void> {
  const updates: Record<string, unknown> = { status };

  if (status === 'in_progress') {
    updates.startedAt = sql`NOW()`;
  } else if (status === 'completed') {
    updates.endedAt = sql`NOW()`;
    if (options?.summary) {
      updates.summary = options.summary;
    }
  }

  await db
    .update(interviewSessions)
    .set(updates)
    .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.createdBy, userId)));
}

export async function deleteSession(db: DbOrTx, userId: string, sessionId: string): Promise<void> {
  await db
    .update(interviewSessions)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.createdBy, userId)));
}
