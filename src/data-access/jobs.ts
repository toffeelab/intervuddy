import { eq, and, isNull, isNotNull, sql, desc, count } from 'drizzle-orm';
import { getDb } from '@/db/index';
import { jobDescriptions, interviewQuestions } from '@/db/schema';
import type { JobDescription, JobDescriptionStatus, CreateJobInput, UpdateJobInput } from './types';

export async function getAllJobs(userId: string): Promise<JobDescription[]> {
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
      questionCount: sql<number>`(${questionCountSq})::int`,
      deletedAt: jobDescriptions.deletedAt,
      createdAt: jobDescriptions.createdAt,
      updatedAt: jobDescriptions.updatedAt,
    })
    .from(jobDescriptions)
    .where(and(eq(jobDescriptions.userId, userId), isNull(jobDescriptions.deletedAt)))
    .orderBy(desc(jobDescriptions.createdAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as JobDescriptionStatus,
  }));
}

export async function getJobById(userId: string, id: number): Promise<JobDescription | null> {
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
      questionCount: sql<number>`(${questionCountSq})::int`,
      deletedAt: jobDescriptions.deletedAt,
      createdAt: jobDescriptions.createdAt,
      updatedAt: jobDescriptions.updatedAt,
    })
    .from(jobDescriptions)
    .where(
      and(
        eq(jobDescriptions.userId, userId),
        eq(jobDescriptions.id, id),
        isNull(jobDescriptions.deletedAt)
      )
    );

  const row = rows[0];
  if (!row) return null;
  return { ...row, status: row.status as JobDescriptionStatus };
}

export async function createJob(userId: string, input: CreateJobInput): Promise<number> {
  const [result] = await getDb()
    .insert(jobDescriptions)
    .values({
      userId,
      companyName: input.companyName,
      positionTitle: input.positionTitle,
      memo: input.memo ?? null,
    })
    .returning({ id: jobDescriptions.id });

  return result.id;
}

export async function updateJob(userId: string, input: UpdateJobInput): Promise<void> {
  const updates: Partial<typeof jobDescriptions.$inferInsert> = {};

  if (input.companyName !== undefined) updates.companyName = input.companyName;
  if (input.positionTitle !== undefined) updates.positionTitle = input.positionTitle;
  if (input.status !== undefined) updates.status = input.status;
  if (input.memo !== undefined) updates.memo = input.memo;

  if (Object.keys(updates).length === 0) return;

  await getDb()
    .update(jobDescriptions)
    .set(updates)
    .where(and(eq(jobDescriptions.id, input.id), eq(jobDescriptions.userId, userId)));
}

export async function updateJobStatus(
  userId: string,
  id: number,
  status: JobDescriptionStatus
): Promise<void> {
  await getDb()
    .update(jobDescriptions)
    .set({ status })
    .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
}

export async function softDeleteJob(userId: string, id: number): Promise<void> {
  await getDb()
    .update(jobDescriptions)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
}

export async function restoreJob(userId: string, id: number): Promise<void> {
  await getDb()
    .update(jobDescriptions)
    .set({ deletedAt: null })
    .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
}

export async function softDeleteJobWithQuestions(userId: string, id: number): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(jobDescriptions)
      .set({ deletedAt: sql`NOW()` })
      .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
    await tx
      .update(interviewQuestions)
      .set({ deletedAt: sql`NOW()` })
      .where(
        and(
          eq(interviewQuestions.jdId, id),
          eq(interviewQuestions.userId, userId),
          isNull(interviewQuestions.deletedAt)
        )
      );
  });
}

export async function restoreJobWithQuestions(userId: string, id: number): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(jobDescriptions)
      .set({ deletedAt: null })
      .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
    await tx
      .update(interviewQuestions)
      .set({ deletedAt: null })
      .where(
        and(
          eq(interviewQuestions.jdId, id),
          eq(interviewQuestions.userId, userId),
          isNotNull(interviewQuestions.deletedAt)
        )
      );
  });
}

export async function getDeletedJobs(userId: string): Promise<JobDescription[]> {
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
      questionCount: sql<number>`(${questionCountSq})::int`,
      deletedAt: jobDescriptions.deletedAt,
      createdAt: jobDescriptions.createdAt,
      updatedAt: jobDescriptions.updatedAt,
    })
    .from(jobDescriptions)
    .where(and(eq(jobDescriptions.userId, userId), isNotNull(jobDescriptions.deletedAt)))
    .orderBy(desc(jobDescriptions.deletedAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as JobDescriptionStatus,
  }));
}
