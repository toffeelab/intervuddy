import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { getInvitationByCode } from '@/data-access/session-invitations';
import { getSessionById } from '@/data-access/sessions';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { users } from '@/db/schema';
import { createTestDb, cleanupTestDb, truncateAllTables } from '@/test/helpers/db';
import {
  createSessionAction,
  deleteSessionAction,
  createInvitationAction,
  acceptInvitationAction,
} from './session-actions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue(DEFAULT_USER_ID),
}));

describe('session-actions', () => {
  let db: NodePgDatabase<typeof schema>;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAllTables(db);
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('createSessionAction', () => {
    it('세션을 생성하고 { id }를 반환한다', async () => {
      const result = await createSessionAction({
        title: '테스트 모의면접',
        role: 'interviewer',
      });

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('생성된 세션이 DB에 실제로 저장된다', async () => {
      const { id } = await createSessionAction({
        title: '저장 확인용 세션',
        role: 'interviewee',
      });

      const session = await getSessionById(DEFAULT_USER_ID, id);
      expect(session).not.toBeNull();
      expect(session!.title).toBe('저장 확인용 세션');
      expect(session!.status).toBe('waiting');
    });

    it('revalidatePath를 /interviews/sessions 경로로 호출한다', async () => {
      await createSessionAction({
        title: '세션',
        role: 'interviewer',
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/sessions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteSessionAction', () => {
    it('세션을 소프트 삭제한다', async () => {
      const { id } = await createSessionAction({
        title: '삭제 테스트 세션',
        role: 'interviewer',
      });
      vi.clearAllMocks();

      await deleteSessionAction(id);

      const session = await getSessionById(DEFAULT_USER_ID, id);
      expect(session).toBeNull();
    });

    it('revalidatePath를 /interviews/sessions 경로로 호출한다', async () => {
      const { id } = await createSessionAction({
        title: '세션',
        role: 'interviewer',
      });
      vi.clearAllMocks();

      await deleteSessionAction(id);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/sessions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });
  });

  describe('createInvitationAction', () => {
    it('초대 코드를 생성하고 { inviteCode }를 반환한다', async () => {
      const { id: sessionId } = await createSessionAction({
        title: '초대 테스트 세션',
        role: 'interviewer',
      });

      const result = await createInvitationAction(sessionId, 'interviewee');

      expect(result.inviteCode).toBeDefined();
      expect(typeof result.inviteCode).toBe('string');
      expect(result.inviteCode.length).toBeGreaterThan(0);
    });

    it('생성된 초대가 DB에 저장된다', async () => {
      const { id: sessionId } = await createSessionAction({
        title: '초대 저장 테스트',
        role: 'interviewer',
      });

      const { inviteCode } = await createInvitationAction(sessionId, 'interviewee');

      const invitation = await getInvitationByCode(inviteCode);
      expect(invitation).not.toBeNull();
      expect(invitation!.sessionId).toBe(sessionId);
      expect(invitation!.role).toBe('interviewee');
      expect(invitation!.status).toBe('pending');
    });
  });

  describe('acceptInvitationAction', () => {
    it('초대를 수락하고 { sessionId }를 반환한다', async () => {
      const { id: sessionId } = await createSessionAction({
        title: '수락 테스트 세션',
        role: 'interviewer',
      });
      const { inviteCode } = await createInvitationAction(sessionId, 'interviewee');

      // Simulate a different user accepting
      const secondUserId = 'second-user';
      await db
        .insert(users)
        .values({ id: secondUserId, name: 'Second User', email: 'second@test.com' })
        .onConflictDoNothing();

      // Mock getCurrentUserId to return the second user
      const { getCurrentUserId } = await import('@/lib/auth');
      vi.mocked(getCurrentUserId).mockResolvedValueOnce(secondUserId);

      const result = await acceptInvitationAction(inviteCode);

      expect(result.sessionId).toBe(sessionId);
    });

    it('revalidatePath를 /interviews/sessions 경로로 호출한다', async () => {
      const { id: sessionId } = await createSessionAction({
        title: '수락 revalidate 테스트',
        role: 'interviewer',
      });
      const { inviteCode } = await createInvitationAction(sessionId, 'reviewer');

      const thirdUserId = 'third-user';
      await db
        .insert(users)
        .values({ id: thirdUserId, name: 'Third User', email: 'third@test.com' })
        .onConflictDoNothing();

      const { getCurrentUserId } = await import('@/lib/auth');
      vi.mocked(getCurrentUserId).mockResolvedValueOnce(thirdUserId);
      vi.clearAllMocks();

      await acceptInvitationAction(inviteCode);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/sessions');
    });
  });
});
