import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { getFollowupsByQuestionId } from '@/data-access/followups';
import { getLibraryQuestions } from '@/data-access/questions';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { followupQuestions } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  truncateAllTables,
} from '@/test/helpers/db';
import {
  createFollowupAction,
  updateFollowupAction,
  deleteFollowupAction,
  restoreFollowupAction,
} from './followup-actions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue(DEFAULT_USER_ID),
}));

describe('followup-actions', () => {
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
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('createFollowupAction', () => {
    it('꼬리질문을 생성하고 { id }를 반환한다', async () => {
      const result = await createFollowupAction({
        questionId,
        question: '새 꼬리질문',
        answer: '새 꼬리답변',
      });

      expect(result.id).toBeDefined();
    });

    it('생성된 꼬리질문이 DB에 실제로 저장된다', async () => {
      await createFollowupAction({
        questionId,
        question: '저장 확인용 꼬리질문',
        answer: '저장 확인용 꼬리답변',
      });

      // seedTestQuestions가 이미 꼬리질문 1개를 삽입했으므로 총 2개
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      expect(followups).toHaveLength(2);
      const created = followups.find((f) => f.question === '저장 확인용 꼬리질문');
      expect(created).toBeDefined();
      expect(created?.answer).toBe('저장 확인용 꼬리답변');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await createFollowupAction({
        questionId,
        question: '꼬리질문',
        answer: '꼬리답변',
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateFollowupAction', () => {
    it('꼬리질문 내용을 수정한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      await updateFollowupAction({ id: followups[0].id, answer: '수정된 꼬리답변' });

      const updated = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      expect(updated[0].answer).toBe('수정된 꼬리답변');
      expect(updated[0].question).toBe('가장 어려웠던 프로젝트는?');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      await updateFollowupAction({ id: followups[0].id, question: '수정된 꼬리질문' });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteFollowupAction', () => {
    it('꼬리질문을 소프트 삭제한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      await deleteFollowupAction(followups[0].id);

      expect(await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId)).toHaveLength(0);
    });

    it('삭제 후 deleted_at이 설정된다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      const fId = followups[0].id;
      await deleteFollowupAction(fId);

      const rows = await db
        .select({ deletedAt: followupQuestions.deletedAt })
        .from(followupQuestions)
        .where(eq(followupQuestions.id, fId));
      expect(rows[0].deletedAt).not.toBeNull();
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      await deleteFollowupAction(followups[0].id);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });

  describe('restoreFollowupAction', () => {
    it('소프트 삭제된 꼬리질문을 복원한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      const fId = followups[0].id;
      await db
        .update(followupQuestions)
        .set({ deletedAt: new Date() })
        .where(eq(followupQuestions.id, fId));
      expect(await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId)).toHaveLength(0);

      await restoreFollowupAction(fId);

      expect(await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId)).toHaveLength(1);
    });

    it('복원 후 deleted_at이 NULL로 돌아온다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      const fId = followups[0].id;
      await db
        .update(followupQuestions)
        .set({ deletedAt: new Date() })
        .where(eq(followupQuestions.id, fId));

      await restoreFollowupAction(fId);

      const rows = await db
        .select({ deletedAt: followupQuestions.deletedAt })
        .from(followupQuestions)
        .where(eq(followupQuestions.id, fId));
      expect(rows[0].deletedAt).toBeNull();
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      const followups = await getFollowupsByQuestionId(DEFAULT_USER_ID, questionId);
      const fId = followups[0].id;
      await db
        .update(followupQuestions)
        .set({ deletedAt: new Date() })
        .where(eq(followupQuestions.id, fId));

      await restoreFollowupAction(fId);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });
});
