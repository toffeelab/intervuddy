import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { interviewCategories, interviewQuestions } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestJobDescription,
  seedTestCategories,
  seedTestQuestions,
  truncateAllTables,
} from '@/test/helpers/db';
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJob,
  restoreJob,
  getDeletedJobs,
  softDeleteJobWithQuestions,
  restoreJobWithQuestions,
} from './jobs';
import { getQuestionsByJdId, getDeletedQuestions, getLibraryQuestions } from './questions';

describe('jobs data-access', () => {
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

  describe('getAllJobs', () => {
    it('빈 DB에서 빈 배열을 반환한다', async () => {
      expect(await getAllJobs(DEFAULT_USER_ID)).toEqual([]);
    });

    it('JD 목록을 반환한다', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].companyName).toBe('네이버');
      expect(jobs[0].positionTitle).toBe('프론트엔드 시니어');
    });

    it('삭제된 JD는 제외한다', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      await softDeleteJob(DEFAULT_USER_ID, jobs[0].id);
      expect(await getAllJobs(DEFAULT_USER_ID)).toEqual([]);
    });

    it('questionCount를 포함한다', async () => {
      await seedTestJobDescription(db);
      await seedTestCategories(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      await db.insert(interviewQuestions).values([
        {
          userId: DEFAULT_USER_ID,
          categoryId: cats[0].id,
          jdId: jobs[0].id,
          question: 'Q1',
          answer: 'A1',
          displayOrder: 1,
        },
        {
          userId: DEFAULT_USER_ID,
          categoryId: cats[0].id,
          jdId: jobs[0].id,
          question: 'Q2',
          answer: 'A2',
          displayOrder: 2,
        },
      ]);
      const updatedJobs = await getAllJobs(DEFAULT_USER_ID);
      expect(updatedJobs[0].questionCount).toBe(2);
    });
  });

  describe('getJobById', () => {
    it('단일 JD를 반환한다', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      const job = await getJobById(DEFAULT_USER_ID, jobs[0].id);
      expect(job).not.toBeNull();
      expect(job!.companyName).toBe('네이버');
    });

    it('존재하지 않는 id는 null을 반환한다', async () => {
      expect(await getJobById(DEFAULT_USER_ID, 999999)).toBeNull();
    });
  });

  describe('createJob', () => {
    it('JD를 생성하고 id를 반환한다', async () => {
      const id = await createJob(DEFAULT_USER_ID, {
        companyName: '카카오',
        positionTitle: '백엔드 개발자',
        memo: '데이터팀',
      });
      expect(id).toBeGreaterThan(0);
      const job = await getJobById(DEFAULT_USER_ID, id);
      expect(job!.companyName).toBe('카카오');
      expect(job!.memo).toBe('데이터팀');
      expect(job!.status).toBe('in_progress');
    });
  });

  describe('updateJob', () => {
    it('JD를 부분 수정할 수 있다', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      await updateJob(DEFAULT_USER_ID, { id: jobs[0].id, companyName: '라인' });
      const job = await getJobById(DEFAULT_USER_ID, jobs[0].id);
      expect(job!.companyName).toBe('라인');
      expect(job!.positionTitle).toBe('프론트엔드 시니어');
    });
  });

  describe('updateJobStatus', () => {
    it('상태를 변경할 수 있다', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      await updateJobStatus(DEFAULT_USER_ID, jobs[0].id, 'completed');
      const job = await getJobById(DEFAULT_USER_ID, jobs[0].id);
      expect(job!.status).toBe('completed');
    });
  });

  describe('softDeleteJob / restoreJob', () => {
    it('소프트 삭제 후 복원할 수 있다', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      await softDeleteJob(DEFAULT_USER_ID, jobs[0].id);
      expect(await getAllJobs(DEFAULT_USER_ID)).toEqual([]);

      await restoreJob(DEFAULT_USER_ID, jobs[0].id);
      expect(await getAllJobs(DEFAULT_USER_ID)).toHaveLength(1);
    });
  });

  describe('getDeletedJobs', () => {
    it('삭제된 JD를 반환한다', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs(DEFAULT_USER_ID);
      await softDeleteJob(DEFAULT_USER_ID, jobs[0].id);
      const deleted = await getDeletedJobs(DEFAULT_USER_ID);
      expect(deleted).toHaveLength(1);
      expect(deleted[0].companyName).toBe('네이버');
    });

    it('활성 JD는 포함하지 않는다', async () => {
      await seedTestJobDescription(db);
      expect(await getDeletedJobs(DEFAULT_USER_ID)).toEqual([]);
    });
  });

  describe('softDeleteJobWithQuestions', () => {
    it('JD 삭제 시 하위 질문도 함께 소프트 삭제', async () => {
      await seedTestQuestions(db);
      await seedTestJobDescription(db);
      const questions = await getLibraryQuestions(DEFAULT_USER_ID);
      const jobs = await getAllJobs(DEFAULT_USER_ID);

      // Assign the question to this JD
      await db
        .update(interviewQuestions)
        .set({ jdId: jobs[0].id })
        .where(sql`${interviewQuestions.id} = ${questions[0].id}`);

      await softDeleteJobWithQuestions(DEFAULT_USER_ID, jobs[0].id);

      expect(await getAllJobs(DEFAULT_USER_ID)).toHaveLength(0);
      expect(await getDeletedJobs(DEFAULT_USER_ID)).toHaveLength(1);
      expect(await getQuestionsByJdId(DEFAULT_USER_ID, jobs[0].id)).toHaveLength(0);
      expect(await getDeletedQuestions(DEFAULT_USER_ID, jobs[0].id)).toHaveLength(1);
    });
  });

  describe('restoreJobWithQuestions', () => {
    it('JD 복구 시 함께 삭제된 질문도 복구', async () => {
      await seedTestQuestions(db);
      await seedTestJobDescription(db);
      const questions = await getLibraryQuestions(DEFAULT_USER_ID);
      const jobs = await getAllJobs(DEFAULT_USER_ID);

      await db
        .update(interviewQuestions)
        .set({ jdId: jobs[0].id })
        .where(sql`${interviewQuestions.id} = ${questions[0].id}`);

      await softDeleteJobWithQuestions(DEFAULT_USER_ID, jobs[0].id);
      await restoreJobWithQuestions(DEFAULT_USER_ID, jobs[0].id);

      expect(await getAllJobs(DEFAULT_USER_ID)).toHaveLength(1);
      expect(await getQuestionsByJdId(DEFAULT_USER_ID, jobs[0].id)).toHaveLength(1);
    });
  });
});
