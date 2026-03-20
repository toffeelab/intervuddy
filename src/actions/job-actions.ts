'use server';

import { revalidatePath } from 'next/cache';
import {
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJobWithQuestions,
  restoreJobWithQuestions,
} from '@/data-access/jobs';
import type { CreateJobInput, UpdateJobInput, JobDescriptionStatus } from '@/data-access/types';

export async function createJobAction(input: CreateJobInput) {
  const id = await createJob(input);
  revalidatePath('/interviews');
  return { id };
}

export async function updateJobAction(input: UpdateJobInput) {
  await updateJob(input);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${input.id}`);
}

export async function updateJobStatusAction(id: number, status: JobDescriptionStatus) {
  await updateJobStatus(id, status);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${id}`);
}

export async function deleteJobAction(id: number) {
  await softDeleteJobWithQuestions(id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
}

export async function restoreJobAction(id: number) {
  await restoreJobWithQuestions(id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
  revalidatePath(`/interviews/jobs/${id}`);
}
