import { DEFAULT_USER_ID } from '@intervuddy/shared';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as schema from '../schema';
import { users } from '../schema';
import { createTestDb, cleanupTestDb, truncateAllTables } from '../test-helpers/db';
import {
  addParticipant,
  removeParticipant,
  getParticipants,
  getParticipantRole,
} from './session-participants';
import { createSession } from './sessions';

const OTHER_USER_ID = 'other-user';
const THIRD_USER_ID = 'third-user';

describe('session-participants data-access', () => {
  let db: NodePgDatabase<typeof schema>;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAllTables(db);
    await db
      .insert(users)
      .values([
        { id: OTHER_USER_ID, name: 'Other', email: 'other@test.com' },
        { id: THIRD_USER_ID, name: 'Third', email: 'third@test.com' },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('addParticipant', () => {
    it('생성자가 참가자를 추가할 수 있다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const id = await addParticipant(db, DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'interviewee');
      expect(id).toBeDefined();
    });

    it('생성자가 아닌 유저는 참가자를 추가할 수 없다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await expect(
        addParticipant(OTHER_USER_ID, sessionId, THIRD_USER_ID, 'reviewer')
      ).rejects.toThrow();
    });

    it('interviewer는 최대 1명까지만 가능하다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await expect(
        addParticipant(DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'interviewer')
      ).rejects.toThrow();
    });

    it('interviewee는 최대 1명까지만 가능하다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewee',
      });

      await expect(
        addParticipant(DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'interviewee')
      ).rejects.toThrow();
    });

    it('reviewer는 여러 명 추가할 수 있다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await addParticipant(db, DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'reviewer');
      await addParticipant(db, DEFAULT_USER_ID, sessionId, THIRD_USER_ID, 'reviewer');

      const participants = await getParticipants(db, DEFAULT_USER_ID, sessionId);
      const reviewers = participants.filter((p) => p.role === 'reviewer');
      expect(reviewers).toHaveLength(2);
    });

    it('같은 유저를 중복 추가할 수 없다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await addParticipant(db, DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'reviewer');
      await expect(
        addParticipant(DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'reviewer')
      ).rejects.toThrow();
    });
  });

  describe('removeParticipant', () => {
    it('생성자가 참가자를 제거할 수 있다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await addParticipant(db, DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'reviewer');
      await removeParticipant(db, DEFAULT_USER_ID, sessionId, OTHER_USER_ID);

      const participants = await getParticipants(db, DEFAULT_USER_ID, sessionId);
      expect(participants).toHaveLength(1); // only creator
    });

    it('생성자가 아닌 유저는 참가자를 제거할 수 없다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await addParticipant(db, DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'reviewer');
      await expect(removeParticipant(OTHER_USER_ID, sessionId, THIRD_USER_ID)).rejects.toThrow();
    });
  });

  describe('getParticipants', () => {
    it('참가자 목록을 반환한다 (displayName 포함)', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      await addParticipant(db, DEFAULT_USER_ID, sessionId, OTHER_USER_ID, 'interviewee');

      const participants = await getParticipants(db, DEFAULT_USER_ID, sessionId);
      expect(participants).toHaveLength(2);
      expect(participants.find((p) => p.userId === DEFAULT_USER_ID)?.displayName).toBe(
        'Local User'
      );
      expect(participants.find((p) => p.userId === OTHER_USER_ID)?.displayName).toBe('Other');
    });
  });

  describe('getParticipantRole', () => {
    it('참가자의 역할을 반환한다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const role = await getParticipantRole(db, sessionId, DEFAULT_USER_ID);
      expect(role).toBe('interviewer');
    });

    it('참가하지 않은 유저는 null을 반환한다', async () => {
      const sessionId = await createSession(db, DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const role = await getParticipantRole(db, sessionId, OTHER_USER_ID);
      expect(role).toBeNull();
    });
  });
});
