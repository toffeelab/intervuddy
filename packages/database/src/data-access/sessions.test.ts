import { DEFAULT_USER_ID } from '@intervuddy/shared';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as schema from '@/db/schema';
import { users } from '@/db/schema';
import { createTestDb, cleanupTestDb, truncateAllTables } from '@/test/helpers/db';
import {
  createSession,
  getSessionById,
  getSessionsByUserId,
  updateSessionStatus,
  deleteSession,
} from './sessions';

const OTHER_USER_ID = 'other-user';

describe('sessions data-access', () => {
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

  describe('createSession', () => {
    it('세션을 생성하고 id를 반환한다', async () => {
      const id = await createSession(DEFAULT_USER_ID, {
        title: '모의면접 세션',
        role: 'interviewer',
      });
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('생성자를 참가자로 자동 추가한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '모의면접 세션',
        role: 'interviewee',
      });
      const session = await getSessionById(DEFAULT_USER_ID, sessionId);
      expect(session).not.toBeNull();
      expect(session!.title).toBe('모의면접 세션');
      expect(session!.status).toBe('waiting');
    });

    it('qaOwnerId와 옵셔널 필드를 설정할 수 있다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
        qaOwnerId: DEFAULT_USER_ID,
      });
      const session = await getSessionById(DEFAULT_USER_ID, sessionId);
      expect(session!.qaOwnerId).toBe(DEFAULT_USER_ID);
    });
  });

  describe('getSessionById', () => {
    it('참가자만 세션을 조회할 수 있다', async () => {
      await db
        .insert(users)
        .values({ id: OTHER_USER_ID, name: 'Other', email: 'other@test.com' })
        .onConflictDoNothing();

      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '비공개 세션',
        role: 'interviewer',
      });

      const session = await getSessionById(DEFAULT_USER_ID, sessionId);
      expect(session).not.toBeNull();

      const otherView = await getSessionById(OTHER_USER_ID, sessionId);
      expect(otherView).toBeNull();
    });

    it('존재하지 않는 세션은 null을 반환한다', async () => {
      const session = await getSessionById(DEFAULT_USER_ID, 'nonexistent-id');
      expect(session).toBeNull();
    });
  });

  describe('getSessionsByUserId', () => {
    it('빈 DB에서 빈 배열을 반환한다', async () => {
      const sessions = await getSessionsByUserId(DEFAULT_USER_ID);
      expect(sessions).toEqual([]);
    });

    it('참가 중인 세션 목록을 createdAt 내림차순으로 반환한다', async () => {
      await createSession(DEFAULT_USER_ID, {
        title: '세션 1',
        role: 'interviewer',
      });
      await createSession(DEFAULT_USER_ID, {
        title: '세션 2',
        role: 'interviewee',
      });

      const sessions = await getSessionsByUserId(DEFAULT_USER_ID);
      expect(sessions).toHaveLength(2);
      expect(sessions[0].title).toBe('세션 2');
      expect(sessions[1].title).toBe('세션 1');
    });

    it('다른 유저의 세션은 포함하지 않는다', async () => {
      await db
        .insert(users)
        .values({ id: OTHER_USER_ID, name: 'Other', email: 'other@test.com' })
        .onConflictDoNothing();

      await createSession(DEFAULT_USER_ID, {
        title: '내 세션',
        role: 'interviewer',
      });
      await createSession(OTHER_USER_ID, {
        title: '다른 세션',
        role: 'interviewer',
      });

      const mySessions = await getSessionsByUserId(DEFAULT_USER_ID);
      expect(mySessions).toHaveLength(1);
      expect(mySessions[0].title).toBe('내 세션');
    });
  });

  describe('updateSessionStatus', () => {
    it('in_progress로 변경 시 startedAt을 설정한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await updateSessionStatus(DEFAULT_USER_ID, sessionId, 'in_progress');
      const session = await getSessionById(DEFAULT_USER_ID, sessionId);
      expect(session!.status).toBe('in_progress');
      expect(session!.startedAt).toBeInstanceOf(Date);
    });

    it('completed로 변경 시 endedAt을 설정한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await updateSessionStatus(DEFAULT_USER_ID, sessionId, 'in_progress');
      await updateSessionStatus(DEFAULT_USER_ID, sessionId, 'completed');
      const session = await getSessionById(DEFAULT_USER_ID, sessionId);
      expect(session!.status).toBe('completed');
      expect(session!.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteSession', () => {
    it('생성자가 소프트 삭제할 수 있다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '삭제 대상',
        role: 'interviewer',
      });

      await deleteSession(DEFAULT_USER_ID, sessionId);
      const session = await getSessionById(DEFAULT_USER_ID, sessionId);
      expect(session).toBeNull();
    });

    it('생성자가 아닌 유저는 삭제할 수 없다', async () => {
      await db
        .insert(users)
        .values({ id: OTHER_USER_ID, name: 'Other', email: 'other@test.com' })
        .onConflictDoNothing();

      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '삭제 불가',
        role: 'interviewer',
      });

      await deleteSession(OTHER_USER_ID, sessionId);
      const session = await getSessionById(DEFAULT_USER_ID, sessionId);
      expect(session).not.toBeNull();
    });

    it('삭제된 세션은 목록에서 제외된다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '삭제 대상',
        role: 'interviewer',
      });
      await createSession(DEFAULT_USER_ID, {
        title: '유지 대상',
        role: 'interviewer',
      });

      await deleteSession(DEFAULT_USER_ID, sessionId);
      const sessions = await getSessionsByUserId(DEFAULT_USER_ID);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].title).toBe('유지 대상');
    });
  });
});
