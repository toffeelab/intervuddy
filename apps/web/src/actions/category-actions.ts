'use server';

import { revalidatePath } from 'next/cache';
import type { CreateCategoryInput, UpdateCategoryInput } from '@intervuddy/shared';
import {
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
} from '@/data-access/categories';
import { getCurrentUserId } from '@/lib/auth';

export async function createCategoryAction(input: CreateCategoryInput) {
  const userId = await getCurrentUserId();
  const id = await createCategory(userId, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateCategoryAction(id: number, input: Omit<UpdateCategoryInput, 'id'>) {
  const userId = await getCurrentUserId();
  await updateCategory(userId, id, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteCategoryAction(id: number) {
  const userId = await getCurrentUserId();
  await softDeleteCategory(userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreCategoryAction(id: number) {
  const userId = await getCurrentUserId();
  await restoreCategory(userId, id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}
