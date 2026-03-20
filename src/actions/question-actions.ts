'use server';

import { revalidatePath } from 'next/cache';
import {
  createQuestion as dbCreate,
  updateQuestion as dbUpdate,
  updateQuestionKeywords as dbUpdateKeywords,
  softDeleteQuestion as dbDelete,
  restoreQuestion as dbRestore,
} from '@/data-access/questions';
import type { CreateQuestionInput, UpdateQuestionInput } from '@/data-access/types';
import { getCurrentUserId } from '@/lib/auth';

export async function createQuestionAction(input: CreateQuestionInput) {
  const userId = await getCurrentUserId();
  const id = await dbCreate(userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateQuestionAction(input: UpdateQuestionInput) {
  const userId = await getCurrentUserId();
  await dbUpdate(userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteQuestionAction(id: string) {
  const userId = await getCurrentUserId();
  await dbDelete(userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreQuestionAction(id: string) {
  const userId = await getCurrentUserId();
  await dbRestore(userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function updateQuestionKeywordsAction(id: string, keywords: string[]) {
  const userId = await getCurrentUserId();
  await dbUpdateKeywords(userId, id, keywords);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}
