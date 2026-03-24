'use server';

import { revalidatePath } from 'next/cache';
import {
  createFollowup as dbCreate,
  updateFollowup as dbUpdate,
  softDeleteFollowup as dbDelete,
  restoreFollowup as dbRestore,
} from '@/data-access/followups';
import type { CreateFollowupInput, UpdateFollowupInput } from '@/data-access/types';
import { getCurrentUserId } from '@/lib/auth';

export async function createFollowupAction(input: CreateFollowupInput) {
  const userId = await getCurrentUserId();
  const id = await dbCreate(userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateFollowupAction(input: UpdateFollowupInput) {
  const userId = await getCurrentUserId();
  await dbUpdate(userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteFollowupAction(id: string) {
  const userId = await getCurrentUserId();
  await dbDelete(userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreFollowupAction(id: string) {
  const userId = await getCurrentUserId();
  await dbRestore(userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}
