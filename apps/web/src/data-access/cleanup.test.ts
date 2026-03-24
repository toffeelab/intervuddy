import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { interviewQuestions, followupQuestions, jobDescriptions } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
  truncateAllTables,
} from '@/test/helpers/db';
import { purgeAllExpiredItems } from './cleanup';
import { softDeleteFollowup } from './followups';
import { getFollowupsByQuestionId } from './followups';
import { softDeleteJob, getDeletedJobs } from './jobs';
import { softDeleteQuestion, getDeletedQuestions, getLibraryQuestions } from './questions';

describe('purgeAllExpiredItems', () => {
  let db: NodePgDatabase<typeof schema>;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAllTables(db);
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it('보관 기간 만료 항목 영구 삭제', async () => {
    await seedTestQuestions(db);
    const questions = await getLibraryQuestions(DEFAULT_USER_ID);
    const qId = questions[0].id;
    await softDeleteQuestion(DEFAULT_USER_ID, qId);
    // Backdate the deletion timestamp by 31 days
    await db
      .update(interviewQuestions)
      .set({ deletedAt: sql`NOW() - INTERVAL '31 days'` })
      .where(sql`${interviewQuestions.id} = ${qId}`);

    const purged = await purgeAllExpiredItems(30);
    expect(purged.questions).toBe(1);
    expect(await getDeletedQuestions(DEFAULT_USER_ID)).toHaveLength(0);
  });

  it('보관 기간 내 항목은 유지', async () => {
    await seedTestQuestions(db);
    const questions = await getLibraryQuestions(DEFAULT_USER_ID);
    const qId = questions[0].id;
    await softDeleteQuestion(DEFAULT_USER_ID, qId);
    await db
      .update(interviewQuestions)
      .set({ deletedAt: sql`NOW() - INTERVAL '29 days'` })
      .where(sql`${interviewQuestions.id} = ${qId}`);

    const purged = await purgeAllExpiredItems(30);
    expect(purged.questions).toBe(0);
    expect(await getDeletedQuestions(DEFAULT_USER_ID)).toHaveLength(1);
  });

  it('JD 만료 시 영구 삭제', async () => {
    await seedTestJobDescription(db);
    const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);
    const jdId = jobs[0].id;
    await softDeleteJob(DEFAULT_USER_ID, jdId);
    await db
      .update(jobDescriptions)
      .set({ deletedAt: sql`NOW() - INTERVAL '31 days'` })
      .where(sql`${jobDescriptions.id} = ${jdId}`);

    const purged = await purgeAllExpiredItems(30);
    expect(purged.jobs).toBe(1);
    expect(await getDeletedJobs(DEFAULT_USER_ID)).toHaveLength(0);
  });

  it('만료된 followup도 영구 삭제', async () => {
    await seedTestQuestions(db);
    const questions = await getLibraryQuestions(DEFAULT_USER_ID);
    const qId = questions[0].id;
    const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, qId);
    const fId = followups[0].id;

    await softDeleteFollowup(DEFAULT_USER_ID, fId);
    await db
      .update(followupQuestions)
      .set({ deletedAt: sql`NOW() - INTERVAL '31 days'` })
      .where(sql`${followupQuestions.id} = ${fId}`);

    const purged = await purgeAllExpiredItems(30);
    expect(purged.followups).toBe(1);
  });

  it('retentionDays 미지정 시 DEFAULT_RETENTION_DAYS 사용', async () => {
    await seedTestQuestions(db);
    const questions = await getLibraryQuestions(DEFAULT_USER_ID);
    const qId = questions[0].id;
    await softDeleteQuestion(DEFAULT_USER_ID, qId);
    await db
      .update(interviewQuestions)
      .set({ deletedAt: sql`NOW() - INTERVAL '31 days'` })
      .where(sql`${interviewQuestions.id} = ${qId}`);

    const purged = await purgeAllExpiredItems(); // default = 30
    expect(purged.questions).toBe(1);
  });
});
