import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestCategories, seedTestJobDescription } from '@/test/helpers/db';
import {
  getGlobalCategories,
  getCategoriesByJdId,
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
} from './categories';

describe('categories data-access', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('getGlobalCategories', () => {
    it('빈 DB에서 빈 배열을 반환한다', () => {
      expect(getGlobalCategories()).toEqual([]);
    });

    it('글로벌 카테고리(jd_id IS NULL)만 반환한다', () => {
      seedTestCategories(db);
      const categories = getGlobalCategories();
      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('자기소개/커리어');
      expect(categories[1].name).toBe('기술역량');
    });

    it('display_order 순으로 정렬된다', () => {
      seedTestCategories(db);
      const categories = getGlobalCategories();
      expect(categories[0].displayOrder).toBe(1);
      expect(categories[1].displayOrder).toBe(2);
    });

    it('삭제된 카테고리는 제외한다', () => {
      seedTestCategories(db);
      softDeleteCategory(1);
      const categories = getGlobalCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('기술역량');
    });

    it('questionCount를 포함한다', () => {
      seedTestCategories(db);
      db.exec(`
        INSERT INTO interview_questions (category_id, question, answer, display_order)
        VALUES (1, 'Q1', 'A1', 1), (1, 'Q2', 'A2', 2);
      `);
      const categories = getGlobalCategories();
      expect(categories[0].questionCount).toBe(2);
      expect(categories[1].questionCount).toBe(0);
    });

    it('JD 카테고리는 포함하지 않는다', () => {
      seedTestCategories(db);
      seedTestJobDescription(db);
      db.exec(`
        INSERT INTO interview_categories (jd_id, name, slug, display_label, icon, display_order)
        VALUES (1, 'JD카테고리', 'jd-cat', 'JD', '📋', 1);
      `);
      const categories = getGlobalCategories();
      expect(categories).toHaveLength(2);
    });
  });

  describe('getCategoriesByJdId', () => {
    it('글로벌 + JD별 카테고리를 모두 반환한다', () => {
      seedTestCategories(db);
      seedTestJobDescription(db);
      db.exec(`
        INSERT INTO interview_categories (jd_id, name, slug, display_label, icon, display_order)
        VALUES (1, 'JD카테고리', 'jd-cat', 'JD', '📋', 3);
      `);
      const categories = getCategoriesByJdId(1);
      expect(categories).toHaveLength(3);
    });

    it('다른 JD의 카테고리는 포함하지 않는다', () => {
      seedTestCategories(db);
      seedTestJobDescription(db);
      db.exec(`
        INSERT INTO job_descriptions (company_name, position_title) VALUES ('카카오', '백엔드');
        INSERT INTO interview_categories (jd_id, name, slug, display_label, icon, display_order)
        VALUES (1, 'JD1카테고리', 'jd1-cat', 'JD1', '📋', 3);
        INSERT INTO interview_categories (jd_id, name, slug, display_label, icon, display_order)
        VALUES (2, 'JD2카테고리', 'jd2-cat', 'JD2', '📋', 3);
      `);
      const categories = getCategoriesByJdId(1);
      expect(categories.map((c) => c.name)).not.toContain('JD2카테고리');
    });
  });

  describe('createCategory', () => {
    it('글로벌 카테고리를 생성하고 id를 반환한다', () => {
      const id = createCategory({
        name: '새 카테고리',
        slug: 'new-cat',
        displayLabel: '새 카테고리',
        icon: '🆕',
      });
      expect(id).toBe(1);
      const categories = getGlobalCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('새 카테고리');
    });

    it('JD 카테고리를 생성할 수 있다', () => {
      seedTestJobDescription(db);
      const id = createCategory({
        jdId: 1,
        name: 'JD 카테고리',
        slug: 'jd-cat',
        displayLabel: 'JD',
        icon: '📋',
      });
      expect(id).toBeGreaterThan(0);
    });
  });

  describe('updateCategory', () => {
    it('카테고리를 부분 수정할 수 있다', () => {
      seedTestCategories(db);
      updateCategory(1, { displayLabel: '수정된 라벨' });
      const categories = getGlobalCategories();
      expect(categories[0].displayLabel).toBe('수정된 라벨');
      expect(categories[0].name).toBe('자기소개/커리어'); // 변경 안 됨
    });
  });

  describe('softDeleteCategory / restoreCategory', () => {
    it('소프트 삭제 후 복원할 수 있다', () => {
      seedTestCategories(db);
      softDeleteCategory(1);
      expect(getGlobalCategories()).toHaveLength(1);

      restoreCategory(1);
      expect(getGlobalCategories()).toHaveLength(2);
    });
  });
});
