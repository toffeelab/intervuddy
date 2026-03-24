import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db/index';
import { interviewSessions, sessionParticipants, users } from '@/db/schema';
import type { SessionRole, SessionParticipantInfo } from './types';

export async function addParticipant(
  callerUserId: string,
  sessionId: string,
  userId: string,
  role: SessionRole
): Promise<string> {
  const db = getDb();

  // Check caller is creator
  const [session] = await db
    .select({ createdBy: interviewSessions.createdBy })
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId));

  if (!session || session.createdBy !== callerUserId) {
    throw new Error('세션 생성자만 참가자를 추가할 수 있습니다');
  }

  // Check role constraints (max 1 interviewer, max 1 interviewee)
  if (role === 'interviewer' || role === 'interviewee') {
    const existing = await db
      .select({ id: sessionParticipants.id })
      .from(sessionParticipants)
      .where(and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.role, role)));

    if (existing.length > 0) {
      throw new Error(`이미 ${role}이(가) 존재합니다`);
    }
  }

  // Check duplicate user
  const existingUser = await db
    .select({ id: sessionParticipants.id })
    .from(sessionParticipants)
    .where(
      and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.userId, userId))
    );

  if (existingUser.length > 0) {
    throw new Error('이미 참가 중인 유저입니다');
  }

  const [result] = await db
    .insert(sessionParticipants)
    .values({ sessionId, userId, role })
    .returning({ id: sessionParticipants.id });

  return result.id;
}

export async function removeParticipant(
  callerUserId: string,
  sessionId: string,
  userId: string
): Promise<void> {
  const db = getDb();

  // Check caller is creator
  const [session] = await db
    .select({ createdBy: interviewSessions.createdBy })
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId));

  if (!session || session.createdBy !== callerUserId) {
    throw new Error('세션 생성자만 참가자를 제거할 수 있습니다');
  }

  await db
    .delete(sessionParticipants)
    .where(
      and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.userId, userId))
    );
}

export async function getParticipants(
  callerUserId: string,
  sessionId: string
): Promise<SessionParticipantInfo[]> {
  const db = getDb();

  // Verify caller is a participant
  const [callerParticipant] = await db
    .select({ id: sessionParticipants.id })
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.userId, callerUserId)
      )
    );

  if (!callerParticipant) {
    return [];
  }

  const rows = await db
    .select({
      id: sessionParticipants.id,
      sessionId: sessionParticipants.sessionId,
      userId: sessionParticipants.userId,
      role: sessionParticipants.role,
      displayName: users.name,
      joinedAt: sessionParticipants.joinedAt,
    })
    .from(sessionParticipants)
    .innerJoin(users, eq(users.id, sessionParticipants.userId))
    .where(eq(sessionParticipants.sessionId, sessionId));

  return rows.map((row) => ({
    ...row,
    role: row.role as SessionRole,
  }));
}

export async function getParticipantRole(
  sessionId: string,
  userId: string
): Promise<SessionRole | null> {
  const db = getDb();

  const [row] = await db
    .select({ role: sessionParticipants.role })
    .from(sessionParticipants)
    .where(
      and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.userId, userId))
    );

  if (!row) return null;
  return row.role as SessionRole;
}
