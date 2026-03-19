'use server';

import { revalidatePath } from 'next/cache';
import { importQuestionsToJob } from '@/data-access/import';

export async function importQuestionsAction(params: { jdId: number; questionIds: number[] }) {
  const result = await importQuestionsToJob(params);
  revalidatePath(`/interviews/jobs/${params.jdId}`);
  revalidatePath('/study');
  return result;
}
