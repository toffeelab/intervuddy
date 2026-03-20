import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { users } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  truncateAllTables,
  seedTestQuestions,
} from '@/test/helpers/db';
import {
  recordQuestion,
  recordAnswer,
  recordFeedback,
  getSessionRecords,
  getSessionQuestionByDisplayOrder,
} from './session-records';
import { createSession } from './sessions';

const OTHER_USER_ID = 'other-user';

describe('session-records data-access', () => {
  let db: NodePgDatabase<typeof schema>;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAllTables(db);
    await db
      .insert(users)
      .values({ id: OTHER_USER_ID, name: 'Other', email: 'other@test.com' })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('recordQuestion', () => {
    it('질문을 기록하고 id를 반환한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const id = await recordQuestion(sessionId, {
        content: '자기소개를 해주세요',
        displayOrder: 1,
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('questionId를 선택적으로 포함할 수 있다', async () => {
      await seedTestQuestions(db);
      const questions = await db
        .select({ id: schema.interviewQuestions.id })
        .from(schema.interviewQuestions);

      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const id = await recordQuestion(sessionId, {
        questionId: questions[0].id,
        content: '질문 내용',
        displayOrder: 1,
      });

      expect(id).toBeDefined();
    });
  });

  describe('recordAnswer', () => {
    it('답변을 기록하고 id를 반환한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const questionId = await recordQuestion(sessionId, {
        content: '질문',
        displayOrder: 1,
      });

      const answerId = await recordAnswer(questionId, DEFAULT_USER_ID, '답변 내용입니다');
      expect(answerId).toBeDefined();
    });
  });

  describe('recordFeedback', () => {
    it('피드백을 기록하고 id를 반환한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const questionId = await recordQuestion(sessionId, {
        content: '질문',
        displayOrder: 1,
      });

      const feedbackId = await recordFeedback(questionId, OTHER_USER_ID, '좋은 답변입니다', 8);
      expect(feedbackId).toBeDefined();
    });

    it('content나 score가 null일 수 있다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const questionId = await recordQuestion(sessionId, {
        content: '질문',
        displayOrder: 1,
      });

      const feedbackId = await recordFeedback(questionId, OTHER_USER_ID, null, null);
      expect(feedbackId).toBeDefined();
    });
  });

  describe('getSessionRecords', () => {
    it('질문 + 답변 + 피드백을 포함한 전체 기록을 반환한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const q1Id = await recordQuestion(sessionId, {
        content: '첫 번째 질문',
        displayOrder: 1,
      });
      const q2Id = await recordQuestion(sessionId, {
        content: '두 번째 질문',
        displayOrder: 2,
      });

      await recordAnswer(q1Id, DEFAULT_USER_ID, '첫 번째 답변');
      await recordFeedback(q1Id, OTHER_USER_ID, '잘했습니다', 9);

      const records = await getSessionRecords(sessionId);
      expect(records).toHaveLength(2);
      expect(records[0].content).toBe('첫 번째 질문');
      expect(records[0].displayOrder).toBe(1);
      expect(records[0].answer).not.toBeNull();
      expect(records[0].answer!.content).toBe('첫 번째 답변');
      expect(records[0].feedbacks).toHaveLength(1);
      expect(records[0].feedbacks[0].score).toBe(9);

      expect(records[1].content).toBe('두 번째 질문');
      expect(records[1].answer).toBeNull();
      expect(records[1].feedbacks).toHaveLength(0);
    });

    it('빈 세션에서 빈 배열을 반환한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const records = await getSessionRecords(sessionId);
      expect(records).toEqual([]);
    });
  });

  describe('getSessionQuestionByDisplayOrder', () => {
    it('displayOrder로 질문을 찾는다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const q1Id = await recordQuestion(sessionId, {
        content: '질문 1',
        displayOrder: 1,
      });
      await recordQuestion(sessionId, {
        content: '질문 2',
        displayOrder: 2,
      });

      const result = await getSessionQuestionByDisplayOrder(sessionId, 1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(q1Id);
    });

    it('존재하지 않는 displayOrder는 null을 반환한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const result = await getSessionQuestionByDisplayOrder(sessionId, 99);
      expect(result).toBeNull();
    });
  });
});
