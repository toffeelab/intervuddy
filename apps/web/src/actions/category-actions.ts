'use server';

import { revalidatePath } from 'next/cache';
import {
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
} from '@intervuddy/database';
import type { CreateCategoryInput, UpdateCategoryInput } from '@intervuddy/shared';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

export async function createCategoryAction(input: CreateCategoryInput) {
  const userId = await getCurrentUserId();
  const id = await createCategory(getDb(), userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateCategoryAction(id: number, input: Omit<UpdateCategoryInput, 'id'>) {
  const userId = await getCurrentUserId();
  await updateCategory(getDb(), userId, id, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteCategoryAction(id: number) {
  const userId = await getCurrentUserId();
  await softDeleteCategory(getDb(), userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreCategoryAction(id: number) {
  const userId = await getCurrentUserId();
  await restoreCategory(getDb(), userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}
