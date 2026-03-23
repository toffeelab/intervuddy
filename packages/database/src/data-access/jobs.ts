import type {
  JobDescription,
  JobDescriptionStatus,
  CreateJobInput,
  UpdateJobInput,
} from '@intervuddy/shared';
import { eq, and, isNull, isNotNull, sql, desc, count } from 'drizzle-orm';
import type { Database, DbOrTx } from '../connection';
import { jobDescriptions, interviewQuestions } from '../schema';

export async function getAllJobs(db: DbOrTx, userId: string): Promise<JobDescription[]> {
  const questionCountSq = db
    .select({ count: count() })
    .from(interviewQuestions)
    .where(
      and(eq(interviewQuestions.jdId, jobDescriptions.id), isNull(interviewQuestions.deletedAt))
    );

  const rows = await db
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

export async function getJobById(
  db: DbOrTx,
  userId: string,
  id: string
): Promise<JobDescription | null> {
  const questionCountSq = db
    .select({ count: count() })
    .from(interviewQuestions)
    .where(
      and(eq(interviewQuestions.jdId, jobDescriptions.id), isNull(interviewQuestions.deletedAt))
    );

  const rows = await db
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

export async function createJob(
  db: DbOrTx,
  userId: string,
  input: CreateJobInput
): Promise<string> {
  const [result] = await db
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

export async function updateJob(db: DbOrTx, userId: string, input: UpdateJobInput): Promise<void> {
  const updates: Partial<typeof jobDescriptions.$inferInsert> = {};

  if (input.companyName !== undefined) updates.companyName = input.companyName;
  if (input.positionTitle !== undefined) updates.positionTitle = input.positionTitle;
  if (input.status !== undefined) updates.status = input.status;
  if (input.memo !== undefined) updates.memo = input.memo;

  if (Object.keys(updates).length === 0) return;

  await db
    .update(jobDescriptions)
    .set(updates)
    .where(and(eq(jobDescriptions.id, input.id), eq(jobDescriptions.userId, userId)));
}

export async function updateJobStatus(
  db: DbOrTx,
  userId: string,
  id: string,
  status: JobDescriptionStatus
): Promise<void> {
  await db
    .update(jobDescriptions)
    .set({ status })
    .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
}

export async function softDeleteJob(db: DbOrTx, userId: string, id: string): Promise<void> {
  await db
    .update(jobDescriptions)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
}

export async function restoreJob(db: DbOrTx, userId: string, id: string): Promise<void> {
  await db
    .update(jobDescriptions)
    .set({ deletedAt: null })
    .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
}

export async function softDeleteJobWithQuestions(
  db: Database,
  userId: string,
  id: string
): Promise<void> {
  await db.transaction(async (tx) => {
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

export async function restoreJobWithQuestions(
  db: Database,
  userId: string,
  id: string
): Promise<void> {
  await db.transaction(async (tx) => {
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

export async function getDeletedJobs(db: DbOrTx, userId: string): Promise<JobDescription[]> {
  const questionCountSq = db
    .select({ count: count() })
    .from(interviewQuestions)
    .where(
      and(eq(interviewQuestions.jdId, jobDescriptions.id), isNull(interviewQuestions.deletedAt))
    );

  const rows = await db
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
