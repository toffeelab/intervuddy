'use server';

import { revalidatePath } from 'next/cache';
import {
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJob,
} from '@/data-access/jobs';
import type { CreateJobInput, UpdateJobInput, JobDescriptionStatus } from '@/data-access/types';

export async function createJobAction(input: CreateJobInput) {
  const id = createJob(input);
  revalidatePath('/interviews');
  return { id };
}

export async function updateJobAction(input: UpdateJobInput) {
  updateJob(input);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${input.id}`);
}

export async function updateJobStatusAction(id: number, status: JobDescriptionStatus) {
  updateJobStatus(id, status);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${id}`);
}

export async function deleteJobAction(id: number) {
  softDeleteJob(id);
  revalidatePath('/interviews');
}
