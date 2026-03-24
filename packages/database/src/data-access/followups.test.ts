import { DEFAULT_USER_ID } from '@intervuddy/shared';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as schema from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  truncateAllTables,
} from '@/test/helpers/db';
import {
  getFollowupsByQuestionId,
  createFollowup,
  updateFollowup,
  softDeleteFollowup,
  restoreFollowup,
} from './followups';
import { getLibraryQuestions } from './questions';

describe('followups data-access', () => {
  let db: NodePgDatabase<typeof schema>;
  let questionId: string;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAllTables(db);
    await seedTestQuestions(db);
    const questions = await getLibraryQuestions(DEFAULT_USER_ID);
    questionId = questions[0].id;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('getFollowupsByQuestionId', () => {
    it('질문에 속한 꼬리질문을 반환한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      expect(followups).toHaveLength(1);
      expect(followups[0].question).toBe('가장 어려웠던 프로젝트는?');
      expect(followups[0].answer).toBe('실시간 통신 시스템 구축');
    });

    it('삭제된 꼬리질문은 제외한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      await softDeleteFollowup(DEFAULT_USER_ID, followups[0].id);
      expect(await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId)).toEqual([]);
    });

    it('다른 질문의 꼬리질문은 포함하지 않는다', async () => {
      expect(await getFollowupsByQuestionId(DEFAULT_USER_ID, 'nonexistent-id')).toEqual([]);
    });
  });

  describe('createFollowup', () => {
    it('꼬리질문을 생성하고 id를 반환한다', async () => {
      const id = await createFollowup(DEFAULT_USER_ID, {
        questionId,
        question: '새 꼬리질문',
        answer: '새 답변',
      });
      expect(id).toBeDefined();
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      expect(followups).toHaveLength(2);
    });
  });

  describe('updateFollowup', () => {
    it('꼬리질문을 부분 수정할 수 있다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      await updateFollowup(DEFAULT_USER_ID, { id: followups[0].id, answer: '수정된 답변' });
      const updated = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      expect(updated[0].answer).toBe('수정된 답변');
      expect(updated[0].question).toBe('가장 어려웠던 프로젝트는?');
    });
  });

  describe('softDeleteFollowup / restoreFollowup', () => {
    it('소프트 삭제 후 복원할 수 있다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      const followupId = followups[0].id;
      await softDeleteFollowup(DEFAULT_USER_ID, followupId);
      expect(await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId)).toEqual([]);

      await restoreFollowup(DEFAULT_USER_ID, followupId);
      expect(await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId)).toHaveLength(1);
    });
  });
});
