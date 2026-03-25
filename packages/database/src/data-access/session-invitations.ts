import type { SessionRole, InvitationStatus } from '@intervuddy/shared';
import { eq, and, sql } from 'drizzle-orm';
import type { Database, DbOrTx } from '../connection';
import { sessionInvitations, sessionParticipants, interviewSessions } from '../schema';

interface InvitationData {
  id: string;
  sessionId: string;
  invitedBy: string;
  role: string;
  inviteCode: string;
  status: string;
  maxUses: number;
  usedCount: number;
  expiresAt: Date;
  createdAt: Date;
}

export async function createInvitation(
  db: DbOrTx,
  userId: string,
  sessionId: string,
  role: SessionRole,
  options?: { maxUses?: number; expiresInMs?: number }
): Promise<{ id: string; inviteCode: string }> {
  const inviteCode = crypto.randomUUID().slice(0, 8);
  const maxUses = options?.maxUses ?? 1;
  const expiresInMs = options?.expiresInMs ?? 24 * 60 * 60 * 1000;

  const expiresAt = new Date(Date.now() + expiresInMs);

  const [result] = await db
    .insert(sessionInvitations)
    .values({
      sessionId,
      invitedBy: userId,
      role,
      inviteCode,
      maxUses,
      expiresAt,
    })
    .returning({ id: sessionInvitations.id });

  return { id: result.id, inviteCode };
}

export async function getInvitationByCode(
  db: DbOrTx,
  code: string
): Promise<InvitationData | null> {
  const [row] = await db
    .select({
      id: sessionInvitations.id,
      sessionId: sessionInvitations.sessionId,
      invitedBy: sessionInvitations.invitedBy,
      role: sessionInvitations.role,
      inviteCode: sessionInvitations.inviteCode,
      status: sessionInvitations.status,
      maxUses: sessionInvitations.maxUses,
      usedCount: sessionInvitations.usedCount,
      expiresAt: sessionInvitations.expiresAt,
      createdAt: sessionInvitations.createdAt,
    })
    .from(sessionInvitations)
    .where(eq(sessionInvitations.inviteCode, code));

  if (!row) return null;
  return row;
}

export async function acceptInvitation(
  db: Database,
  code: string,
  userId: string
): Promise<{ sessionId: string; role: SessionRole }> {
  const invitation = await getInvitationByCode(db, code);
  if (!invitation) {
    throw new Error('초대를 찾을 수 없습니다');
  }

  if (invitation.status !== 'pending') {
    throw new Error('유효하지 않은 초대입니다');
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('만료된 초대입니다');
  }

  if (invitation.usedCount >= invitation.maxUses) {
    throw new Error('최대 사용 횟수를 초과했습니다');
  }

  const role = invitation.role as SessionRole;

  // Check role constraints for interviewer/interviewee
  if (role === 'interviewer' || role === 'interviewee') {
    const existing = await db
      .select({ id: sessionParticipants.id })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, invitation.sessionId),
          eq(sessionParticipants.role, role)
        )
      );

    if (existing.length > 0) {
      throw new Error(`이미 ${role}이(가) 존재합니다`);
    }
  }

  // Add participant and update invitation in a transaction
  await db.transaction(async (tx) => {
    await tx.insert(sessionParticipants).values({
      sessionId: invitation.sessionId,
      userId,
      role,
    });

    const newUsedCount = invitation.usedCount + 1;
    const newStatus: InvitationStatus = newUsedCount >= invitation.maxUses ? 'accepted' : 'pending';

    await tx
      .update(sessionInvitations)
      .set({
        usedCount: sql`${sessionInvitations.usedCount} + 1`,
        status: newStatus,
      })
      .where(eq(sessionInvitations.id, invitation.id));
  });

  return { sessionId: invitation.sessionId, role };
}

export async function revokeInvitation(
  db: DbOrTx,
  userId: string,
  invitationId: string
): Promise<void> {
  const [invitation] = await db
    .select({ invitedBy: sessionInvitations.invitedBy })
    .from(sessionInvitations)
    .where(eq(sessionInvitations.id, invitationId));

  if (!invitation || invitation.invitedBy !== userId) {
    throw new Error('초대자만 초대를 취소할 수 있습니다');
  }

  await db
    .update(sessionInvitations)
    .set({ status: 'revoked' })
    .where(eq(sessionInvitations.id, invitationId));
}
