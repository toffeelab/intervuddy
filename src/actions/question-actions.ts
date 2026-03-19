'use server';

import { revalidatePath } from 'next/cache';
import {
  createQuestion as dbCreate,
  updateQuestion as dbUpdate,
  softDeleteQuestion as dbDelete,
  restoreQuestion as dbRestore,
} from '@/data-access/questions';
import type { CreateQuestionInput, UpdateQuestionInput } from '@/data-access/types';

export async function createQuestionAction(input: CreateQuestionInput) {
  const id = await dbCreate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateQuestionAction(input: UpdateQuestionInput) {
  await dbUpdate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteQuestionAction(id: number) {
  await dbDelete(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreQuestionAction(id: number) {
  await dbRestore(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}
