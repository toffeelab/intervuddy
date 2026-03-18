import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestQuestions } from '@/test/helpers/db';
import {
  getFollowupsByQuestionId,
  createFollowup,
  updateFollowup,
  softDeleteFollowup,
  restoreFollowup,
} from './followups';

describe('followups data-access', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestQuestions(db);
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('getFollowupsByQuestionId', () => {
    it('질문에 속한 꼬리질문을 반환한다', () => {
      const followups = getFollowupsByQuestionId(1);
      expect(followups).toHaveLength(1);
      expect(followups[0].question).toBe('가장 어려웠던 프로젝트는?');
      expect(followups[0].answer).toBe('실시간 통신 시스템 구축');
    });

    it('삭제된 꼬리질문은 제외한다', () => {
      softDeleteFollowup(1);
      expect(getFollowupsByQuestionId(1)).toEqual([]);
    });

    it('다른 질문의 꼬리질문은 포함하지 않는다', () => {
      expect(getFollowupsByQuestionId(999)).toEqual([]);
    });
  });

  describe('createFollowup', () => {
    it('꼬리질문을 생성하고 id를 반환한다', () => {
      const id = createFollowup({
        questionId: 1,
        question: '새 꼬리질문',
        answer: '새 답변',
      });
      expect(id).toBeGreaterThan(0);
      const followups = getFollowupsByQuestionId(1);
      expect(followups).toHaveLength(2);
    });
  });

  describe('updateFollowup', () => {
    it('꼬리질문을 부분 수정할 수 있다', () => {
      updateFollowup({ id: 1, answer: '수정된 답변' });
      const followups = getFollowupsByQuestionId(1);
      expect(followups[0].answer).toBe('수정된 답변');
      expect(followups[0].question).toBe('가장 어려웠던 프로젝트는?'); // 변경 안 됨
    });
  });

  describe('softDeleteFollowup / restoreFollowup', () => {
    it('소프트 삭제 후 복원할 수 있다', () => {
      softDeleteFollowup(1);
      expect(getFollowupsByQuestionId(1)).toEqual([]);

      restoreFollowup(1);
      expect(getFollowupsByQuestionId(1)).toHaveLength(1);
    });
  });
});
