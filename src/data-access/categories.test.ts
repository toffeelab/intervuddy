import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { DEFAULT_USER_ID } from '@/db/constants';
import * as schema from '@/db/schema';
import { interviewCategories, interviewQuestions, jobDescriptions } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestCategories,
  seedTestJobDescription,
  truncateAllTables,
} from '@/test/helpers/db';
import {
  getGlobalCategories,
  getCategoriesByJdId,
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
} from './categories';

describe('categories data-access', () => {
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

  describe('getGlobalCategories', () => {
    it('빈 DB에서 빈 배열을 반환한다', async () => {
      expect(await getGlobalCategories(DEFAULT_USER_ID)).toEqual([]);
    });

    it('글로벌 카테고리(jd_id IS NULL)만 반환한다', async () => {
      await seedTestCategories(db);
      const categories = await getGlobalCategories(DEFAULT_USER_ID);
      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('자기소개/커리어');
      expect(categories[1].name).toBe('기술역량');
    });

    it('display_order 순으로 정렬된다', async () => {
      await seedTestCategories(db);
      const categories = await getGlobalCategories(DEFAULT_USER_ID);
      expect(categories[0].displayOrder).toBe(1);
      expect(categories[1].displayOrder).toBe(2);
    });

    it('삭제된 카테고리는 제외한다', async () => {
      await seedTestCategories(db);
      const all = await getGlobalCategories(DEFAULT_USER_ID);
      await softDeleteCategory(DEFAULT_USER_ID, all[0].id);
      const categories = await getGlobalCategories(DEFAULT_USER_ID);
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('기술역량');
    });

    it('questionCount를 포함한다', async () => {
      await seedTestCategories(db);
      const cats = await getGlobalCategories(DEFAULT_USER_ID);
      const catId = cats[0].id;
      await db.insert(interviewQuestions).values([
        {
          userId: DEFAULT_USER_ID,
          categoryId: catId,
          question: 'Q1',
          answer: 'A1',
          displayOrder: 1,
        },
        {
          userId: DEFAULT_USER_ID,
          categoryId: catId,
          question: 'Q2',
          answer: 'A2',
          displayOrder: 2,
        },
      ]);
      const categories = await getGlobalCategories(DEFAULT_USER_ID);
      expect(categories[0].questionCount).toBe(2);
      expect(categories[1].questionCount).toBe(0);
    });

    it('JD 카테고리는 포함하지 않는다', async () => {
      await seedTestCategories(db);
      await seedTestJobDescription(db);
      const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);
      await db.insert(interviewCategories).values({
        userId: DEFAULT_USER_ID,
        jdId: jobs[0].id,
        name: 'JD카테고리',
        slug: 'jd-cat',
        displayLabel: 'JD',
        icon: '📋',
        displayOrder: 1,
      });
      const categories = await getGlobalCategories(DEFAULT_USER_ID);
      expect(categories).toHaveLength(2);
    });
  });

  describe('getCategoriesByJdId', () => {
    it('글로벌 + JD별 카테고리를 모두 반환한다', async () => {
      await seedTestCategories(db);
      await seedTestJobDescription(db);
      const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);
      const jdId = jobs[0].id;
      await db.insert(interviewCategories).values({
        userId: DEFAULT_USER_ID,
        jdId,
        name: 'JD카테고리',
        slug: 'jd-cat',
        displayLabel: 'JD',
        icon: '📋',
        displayOrder: 3,
      });
      const categories = await getCategoriesByJdId(DEFAULT_USER_ID, jdId);
      expect(categories).toHaveLength(3);
    });

    it('다른 JD의 카테고리는 포함하지 않는다', async () => {
      await seedTestCategories(db);
      await seedTestJobDescription(db);
      // Insert second job
      await db.insert(jobDescriptions).values({
        userId: DEFAULT_USER_ID,
        companyName: '카카오',
        positionTitle: '백엔드',
        status: 'in_progress',
      });
      const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);
      const [jd1, jd2] = jobs;
      await db.insert(interviewCategories).values([
        {
          userId: DEFAULT_USER_ID,
          jdId: jd1.id,
          name: 'JD1카테고리',
          slug: 'jd1-cat',
          displayLabel: 'JD1',
          icon: '📋',
          displayOrder: 3,
        },
        {
          userId: DEFAULT_USER_ID,
          jdId: jd2.id,
          name: 'JD2카테고리',
          slug: 'jd2-cat',
          displayLabel: 'JD2',
          icon: '📋',
          displayOrder: 3,
        },
      ]);
      const categories = await getCategoriesByJdId(DEFAULT_USER_ID, jd1.id);
      expect(categories.map((c) => c.name)).not.toContain('JD2카테고리');
    });
  });

  describe('createCategory', () => {
    it('글로벌 카테고리를 생성하고 id를 반환한다', async () => {
      const id = await createCategory(DEFAULT_USER_ID, {
        name: '새 카테고리',
        slug: 'new-cat',
        displayLabel: '새 카테고리',
        icon: '🆕',
      });
      expect(id).toBeGreaterThan(0);
      const categories = await getGlobalCategories(DEFAULT_USER_ID);
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('새 카테고리');
    });

    it('JD 카테고리를 생성할 수 있다', async () => {
      await seedTestJobDescription(db);
      const jobs = await db.select({ id: jobDescriptions.id }).from(jobDescriptions);
      const id = await createCategory(DEFAULT_USER_ID, {
        jdId: jobs[0].id,
        name: 'JD 카테고리',
        slug: 'jd-cat',
        displayLabel: 'JD',
        icon: '📋',
      });
      expect(id).toBeGreaterThan(0);
    });
  });

  describe('updateCategory', () => {
    it('카테고리를 부분 수정할 수 있다', async () => {
      await seedTestCategories(db);
      const cats = await getGlobalCategories(DEFAULT_USER_ID);
      await updateCategory(DEFAULT_USER_ID, cats[0].id, { displayLabel: '수정된 라벨' });
      const categories = await getGlobalCategories(DEFAULT_USER_ID);
      expect(categories[0].displayLabel).toBe('수정된 라벨');
      expect(categories[0].name).toBe('자기소개/커리어');
    });
  });

  describe('softDeleteCategory / restoreCategory', () => {
    it('소프트 삭제 후 복원할 수 있다', async () => {
      await seedTestCategories(db);
      const cats = await getGlobalCategories(DEFAULT_USER_ID);
      await softDeleteCategory(DEFAULT_USER_ID, cats[0].id);
      expect(await getGlobalCategories(DEFAULT_USER_ID)).toHaveLength(1);

      await restoreCategory(DEFAULT_USER_ID, cats[0].id);
      expect(await getGlobalCategories(DEFAULT_USER_ID)).toHaveLength(2);
    });
  });
});
