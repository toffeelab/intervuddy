'use server';

import { revalidatePath } from 'next/cache';
import {
  createInvitation as dbCreateInvitation,
  acceptInvitation as dbAcceptInvitation,
} from '@/data-access/session-invitations';
import {
  createSession as dbCreateSession,
  deleteSession as dbDeleteSession,
} from '@/data-access/sessions';
import type { CreateSessionInput, SessionRole } from '@/data-access/types';
import { getCurrentUserId } from '@/lib/auth';

export async function createSessionAction(input: CreateSessionInput) {
  const userId = await getCurrentUserId();
  const id = await dbCreateSession(userId, input);
  revalidatePath('/interviews/sessions');
  return { id };
}

export async function deleteSessionAction(sessionId: string) {
  const userId = await getCurrentUserId();
  await dbDeleteSession(userId, sessionId);
  revalidatePath('/interviews/sessions');
}

export async function createInvitationAction(sessionId: string, role: SessionRole) {
  const userId = await getCurrentUserId();
  const result = await dbCreateInvitation(userId, sessionId, role);
  return { inviteCode: result.inviteCode };
}

export async function acceptInvitationAction(code: string) {
  const userId = await getCurrentUserId();
  const result = await dbAcceptInvitation(code, userId);
  revalidatePath('/interviews/sessions');
  return { sessionId: result.sessionId };
}
