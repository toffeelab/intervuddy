import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { getLibraryQuestions, getDeletedQuestions } from '@/data-access/questions';
import * as schema from '@/db/schema';
import { interviewQuestions } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestCategories,
  seedTestQuestions,
  truncateAllTables,
} from '@/test/helpers/db';
import {
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  restoreQuestionAction,
  updateQuestionKeywordsAction,
} from './question-actions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

describe('question-actions', () => {
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

  describe('createQuestionAction', () => {
    it('질문을 생성하고 { id }를 반환한다', async () => {
      await seedTestCategories(db);
      const questions = await getLibraryQuestions();
      // Need a categoryId - get it from DB
      const { interviewCategories } = await import('@/db/schema');
      const { getDb } = await import('@/db');
      const cats = await getDb().select({ id: interviewCategories.id }).from(interviewCategories);

      const result = await createQuestionAction({
        categoryId: cats[0].id,
        question: '새로운 질문입니다',
        answer: '새로운 답변입니다',
        tip: '팁 내용',
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it('생성된 질문이 DB에 실제로 저장된다', async () => {
      await seedTestCategories(db);
      const { interviewCategories } = await import('@/db/schema');
      const { getDb } = await import('@/db');
      const cats = await getDb().select({ id: interviewCategories.id }).from(interviewCategories);

      await createQuestionAction({
        categoryId: cats[0].id,
        question: '저장 확인용 질문',
        answer: '저장 확인용 답변',
      });

      const questions = await getLibraryQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('저장 확인용 질문');
      expect(questions[0].answer).toBe('저장 확인용 답변');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await seedTestCategories(db);
      const { interviewCategories } = await import('@/db/schema');
      const { getDb } = await import('@/db');
      const cats = await getDb().select({ id: interviewCategories.id }).from(interviewCategories);

      await createQuestionAction({
        categoryId: cats[0].id,
        question: '질문',
        answer: '답변',
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateQuestionAction', () => {
    it('질문 내용을 수정한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();

      await updateQuestionAction({ id: questions[0].id, answer: '수정된 답변' });

      const updated = await getLibraryQuestions();
      expect(updated[0].answer).toBe('수정된 답변');
      expect(updated[0].question).toBe('자기소개를 해주세요');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();

      await updateQuestionAction({ id: questions[0].id, question: '수정된 질문' });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteQuestionAction', () => {
    it('질문을 소프트 삭제한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();

      await deleteQuestionAction(questions[0].id);

      expect(await getLibraryQuestions()).toHaveLength(0);
      const deleted = await getDeletedQuestions();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].question).toBe('자기소개를 해주세요');
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();

      await deleteQuestionAction(questions[0].id);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });

  describe('restoreQuestionAction', () => {
    it('소프트 삭제된 질문을 복원한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await db
        .update(interviewQuestions)
        .set({ deletedAt: new Date() })
        .where(eq(interviewQuestions.id, questions[0].id));
      expect(await getLibraryQuestions()).toHaveLength(0);

      await restoreQuestionAction(questions[0].id);

      expect(await getLibraryQuestions()).toHaveLength(1);
      expect(await getDeletedQuestions()).toHaveLength(0);
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await db
        .update(interviewQuestions)
        .set({ deletedAt: new Date() })
        .where(eq(interviewQuestions.id, questions[0].id));

      await restoreQuestionAction(questions[0].id);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateQuestionKeywordsAction', () => {
    it('질문의 키워드를 새 목록으로 교체한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();

      await updateQuestionKeywordsAction(questions[0].id, ['소통', '리더십']);

      const updated = await getLibraryQuestions();
      expect(updated[0].keywords).toHaveLength(2);
      expect(updated[0].keywords).toEqual(expect.arrayContaining(['소통', '리더십']));
      expect(updated[0].keywords).not.toContain('자기소개');
    });

    it('빈 배열로 업데이트하면 모든 키워드가 삭제된다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();

      await updateQuestionKeywordsAction(questions[0].id, []);

      const updated = await getLibraryQuestions();
      expect(updated[0].keywords).toEqual([]);
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();

      await updateQuestionKeywordsAction(questions[0].id, ['키워드']);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });
});
