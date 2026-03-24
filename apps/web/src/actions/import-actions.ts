'use server';

import { revalidatePath } from 'next/cache';
import { importQuestionsToJob } from '@/data-access/import';
import { getCurrentUserId } from '@/lib/auth';

export async function importQuestionsAction(params: { jdId: string; questionIds: string[] }) {
  const userId = await getCurrentUserId();
  const result = await importQuestionsToJob(userId, params);
  revalidatePath(`/interviews/jobs/${params.jdId}`);
  revalidatePath('/study');
  return result;
}
