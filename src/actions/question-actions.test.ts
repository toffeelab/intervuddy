import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLibraryQuestions, getDeletedQuestions } from '@/data-access/questions';
import {
  createTestDb,
  cleanupTestDb,
  seedTestCategories,
  seedTestQuestions,
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
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('createQuestionAction', () => {
    it('질문을 생성하고 { id }를 반환한다', async () => {
      seedTestCategories(db);

      const result = await createQuestionAction({
        categoryId: 1,
        question: '새로운 질문입니다',
        answer: '새로운 답변입니다',
        tip: '팁 내용',
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it('생성된 질문이 DB에 실제로 저장된다', async () => {
      seedTestCategories(db);

      await createQuestionAction({
        categoryId: 1,
        question: '저장 확인용 질문',
        answer: '저장 확인용 답변',
      });

      const questions = getLibraryQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('저장 확인용 질문');
      expect(questions[0].answer).toBe('저장 확인용 답변');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      seedTestCategories(db);

      await createQuestionAction({
        categoryId: 1,
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
      seedTestQuestions(db);

      await updateQuestionAction({ id: 1, answer: '수정된 답변' });

      const questions = getLibraryQuestions();
      expect(questions[0].answer).toBe('수정된 답변');
      expect(questions[0].question).toBe('자기소개를 해주세요');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      seedTestQuestions(db);

      await updateQuestionAction({ id: 1, question: '수정된 질문' });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteQuestionAction', () => {
    it('질문을 소프트 삭제한다', async () => {
      seedTestQuestions(db);

      await deleteQuestionAction(1);

      expect(getLibraryQuestions()).toHaveLength(0);
      const deleted = getDeletedQuestions();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].question).toBe('자기소개를 해주세요');
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      seedTestQuestions(db);

      await deleteQuestionAction(1);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });

  describe('restoreQuestionAction', () => {
    it('소프트 삭제된 질문을 복원한다', async () => {
      seedTestQuestions(db);
      db.exec(`UPDATE interview_questions SET deleted_at = datetime('now') WHERE id = 1`);
      expect(getLibraryQuestions()).toHaveLength(0);

      await restoreQuestionAction(1);

      expect(getLibraryQuestions()).toHaveLength(1);
      expect(getDeletedQuestions()).toHaveLength(0);
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      seedTestQuestions(db);
      db.exec(`UPDATE interview_questions SET deleted_at = datetime('now') WHERE id = 1`);

      await restoreQuestionAction(1);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateQuestionKeywordsAction', () => {
    it('질문의 키워드를 새 목록으로 교체한다', async () => {
      seedTestQuestions(db);
      // seedTestQuestions는 ['자기소개', '경력'] 키워드를 삽입

      await updateQuestionKeywordsAction(1, ['소통', '리더십']);

      const questions = getLibraryQuestions();
      expect(questions[0].keywords).toHaveLength(2);
      expect(questions[0].keywords).toEqual(expect.arrayContaining(['소통', '리더십']));
      expect(questions[0].keywords).not.toContain('자기소개');
    });

    it('빈 배열로 업데이트하면 모든 키워드가 삭제된다', async () => {
      seedTestQuestions(db);

      await updateQuestionKeywordsAction(1, []);

      const questions = getLibraryQuestions();
      expect(questions[0].keywords).toEqual([]);
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      seedTestQuestions(db);

      await updateQuestionKeywordsAction(1, ['키워드']);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });
});
