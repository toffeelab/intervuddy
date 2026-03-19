'use server';

import { revalidatePath } from 'next/cache';
import {
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
} from '@/data-access/categories';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/data-access/types';

export async function createCategoryAction(input: CreateCategoryInput) {
  const id = await createCategory(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateCategoryAction(id: number, input: Omit<UpdateCategoryInput, 'id'>) {
  await updateCategory(id, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteCategoryAction(id: number) {
  await softDeleteCategory(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}

export async function restoreCategoryAction(id: number) {
  await restoreCategory(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  revalidatePath('/interviews/trash');
}
