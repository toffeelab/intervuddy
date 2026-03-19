import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGlobalCategories } from '@/data-access/categories';
import { createTestDb, cleanupTestDb, seedTestCategories } from '@/test/helpers/db';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  restoreCategoryAction,
} from './category-actions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

describe('category-actions', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  describe('createCategoryAction', () => {
    it('카테고리를 생성하고 { id }를 반환한다', async () => {
      const result = await createCategoryAction({
        name: '새 카테고리',
        slug: 'new-cat',
        displayLabel: '새 카테고리',
        icon: '🆕',
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it('생성된 카테고리가 DB에 실제로 저장된다', async () => {
      await createCategoryAction({
        name: '저장 확인 카테고리',
        slug: 'save-check',
        displayLabel: '저장 확인',
        icon: '✅',
      });

      const categories = getGlobalCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('저장 확인 카테고리');
      expect(categories[0].slug).toBe('save-check');
      expect(categories[0].displayLabel).toBe('저장 확인');
    });

    it('여러 번 생성 시 display_order가 순차적으로 증가한다', async () => {
      await createCategoryAction({
        name: '첫 번째 카테고리',
        slug: 'first',
        displayLabel: '첫번째',
        icon: '1️⃣',
      });
      await createCategoryAction({
        name: '두 번째 카테고리',
        slug: 'second',
        displayLabel: '두번째',
        icon: '2️⃣',
      });

      const categories = getGlobalCategories();
      expect(categories).toHaveLength(2);
      expect(categories[0].displayOrder).toBeLessThan(categories[1].displayOrder);
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      await createCategoryAction({
        name: '테스트',
        slug: 'test',
        displayLabel: '테스트',
        icon: '🧪',
      });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateCategoryAction', () => {
    it('카테고리 필드를 부분 수정한다', async () => {
      seedTestCategories(db);

      await updateCategoryAction(1, { displayLabel: '수정된 라벨' });

      const categories = getGlobalCategories();
      const updated = categories.find((c) => c.id === 1);
      expect(updated?.displayLabel).toBe('수정된 라벨');
      expect(updated?.name).toBe('자기소개/커리어');
    });

    it('여러 필드를 동시에 수정할 수 있다', async () => {
      seedTestCategories(db);

      await updateCategoryAction(1, { name: '수정된 이름', icon: '🔄' });

      const categories = getGlobalCategories();
      const updated = categories.find((c) => c.id === 1);
      expect(updated?.name).toBe('수정된 이름');
      expect(updated?.icon).toBe('🔄');
      expect(updated?.slug).toBe('self-intro');
    });

    it('revalidatePath를 /study와 /interviews/questions 경로로 호출한다', async () => {
      seedTestCategories(db);

      await updateCategoryAction(1, { name: '수정' });

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteCategoryAction', () => {
    it('카테고리를 소프트 삭제한다', async () => {
      seedTestCategories(db);
      expect(getGlobalCategories()).toHaveLength(2);

      await deleteCategoryAction(1);

      const categories = getGlobalCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('기술역량');
    });

    it('삭제 후 deleted_at이 설정된다', async () => {
      seedTestCategories(db);

      await deleteCategoryAction(1);

      interface CategoryDeletedRow {
        deleted_at: string | null;
      }
      const row = db
        .prepare('SELECT deleted_at FROM interview_categories WHERE id = ?')
        .get(1) as CategoryDeletedRow;
      expect(row.deleted_at).not.toBeNull();
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      seedTestCategories(db);

      await deleteCategoryAction(1);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });

  describe('restoreCategoryAction', () => {
    it('소프트 삭제된 카테고리를 복원한다', async () => {
      seedTestCategories(db);
      db.exec(`UPDATE interview_categories SET deleted_at = datetime('now') WHERE id = 1`);
      expect(getGlobalCategories()).toHaveLength(1);

      await restoreCategoryAction(1);

      expect(getGlobalCategories()).toHaveLength(2);
    });

    it('복원 후 deleted_at이 NULL로 돌아온다', async () => {
      seedTestCategories(db);
      db.exec(`UPDATE interview_categories SET deleted_at = datetime('now') WHERE id = 1`);

      await restoreCategoryAction(1);

      interface CategoryDeletedRow {
        deleted_at: string | null;
      }
      const row = db
        .prepare('SELECT deleted_at FROM interview_categories WHERE id = ?')
        .get(1) as CategoryDeletedRow;
      expect(row.deleted_at).toBeNull();
    });

    it('revalidatePath를 /study와 /interviews/questions, /interviews/trash 경로로 호출한다', async () => {
      seedTestCategories(db);
      db.exec(`UPDATE interview_categories SET deleted_at = datetime('now') WHERE id = 1`);

      await restoreCategoryAction(1);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/questions');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    });
  });
});
