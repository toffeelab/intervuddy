import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import { importQuestionsToJob } from './import';
import { getQuestionsByJdId, getLibraryQuestions } from './questions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('importQuestionsToJob', () => {
  it('라이브러리 질문을 JD로 복사 (질문 + 키워드 + 꼬리질문)', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    const result = importQuestionsToJob({ jdId: 1, questionIds: [1] });
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(0);

    const jdQuestions = getQuestionsByJdId(1);
    expect(jdQuestions).toHaveLength(1);
    expect(jdQuestions[0].jdId).toBe(1);
    expect(jdQuestions[0].originQuestionId).toBe(1);
    expect(jdQuestions[0].question).toBe('자기소개를 해주세요');
    expect(jdQuestions[0].keywords).toHaveLength(2);
    expect(jdQuestions[0].followups).toHaveLength(1);
  });

  it('이미 가져온 질문은 스킵', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    importQuestionsToJob({ jdId: 1, questionIds: [1] });
    const result = importQuestionsToJob({ jdId: 1, questionIds: [1] });
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);

    expect(getQuestionsByJdId(1)).toHaveLength(1);
  });

  it('존재하지 않는 questionId는 스킵', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    const result = importQuestionsToJob({ jdId: 1, questionIds: [999] });
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('원본 질문의 category_id를 유지', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    importQuestionsToJob({ jdId: 1, questionIds: [1] });
    const jdQuestions = getQuestionsByJdId(1);
    const original = getLibraryQuestions();
    expect(jdQuestions[0].categoryId).toBe(original[0].categoryId);
  });
});
