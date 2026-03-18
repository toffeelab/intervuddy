import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestJobDescription, seedTestCategories } from '@/test/helpers/db';
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJob,
  restoreJob,
  getDeletedJobs,
} from './jobs';

describe('jobs data-access', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('getAllJobs', () => {
    it('빈 DB에서 빈 배열을 반환한다', () => {
      expect(getAllJobs()).toEqual([]);
    });

    it('JD 목록을 반환한다', () => {
      seedTestJobDescription(db);
      const jobs = getAllJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].companyName).toBe('네이버');
      expect(jobs[0].positionTitle).toBe('프론트엔드 시니어');
    });

    it('삭제된 JD는 제외한다', () => {
      seedTestJobDescription(db);
      softDeleteJob(1);
      expect(getAllJobs()).toEqual([]);
    });

    it('questionCount를 포함한다', () => {
      seedTestJobDescription(db);
      seedTestCategories(db);
      db.exec(`
        INSERT INTO interview_questions (category_id, jd_id, question, answer, display_order)
        VALUES (1, 1, 'Q1', 'A1', 1), (1, 1, 'Q2', 'A2', 2);
      `);
      const jobs = getAllJobs();
      expect(jobs[0].questionCount).toBe(2);
    });
  });

  describe('getJobById', () => {
    it('단일 JD를 반환한다', () => {
      seedTestJobDescription(db);
      const job = getJobById(1);
      expect(job).not.toBeNull();
      expect(job!.companyName).toBe('네이버');
    });

    it('존재하지 않는 id는 null을 반환한다', () => {
      expect(getJobById(999)).toBeNull();
    });
  });

  describe('createJob', () => {
    it('JD를 생성하고 id를 반환한다', () => {
      const id = createJob({
        companyName: '카카오',
        positionTitle: '백엔드 개발자',
        memo: '데이터팀',
      });
      expect(id).toBe(1);
      const job = getJobById(id);
      expect(job!.companyName).toBe('카카오');
      expect(job!.memo).toBe('데이터팀');
      expect(job!.status).toBe('in_progress');
    });
  });

  describe('updateJob', () => {
    it('JD를 부분 수정할 수 있다', () => {
      seedTestJobDescription(db);
      updateJob({ id: 1, companyName: '라인' });
      const job = getJobById(1);
      expect(job!.companyName).toBe('라인');
      expect(job!.positionTitle).toBe('프론트엔드 시니어'); // 변경 안 됨
    });
  });

  describe('updateJobStatus', () => {
    it('상태를 변경할 수 있다', () => {
      seedTestJobDescription(db);
      updateJobStatus(1, 'completed');
      const job = getJobById(1);
      expect(job!.status).toBe('completed');
    });
  });

  describe('softDeleteJob / restoreJob', () => {
    it('소프트 삭제 후 복원할 수 있다', () => {
      seedTestJobDescription(db);
      softDeleteJob(1);
      expect(getAllJobs()).toEqual([]);

      restoreJob(1);
      expect(getAllJobs()).toHaveLength(1);
    });
  });

  describe('getDeletedJobs', () => {
    it('삭제된 JD를 반환한다', () => {
      seedTestJobDescription(db);
      softDeleteJob(1);
      const deleted = getDeletedJobs();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].companyName).toBe('네이버');
    });

    it('활성 JD는 포함하지 않는다', () => {
      seedTestJobDescription(db);
      expect(getDeletedJobs()).toEqual([]);
    });
  });
});
