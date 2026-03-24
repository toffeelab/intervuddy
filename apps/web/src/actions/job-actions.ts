'use server';

import { revalidatePath } from 'next/cache';
import {
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJobWithQuestions,
  restoreJobWithQuestions,
} from '@intervuddy/database';
import type { CreateJobInput, UpdateJobInput, JobDescriptionStatus } from '@intervuddy/shared';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

export async function createJobAction(input: CreateJobInput) {
  const userId = await getCurrentUserId();
  const id = await createJob(getDb(), userId, input);
  revalidatePath('/interviews');
  return { id };
}

export async function updateJobAction(input: UpdateJobInput) {
  const userId = await getCurrentUserId();
  await updateJob(getDb(), userId, input);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${input.id}`);
}

export async function updateJobStatusAction(id: string, status: JobDescriptionStatus) {
  const userId = await getCurrentUserId();
  await updateJobStatus(getDb(), userId, id, status);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${id}`);
}

export async function deleteJobAction(id: string) {
  const userId = await getCurrentUserId();
  await softDeleteJobWithQuestions(getDb(), userId, id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
}

export async function restoreJobAction(id: string) {
  const userId = await getCurrentUserId();
  await restoreJobWithQuestions(getDb(), userId, id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
  revalidatePath(`/interviews/jobs/${id}`);
}
