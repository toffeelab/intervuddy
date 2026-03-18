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
  const id = createCategory(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateCategoryAction(
  id: number,
  input: Omit<UpdateCategoryInput, 'id'>
) {
  updateCategory(id, input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteCategoryAction(id: number) {
  softDeleteCategory(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function restoreCategoryAction(id: number) {
  restoreCategory(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}
