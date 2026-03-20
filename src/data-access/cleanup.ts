import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/index';
import {
  jobDescriptions,
  interviewCategories,
  interviewQuestions,
  followupQuestions,
} from '@/db/schema';
import { DEFAULT_RETENTION_DAYS } from '@/lib/retention-policy';

interface PurgeResult {
  questions: number;
  followups: number;
  categories: number;
  jobs: number;
}

/**
 * Purges expired soft-deleted items for ALL users.
 * Intended for server-side admin/cron use only — do NOT call from user-facing code.
 */
export async function purgeAllExpiredItems(
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<PurgeResult> {
  let followupsCount = 0;
  let questionsCount = 0;
  let categoriesCount = 0;
  let jobsCount = 0;

  await getDb().transaction(async (tx) => {
    // 순서 중요: FK 의존성 (자식 → 부모)
    const deletedFollowups = await tx
      .delete(followupQuestions)
      .where(
        and(
          isNotNull(followupQuestions.deletedAt),
          sql`${followupQuestions.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: followupQuestions.id });
    followupsCount = deletedFollowups.length;

    const deletedQuestions = await tx
      .delete(interviewQuestions)
      .where(
        and(
          isNotNull(interviewQuestions.deletedAt),
          sql`${interviewQuestions.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: interviewQuestions.id });
    questionsCount = deletedQuestions.length;

    const deletedCategories = await tx
      .delete(interviewCategories)
      .where(
        and(
          isNotNull(interviewCategories.deletedAt),
          sql`${interviewCategories.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: interviewCategories.id });
    categoriesCount = deletedCategories.length;

    const deletedJobs = await tx
      .delete(jobDescriptions)
      .where(
        and(
          isNotNull(jobDescriptions.deletedAt),
          sql`${jobDescriptions.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: jobDescriptions.id });
    jobsCount = deletedJobs.length;
  });

  const total = questionsCount + followupsCount + categoriesCount + jobsCount;
  if (total > 0) {
    console.warn(
      `[cleanup] purged ${total} expired items (jobs: ${jobsCount}, questions: ${questionsCount}, followups: ${followupsCount}, categories: ${categoriesCount})`
    );
  }

  return {
    questions: questionsCount,
    followups: followupsCount,
    categories: categoriesCount,
    jobs: jobsCount,
  };
}

/**
 * Purges expired soft-deleted items for a single user.
 */
export async function purgeExpiredItemsForUser(
  userId: string,
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<PurgeResult> {
  let followupsCount = 0;
  let questionsCount = 0;
  let categoriesCount = 0;
  let jobsCount = 0;

  await getDb().transaction(async (tx) => {
    // 순서 중요: FK 의존성 (자식 → 부모)
    const deletedFollowups = await tx
      .delete(followupQuestions)
      .where(
        and(
          eq(followupQuestions.userId, userId),
          isNotNull(followupQuestions.deletedAt),
          sql`${followupQuestions.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: followupQuestions.id });
    followupsCount = deletedFollowups.length;

    const deletedQuestions = await tx
      .delete(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.userId, userId),
          isNotNull(interviewQuestions.deletedAt),
          sql`${interviewQuestions.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: interviewQuestions.id });
    questionsCount = deletedQuestions.length;

    const deletedCategories = await tx
      .delete(interviewCategories)
      .where(
        and(
          eq(interviewCategories.userId, userId),
          isNotNull(interviewCategories.deletedAt),
          sql`${interviewCategories.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: interviewCategories.id });
    categoriesCount = deletedCategories.length;

    const deletedJobs = await tx
      .delete(jobDescriptions)
      .where(
        and(
          eq(jobDescriptions.userId, userId),
          isNotNull(jobDescriptions.deletedAt),
          sql`${jobDescriptions.deletedAt} < NOW() - INTERVAL '1 day' * ${retentionDays}`
        )
      )
      .returning({ id: jobDescriptions.id });
    jobsCount = deletedJobs.length;
  });

  const total = questionsCount + followupsCount + categoriesCount + jobsCount;
  if (total > 0) {
    console.warn(
      `[cleanup] purged ${total} expired items for user ${userId} (jobs: ${jobsCount}, questions: ${questionsCount}, followups: ${followupsCount}, categories: ${categoriesCount})`
    );
  }

  return {
    questions: questionsCount,
    followups: followupsCount,
    categories: categoriesCount,
    jobs: jobsCount,
  };
}
