'use server';

import { revalidatePath } from 'next/cache';
import {
  createInvitation as dbCreateInvitation,
  acceptInvitation as dbAcceptInvitation,
  createSession as dbCreateSession,
  deleteSession as dbDeleteSession,
} from '@intervuddy/database';
import type { CreateSessionInput, SessionRole } from '@intervuddy/shared';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

export async function createSessionAction(input: CreateSessionInput) {
  const userId = await getCurrentUserId();
  const id = await dbCreateSession(getDb(), userId, input);
  revalidatePath('/interviews/sessions');
  return { id };
}

export async function deleteSessionAction(sessionId: string) {
  const userId = await getCurrentUserId();
  await dbDeleteSession(getDb(), userId, sessionId);
  revalidatePath('/interviews/sessions');
}

export async function createInvitationAction(sessionId: string, role: SessionRole) {
  const userId = await getCurrentUserId();
  const result = await dbCreateInvitation(getDb(), userId, sessionId, role);
  return { inviteCode: result.inviteCode };
}

export async function acceptInvitationAction(code: string) {
  const userId = await getCurrentUserId();
  const result = await dbAcceptInvitation(getDb(), code, userId);
  revalidatePath('/interviews/sessions');
  return { sessionId: result.sessionId };
}
