import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { interviewCategories, interviewQuestions, jobDescriptions } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestCategories,
  seedTestQuestions,
  seedTestJobDescription,
  truncateAllTables,
} from '@/test/helpers/db';
import {
  getLibraryQuestions,
  getQuestionsByJdId,
  getQuestionsByCategory,
  createQuestion,
  updateQuestion,
  updateQuestionKeywords,
  softDeleteQuestion,
  restoreQuestion,
  getDeletedQuestions,
} from './questions';

describe('questions data-access', () => {
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

  describe('getLibraryQuestions', () => {
    it('빈 DB에서 빈 배열을 반환한다', async () => {
      expect(await getLibraryQuestions()).toEqual([]);
    });

    it('라이브러리 질문(jd_id IS NULL)을 반환한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('자기소개를 해주세요');
    });

    it('키워드를 포함한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      expect(questions[0].keywords).toEqual(expect.arrayContaining(['자기소개', '경력']));
    });

    it('꼬리질문을 포함한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      expect(questions[0].followups).toHaveLength(1);
      expect(questions[0].followups[0].question).toBe('가장 어려웠던 프로젝트는?');
    });

    it('카테고리 정보를 포함한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      expect(questions[0].categoryName).toBe('자기소개/커리어');
      expect(questions[0].categorySlug).toBe('self-intro');
    });

    it('삭제된 질문은 제외한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await softDeleteQuestion(questions[0].id);
      expect(await getLibraryQuestions()).toEqual([]);
    });
  });

  describe('getQuestionsByJdId', () => {
    it('JD에 속한 질문을 반환한다', async () => {
      await seedTestCategories(db);
      await seedTestJobDescription(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);
      await db.insert(interviewQuestions).values({
        userId: DEFAULT_USER_ID,
        categoryId: cats[0].id,
        jdId: jobs[0].id,
        question: 'JD 질문',
        answer: 'JD 답변',
        displayOrder: 1,
      });
      const questions = await getQuestionsByJdId(jobs[0].id);
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('JD 질문');
      expect(questions[0].jdId).toBe(jobs[0].id);
    });
  });

  describe('getQuestionsByCategory', () => {
    it('카테고리별 질문을 반환한다', async () => {
      await seedTestQuestions(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      const questions = await getQuestionsByCategory(cats[0].id);
      expect(questions).toHaveLength(1);
      expect(questions[0].categoryId).toBe(cats[0].id);
    });

    it('다른 카테고리의 질문은 포함하지 않는다', async () => {
      await seedTestQuestions(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      // cats[1] is 기술역량 which has no questions
      const questions = await getQuestionsByCategory(cats[1].id);
      expect(questions).toEqual([]);
    });
  });

  describe('createQuestion', () => {
    it('질문을 생성하고 id를 반환한다', async () => {
      await seedTestCategories(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      const id = await createQuestion({
        categoryId: cats[0].id,
        question: '새 질문',
        answer: '새 답변',
        tip: '팁',
      });
      expect(id).toBeGreaterThan(0);
      const questions = await getLibraryQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('새 질문');
      expect(questions[0].tip).toBe('팁');
    });

    it('JD 질문을 생성할 수 있다', async () => {
      await seedTestCategories(db);
      await seedTestJobDescription(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);
      const id = await createQuestion({
        categoryId: cats[0].id,
        jdId: jobs[0].id,
        question: 'JD 질문',
        answer: 'JD 답변',
      });
      expect(id).toBeGreaterThan(0);
      const questions = await getQuestionsByJdId(jobs[0].id);
      expect(questions).toHaveLength(1);
    });
  });

  describe('updateQuestion', () => {
    it('질문을 부분 수정할 수 있다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await updateQuestion({ id: questions[0].id, answer: '수정된 답변' });
      const updated = await getLibraryQuestions();
      expect(updated[0].answer).toBe('수정된 답변');
      expect(updated[0].question).toBe('자기소개를 해주세요');
    });
  });

  describe('updateQuestion - categoryId 변경 불가', () => {
    it('categoryId를 전달해도 무시된다 (display_order 보호)', async () => {
      await seedTestQuestions(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      const [cat1, cat2] = cats;
      const questions = await getLibraryQuestions();

      await updateQuestion({ id: questions[0].id, categoryId: cat2.id });

      // categoryId는 변경되지 않음
      expect(await getQuestionsByCategory(cat1.id)).toHaveLength(1);
      expect(await getQuestionsByCategory(cat2.id)).toHaveLength(0);
    });

    it('categoryId 무시 시에도 다른 필드는 정상 수정된다', async () => {
      await seedTestQuestions(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      const [cat1, cat2] = cats;
      const questions = await getLibraryQuestions();
      await updateQuestion({ id: questions[0].id, categoryId: cat2.id, answer: '수정된 답변' });
      const updated = await getQuestionsByCategory(cat1.id);
      expect(updated).toHaveLength(1);
      expect(updated[0].answer).toBe('수정된 답변');
      expect(updated[0].categoryId).toBe(cat1.id); // 변경되지 않음
    });
  });

  describe('updateQuestionKeywords', () => {
    it('기존 키워드를 새 키워드 목록으로 교체한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await updateQuestionKeywords(questions[0].id, ['소통', '리더십', '성장']);
      const updated = await getLibraryQuestions();
      expect(updated[0].keywords).toHaveLength(3);
      expect(updated[0].keywords).toEqual(expect.arrayContaining(['소통', '리더십', '성장']));
      expect(updated[0].keywords).not.toContain('자기소개');
    });

    it('빈 배열로 업데이트하면 키워드가 모두 삭제된다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await updateQuestionKeywords(questions[0].id, []);
      const updated = await getLibraryQuestions();
      expect(updated[0].keywords).toEqual([]);
    });

    it('키워드 변경 결과가 getLibraryQuestions()에 반영된다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await updateQuestionKeywords(questions[0].id, ['신규키워드']);
      const updated = await getLibraryQuestions();
      expect(updated[0].keywords).toEqual(['신규키워드']);
    });
  });

  describe('softDeleteQuestion / restoreQuestion', () => {
    it('소프트 삭제 후 복원할 수 있다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await softDeleteQuestion(questions[0].id);
      expect(await getLibraryQuestions()).toEqual([]);

      await restoreQuestion(questions[0].id);
      expect(await getLibraryQuestions()).toHaveLength(1);
    });
  });

  describe('getDeletedQuestions', () => {
    it('삭제된 질문을 반환한다', async () => {
      await seedTestQuestions(db);
      const questions = await getLibraryQuestions();
      await softDeleteQuestion(questions[0].id);
      const deleted = await getDeletedQuestions();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].question).toBe('자기소개를 해주세요');
    });

    it('jdId로 필터링할 수 있다', async () => {
      await seedTestCategories(db);
      await seedTestJobDescription(db);
      const cats = await db.select({ id: interviewCategories.id }).from(interviewCategories);
      const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);

      const [libQ] = await db
        .insert(interviewQuestions)
        .values({
          userId: DEFAULT_USER_ID,
          categoryId: cats[0].id,
          question: '라이브러리 질문',
          answer: '답변',
          displayOrder: 1,
        })
        .returning({ id: interviewQuestions.id });

      const [jdQ] = await db
        .insert(interviewQuestions)
        .values({
          userId: DEFAULT_USER_ID,
          categoryId: cats[0].id,
          jdId: jobs[0].id,
          question: 'JD 질문',
          answer: 'JD 답변',
          displayOrder: 2,
        })
        .returning({ id: interviewQuestions.id });

      await softDeleteQuestion(libQ.id);
      await softDeleteQuestion(jdQ.id);
      const deleted = await getDeletedQuestions(jobs[0].id);
      expect(deleted).toHaveLength(1);
      expect(deleted[0].jdId).toBe(jobs[0].id);
    });
  });
});
