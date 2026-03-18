import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  createTestDb,
  cleanupTestDb,
  seedTestCategories,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import {
  getLibraryQuestions,
  getQuestionsByJdId,
  getQuestionsByCategory,
  createQuestion,
  updateQuestion,
  softDeleteQuestion,
  restoreQuestion,
  getDeletedQuestions,
} from './questions';

describe('questions data-access', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('getLibraryQuestions', () => {
    it('빈 DB에서 빈 배열을 반환한다', () => {
      expect(getLibraryQuestions()).toEqual([]);
    });

    it('라이브러리 질문(jd_id IS NULL)을 반환한다', () => {
      seedTestQuestions(db);
      const questions = getLibraryQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('자기소개를 해주세요');
    });

    it('키워드를 포함한다', () => {
      seedTestQuestions(db);
      const questions = getLibraryQuestions();
      expect(questions[0].keywords).toEqual(expect.arrayContaining(['자기소개', '경력']));
    });

    it('꼬리질문을 포함한다', () => {
      seedTestQuestions(db);
      const questions = getLibraryQuestions();
      expect(questions[0].followups).toHaveLength(1);
      expect(questions[0].followups[0].question).toBe('가장 어려웠던 프로젝트는?');
    });

    it('카테고리 정보를 포함한다', () => {
      seedTestQuestions(db);
      const questions = getLibraryQuestions();
      expect(questions[0].categoryName).toBe('자기소개/커리어');
      expect(questions[0].categorySlug).toBe('self-intro');
    });

    it('삭제된 질문은 제외한다', () => {
      seedTestQuestions(db);
      softDeleteQuestion(1);
      expect(getLibraryQuestions()).toEqual([]);
    });
  });

  describe('getQuestionsByJdId', () => {
    it('JD에 속한 질문을 반환한다', () => {
      seedTestCategories(db);
      seedTestJobDescription(db);
      db.exec(`
        INSERT INTO interview_questions (category_id, jd_id, question, answer, display_order)
        VALUES (1, 1, 'JD 질문', 'JD 답변', 1);
      `);
      const questions = getQuestionsByJdId(1);
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('JD 질문');
      expect(questions[0].jdId).toBe(1);
    });
  });

  describe('getQuestionsByCategory', () => {
    it('카테고리별 질문을 반환한다', () => {
      seedTestQuestions(db);
      const questions = getQuestionsByCategory(1);
      expect(questions).toHaveLength(1);
      expect(questions[0].categoryId).toBe(1);
    });

    it('다른 카테고리의 질문은 포함하지 않는다', () => {
      seedTestQuestions(db);
      const questions = getQuestionsByCategory(2);
      expect(questions).toEqual([]);
    });
  });

  describe('createQuestion', () => {
    it('질문을 생성하고 id를 반환한다', () => {
      seedTestCategories(db);
      const id = createQuestion({
        categoryId: 1,
        question: '새 질문',
        answer: '새 답변',
        tip: '팁',
      });
      expect(id).toBeGreaterThan(0);
      const questions = getLibraryQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('새 질문');
      expect(questions[0].tip).toBe('팁');
    });

    it('JD 질문을 생성할 수 있다', () => {
      seedTestCategories(db);
      seedTestJobDescription(db);
      const id = createQuestion({
        categoryId: 1,
        jdId: 1,
        question: 'JD 질문',
        answer: 'JD 답변',
      });
      expect(id).toBeGreaterThan(0);
      const questions = getQuestionsByJdId(1);
      expect(questions).toHaveLength(1);
    });
  });

  describe('updateQuestion', () => {
    it('질문을 부분 수정할 수 있다', () => {
      seedTestQuestions(db);
      updateQuestion({ id: 1, answer: '수정된 답변' });
      const questions = getLibraryQuestions();
      expect(questions[0].answer).toBe('수정된 답변');
      expect(questions[0].question).toBe('자기소개를 해주세요'); // 변경 안 됨
    });
  });

  describe('softDeleteQuestion / restoreQuestion', () => {
    it('소프트 삭제 후 복원할 수 있다', () => {
      seedTestQuestions(db);
      softDeleteQuestion(1);
      expect(getLibraryQuestions()).toEqual([]);

      restoreQuestion(1);
      expect(getLibraryQuestions()).toHaveLength(1);
    });
  });

  describe('getDeletedQuestions', () => {
    it('삭제된 질문을 반환한다', () => {
      seedTestQuestions(db);
      softDeleteQuestion(1);
      const deleted = getDeletedQuestions();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].question).toBe('자기소개를 해주세요');
    });

    it('jdId로 필터링할 수 있다', () => {
      seedTestCategories(db);
      seedTestJobDescription(db);
      db.exec(`
        INSERT INTO interview_questions (category_id, question, answer, display_order)
        VALUES (1, '라이브러리 질문', '답변', 1);
        INSERT INTO interview_questions (category_id, jd_id, question, answer, display_order)
        VALUES (1, 1, 'JD 질문', 'JD 답변', 2);
      `);
      softDeleteQuestion(1);
      softDeleteQuestion(2);
      const deleted = getDeletedQuestions(1);
      expect(deleted).toHaveLength(1);
      expect(deleted[0].jdId).toBe(1);
    });
  });
});
