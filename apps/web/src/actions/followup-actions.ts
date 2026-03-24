'use server';

import { revalidatePath } from 'next/cache';
import {
  createFollowup as dbCreate,
  updateFollowup as dbUpdate,
  softDeleteFollowup as dbDelete,
  restoreFollowup as dbRestore,
} from '@intervuddy/database';
import type { CreateFollowupInput, UpdateFollowupInput } from '@intervuddy/shared';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

export async function createFollowupAction(input: CreateFollowupInput) {
  const userId = await getCurrentUserId();
  const id = await dbCreate(getDb(), userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateFollowupAction(input: UpdateFollowupInput) {
  const userId = await getCurrentUserId();
  await dbUpdate(getDb(), userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteFollowupAction(id: string) {
  const userId = await getCurrentUserId();
  await dbDelete(getDb(), userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreFollowupAction(id: string) {
  const userId = await getCurrentUserId();
  await dbRestore(getDb(), userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}
