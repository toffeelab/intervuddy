import { eq, and, isNull, isNotNull, sql, desc, count } from 'drizzle-orm';
import { DEFAULT_USER_ID } from '@/db/constants';
import { getDb } from '@/db/index';
import { jobDescriptions, interviewQuestions } from '@/db/schema';
import type { JobDescription, JobDescriptionStatus, CreateJobInput, UpdateJobInput } from './types';

export async function getAllJobs(): Promise<JobDescription[]> {
  const questionCountSq = getDb()
    .select({ count: count() })
    .from(interviewQuestions)
    .where(
      and(eq(interviewQuestions.jdId, jobDescriptions.id), isNull(interviewQuestions.deletedAt))
    );

  const rows = await getDb()
    .select({
      id: jobDescriptions.id,
      companyName: jobDescriptions.companyName,
      positionTitle: jobDescriptions.positionTitle,
      status: jobDescriptions.status,
      memo: jobDescriptions.memo,
      questionCount: sql<number>`(${questionCountSq})`,
      deletedAt: jobDescriptions.deletedAt,
      createdAt: jobDescriptions.createdAt,
      updatedAt: jobDescriptions.updatedAt,
    })
    .from(jobDescriptions)
    .where(and(eq(jobDescriptions.userId, DEFAULT_USER_ID), isNull(jobDescriptions.deletedAt)))
    .orderBy(desc(jobDescriptions.createdAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as JobDescriptionStatus,
  }));
}

export async function getJobById(id: number): Promise<JobDescription | null> {
  const questionCountSq = getDb()
    .select({ count: count() })
    .from(interviewQuestions)
    .where(
      and(eq(interviewQuestions.jdId, jobDescriptions.id), isNull(interviewQuestions.deletedAt))
    );

  const rows = await getDb()
    .select({
      id: jobDescriptions.id,
      companyName: jobDescriptions.companyName,
      positionTitle: jobDescriptions.positionTitle,
      status: jobDescriptions.status,
      memo: jobDescriptions.memo,
      questionCount: sql<number>`(${questionCountSq})`,
      deletedAt: jobDescriptions.deletedAt,
      createdAt: jobDescriptions.createdAt,
      updatedAt: jobDescriptions.updatedAt,
    })
    .from(jobDescriptions)
    .where(
      and(
        eq(jobDescriptions.userId, DEFAULT_USER_ID),
        eq(jobDescriptions.id, id),
        isNull(jobDescriptions.deletedAt)
      )
    );

  const row = rows[0];
  if (!row) return null;
  return { ...row, status: row.status as JobDescriptionStatus };
}

export async function createJob(input: CreateJobInput): Promise<number> {
  const [result] = await getDb()
    .insert(jobDescriptions)
    .values({
      userId: DEFAULT_USER_ID,
      companyName: input.companyName,
      positionTitle: input.positionTitle,
      memo: input.memo ?? null,
    })
    .returning({ id: jobDescriptions.id });

  return result.id;
}

export async function updateJob(input: UpdateJobInput): Promise<void> {
  const updates: Partial<typeof jobDescriptions.$inferInsert> = {};

  if (input.companyName !== undefined) updates.companyName = input.companyName;
  if (input.positionTitle !== undefined) updates.positionTitle = input.positionTitle;
  if (input.status !== undefined) updates.status = input.status;
  if (input.memo !== undefined) updates.memo = input.memo;

  if (Object.keys(updates).length === 0) return;

  await getDb().update(jobDescriptions).set(updates).where(eq(jobDescriptions.id, input.id));
}

export async function updateJobStatus(id: number, status: JobDescriptionStatus): Promise<void> {
  await getDb().update(jobDescriptions).set({ status }).where(eq(jobDescriptions.id, id));
}

export async function softDeleteJob(id: number): Promise<void> {
  await getDb()
    .update(jobDescriptions)
    .set({ deletedAt: sql`NOW()` })
    .where(eq(jobDescriptions.id, id));
}

export async function restoreJob(id: number): Promise<void> {
  await getDb().update(jobDescriptions).set({ deletedAt: null }).where(eq(jobDescriptions.id, id));
}

export async function softDeleteJobWithQuestions(id: number): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(jobDescriptions)
      .set({ deletedAt: sql`NOW()` })
      .where(eq(jobDescriptions.id, id));
    await tx
      .update(interviewQuestions)
      .set({ deletedAt: sql`NOW()` })
      .where(and(eq(interviewQuestions.jdId, id), isNull(interviewQuestions.deletedAt)));
  });
}

export async function restoreJobWithQuestions(id: number): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.update(jobDescriptions).set({ deletedAt: null }).where(eq(jobDescriptions.id, id));
    await tx
      .update(interviewQuestions)
      .set({ deletedAt: null })
      .where(and(eq(interviewQuestions.jdId, id), isNotNull(interviewQuestions.deletedAt)));
  });
}

export async function getDeletedJobs(): Promise<JobDescription[]> {
  const questionCountSq = getDb()
    .select({ count: count() })
    .from(interviewQuestions)
    .where(
      and(eq(interviewQuestions.jdId, jobDescriptions.id), isNull(interviewQuestions.deletedAt))
    );

  const rows = await getDb()
    .select({
      id: jobDescriptions.id,
      companyName: jobDescriptions.companyName,
      positionTitle: jobDescriptions.positionTitle,
      status: jobDescriptions.status,
      memo: jobDescriptions.memo,
      questionCount: sql<number>`(${questionCountSq})`,
      deletedAt: jobDescriptions.deletedAt,
      createdAt: jobDescriptions.createdAt,
      updatedAt: jobDescriptions.updatedAt,
    })
    .from(jobDescriptions)
    .where(and(eq(jobDescriptions.userId, DEFAULT_USER_ID), isNotNull(jobDescriptions.deletedAt)))
    .orderBy(desc(jobDescriptions.deletedAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as JobDescriptionStatus,
  }));
}
