'use server';

import { revalidatePath } from 'next/cache';
import type { CreateJobInput, UpdateJobInput, JobDescriptionStatus } from '@intervuddy/shared';
import {
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJobWithQuestions,
  restoreJobWithQuestions,
} from '@/data-access/jobs';
import { getCurrentUserId } from '@/lib/auth';

export async function createJobAction(input: CreateJobInput) {
  const userId = await getCurrentUserId();
  const id = await createJob(userId, input);
  revalidatePath('/interviews');
  return { id };
}

export async function updateJobAction(input: UpdateJobInput) {
  const userId = await getCurrentUserId();
  await updateJob(userId, input);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${input.id}`);
}

export async function updateJobStatusAction(id: string, status: JobDescriptionStatus) {
  const userId = await getCurrentUserId();
  await updateJobStatus(userId, id, status);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${id}`);
}

export async function deleteJobAction(id: string) {
  const userId = await getCurrentUserId();
  await softDeleteJobWithQuestions(userId, id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
}

export async function restoreJobAction(id: string) {
  const userId = await getCurrentUserId();
  await restoreJobWithQuestions(userId, id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
  revalidatePath(`/interviews/jobs/${id}`);
}
