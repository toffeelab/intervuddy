import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { users } from '@/db/schema';
import { createTestDb, cleanupTestDb, truncateAllTables } from '@/test/helpers/db';
import {
  createInvitation,
  getInvitationByCode,
  acceptInvitation,
  revokeInvitation,
} from './session-invitations';
import { getParticipants } from './session-participants';
import { createSession } from './sessions';

const OTHER_USER_ID = 'other-user';
const THIRD_USER_ID = 'third-user';

describe('session-invitations data-access', () => {
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

  describe('createInvitation', () => {
    it('초대를 생성하고 id와 inviteCode를 반환한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const result = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee');
      expect(result.id).toBeDefined();
      expect(result.inviteCode).toBeDefined();
      expect(result.inviteCode.length).toBe(8);
    });

    it('기본 만료시간은 24시간이다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const result = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee');
      const invitation = await getInvitationByCode(result.inviteCode);
      expect(invitation).not.toBeNull();

      const expiresAt = invitation!.expiresAt.getTime();
      const now = Date.now();
      // Should expire roughly 24h from now (within 5 seconds tolerance)
      expect(expiresAt - now).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(expiresAt - now).toBeLessThan(25 * 60 * 60 * 1000);
    });
  });

  describe('getInvitationByCode', () => {
    it('초대 코드로 초대 정보를 조회한다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const { inviteCode } = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee');
      const invitation = await getInvitationByCode(inviteCode);
      expect(invitation).not.toBeNull();
      expect(invitation!.sessionId).toBe(sessionId);
      expect(invitation!.role).toBe('interviewee');
    });

    it('존재하지 않는 코드는 null을 반환한다', async () => {
      const invitation = await getInvitationByCode('nonexist');
      expect(invitation).toBeNull();
    });
  });

  describe('acceptInvitation', () => {
    it('초대를 수락하고 참가자로 추가된다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const { inviteCode } = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee');
      const result = await acceptInvitation(inviteCode, OTHER_USER_ID);

      expect(result.sessionId).toBe(sessionId);
      expect(result.role).toBe('interviewee');

      const participants = await getParticipants(DEFAULT_USER_ID, sessionId);
      expect(participants).toHaveLength(2);
      expect(participants.find((p) => p.userId === OTHER_USER_ID)?.role).toBe('interviewee');
    });

    it('만료된 초대는 수락할 수 없다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const { inviteCode } = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee', {
        expiresInMs: 0,
      });

      // Wait a tiny bit so expiry is in the past
      await new Promise((resolve) => setTimeout(resolve, 10));

      await expect(acceptInvitation(inviteCode, OTHER_USER_ID)).rejects.toThrow();
    });

    it('최대 사용 횟수를 초과하면 수락할 수 없다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const { inviteCode } = await createInvitation(DEFAULT_USER_ID, sessionId, 'reviewer', {
        maxUses: 1,
      });

      await acceptInvitation(inviteCode, OTHER_USER_ID);
      await expect(acceptInvitation(inviteCode, THIRD_USER_ID)).rejects.toThrow();
    });

    it('취소된 초대는 수락할 수 없다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const { id, inviteCode } = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee');
      await revokeInvitation(DEFAULT_USER_ID, id);

      await expect(acceptInvitation(inviteCode, OTHER_USER_ID)).rejects.toThrow();
    });
  });

  describe('revokeInvitation', () => {
    it('초대자가 초대를 취소할 수 있다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const { id, inviteCode } = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee');
      await revokeInvitation(DEFAULT_USER_ID, id);

      const invitation = await getInvitationByCode(inviteCode);
      expect(invitation!.status).toBe('revoked');
    });

    it('초대자가 아닌 유저는 취소할 수 없다', async () => {
      const sessionId = await createSession(DEFAULT_USER_ID, {
        title: '세션',
        role: 'interviewer',
      });

      const { id } = await createInvitation(DEFAULT_USER_ID, sessionId, 'interviewee');
      await expect(revokeInvitation(OTHER_USER_ID, id)).rejects.toThrow();
    });
  });
});
