'use server';

import { revalidatePath } from 'next/cache';
import {
  createFollowup as dbCreate,
  updateFollowup as dbUpdate,
  softDeleteFollowup as dbDelete,
  restoreFollowup as dbRestore,
} from '@/data-access/followups';
import type { CreateFollowupInput, UpdateFollowupInput } from '@/data-access/types';

export async function createFollowupAction(input: CreateFollowupInput) {
  const id = dbCreate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateFollowupAction(input: UpdateFollowupInput) {
  dbUpdate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteFollowupAction(id: number) {
  dbDelete(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreFollowupAction(id: number) {
  dbRestore(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}
