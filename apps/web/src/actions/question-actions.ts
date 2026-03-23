'use server';

import { revalidatePath } from 'next/cache';
import {
  createQuestion as dbCreate,
  updateQuestion as dbUpdate,
  updateQuestionKeywords as dbUpdateKeywords,
  softDeleteQuestion as dbDelete,
  restoreQuestion as dbRestore,
} from '@intervuddy/database';
import type { CreateQuestionInput, UpdateQuestionInput } from '@intervuddy/shared';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

export async function createQuestionAction(input: CreateQuestionInput) {
  const userId = await getCurrentUserId();
  const id = await dbCreate(getDb(), userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateQuestionAction(input: UpdateQuestionInput) {
  const userId = await getCurrentUserId();
  await dbUpdate(getDb(), userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteQuestionAction(id: string) {
  const userId = await getCurrentUserId();
  await dbDelete(getDb(), userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreQuestionAction(id: string) {
  const userId = await getCurrentUserId();
  await dbRestore(getDb(), userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function updateQuestionKeywordsAction(id: string, keywords: string[]) {
  const userId = await getCurrentUserId();
  await dbUpdateKeywords(getDb(), userId, id, keywords);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}
