'use server';

import { revalidatePath } from 'next/cache';
import {
  createQuestion as dbCreate,
  updateQuestion as dbUpdate,
  softDeleteQuestion as dbDelete,
  restoreQuestion as dbRestore,
  updateQuestionKeywords as dbUpdateKeywords,
} from '@/data-access/questions';
import type { CreateQuestionInput, UpdateQuestionInput } from '@/data-access/types';

export async function createQuestionAction(input: CreateQuestionInput) {
  const id = dbCreate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateQuestionAction(input: UpdateQuestionInput) {
  dbUpdate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteQuestionAction(id: number) {
  dbDelete(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreQuestionAction(id: number) {
  dbRestore(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function updateQuestionKeywordsAction(questionId: number, keywords: string[]) {
  dbUpdateKeywords(questionId, keywords);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}
