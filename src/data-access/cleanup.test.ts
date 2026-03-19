import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import { purgeExpiredItems } from './cleanup';
import { softDeleteFollowup } from './followups';
import { softDeleteJob, getDeletedJobs } from './jobs';
import { softDeleteQuestion, getDeletedQuestions } from './questions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('purgeExpiredItems', () => {
  it('보관 기간 만료 항목 영구 삭제', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.questions).toBe(1);
    expect(getDeletedQuestions()).toHaveLength(0);
  });

  it('보관 기간 내 항목은 유지', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-29 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.questions).toBe(0);
    expect(getDeletedQuestions()).toHaveLength(1);
  });

  it('JD 만료 시 영구 삭제', () => {
    seedTestJobDescription(db);
    softDeleteJob(1);
    db.prepare(
      "UPDATE job_descriptions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.jobs).toBe(1);
    expect(getDeletedJobs()).toHaveLength(0);
  });

  it('만료된 followup도 영구 삭제', () => {
    seedTestQuestions(db); // question 1 + followup 1
    softDeleteFollowup(1);
    db.prepare(
      "UPDATE followup_questions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.followups).toBe(1);
  });

  it('retentionDays 미지정 시 DEFAULT_RETENTION_DAYS 사용', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(); // default = 30
    expect(purged.questions).toBe(1);
  });
});
