import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestQuestions } from '@/test/helpers/db';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
import {
  createFollowupAction,
  updateFollowupAction,
  deleteFollowupAction,
  restoreFollowupAction,
} from './followup-actions';
import { getFollowupsByQuestionId } from '@/data-access/followups';

describe('followup-actions', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestQuestions(db);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('createFollowupAction', () => {
    it('꼬리질문을 생성하고 { id }를 반환한다', async () => {
      const result = await createFollowupAction({
        questionId: 1,
        question: '새 꼬리질문',
        answer: '새 꼬리답변',
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it('생성된 꼬리질문이 DB에 실제로 저장된다', async () => {
      await createFollowupAction({
        questionId: 1,
        question: '저장 확인용 꼬리질문',
        answer: '저장 확인용 꼬리답변',
      });

      // seedTestQuestions가 이미 꼬리질문 1개를 삽입했으므로 총 2개
      const followups = getFollowupsByQuestionId(1);
      expect(followups).toHaveLength(2);
      const created = followups.find((f) => f.question === '저장 확인용 꼬리질문');
      expect(created).toBeDefined();
      expect(created?.answer).toBe('저장 확인용 꼬리답변');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await createFollowupAction({
        questionId: 1,
        question: '꼬리질문',
        answer: '꼬리답변',
      });

      expect(revalidatePath).toHaveBeenCalledWith('/study');
      expect(revalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateFollowupAction', () => {
    it('꼬리질문 내용을 수정한다', async () => {
      await updateFollowupAction({ id: 1, answer: '수정된 꼬리답변' });

      const followups = getFollowupsByQuestionId(1);
      expect(followups[0].answer).toBe('수정된 꼬리답변');
      expect(followups[0].question).toBe('가장 어려웠던 프로젝트는?');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await updateFollowupAction({ id: 1, question: '수정된 꼬리질문' });

      expect(revalidatePath).toHaveBeenCalledWith('/study');
      expect(revalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteFollowupAction', () => {
    it('꼬리질문을 소프트 삭제한다', async () => {
      await deleteFollowupAction(1);

      expect(getFollowupsByQuestionId(1)).toHaveLength(0);
    });

    it('삭제 후 deleted_at이 설정된다', async () => {
      await deleteFollowupAction(1);

      interface FollowupDeletedRow { deleted_at: string | null }
      const row = db
        .prepare('SELECT deleted_at FROM followup_questions WHERE id = ?')
        .get(1) as FollowupDeletedRow;
      expect(row.deleted_at).not.toBeNull();
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await deleteFollowupAction(1);

      expect(revalidatePath).toHaveBeenCalledWith('/study');
      expect(revalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('restoreFollowupAction', () => {
    it('소프트 삭제된 꼬리질문을 복원한다', async () => {
      db.exec(`UPDATE followup_questions SET deleted_at = datetime('now') WHERE id = 1`);
      expect(getFollowupsByQuestionId(1)).toHaveLength(0);

      await restoreFollowupAction(1);

      expect(getFollowupsByQuestionId(1)).toHaveLength(1);
    });

    it('복원 후 deleted_at이 NULL로 돌아온다', async () => {
      db.exec(`UPDATE followup_questions SET deleted_at = datetime('now') WHERE id = 1`);

      await restoreFollowupAction(1);

      interface FollowupDeletedRow { deleted_at: string | null }
      const row = db
        .prepare('SELECT deleted_at FROM followup_questions WHERE id = ?')
        .get(1) as FollowupDeletedRow;
      expect(row.deleted_at).toBeNull();
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      db.exec(`UPDATE followup_questions SET deleted_at = datetime('now') WHERE id = 1`);

      await restoreFollowupAction(1);

      expect(revalidatePath).toHaveBeenCalledWith('/study');
      expect(revalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });
  });
});
