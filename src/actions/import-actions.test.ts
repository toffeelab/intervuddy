import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getQuestionsByJdId } from '@/data-access/questions';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import { importQuestionsAction } from './import-actions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('importQuestionsAction', () => {
  it('질문 가져오기 + revalidate + 결과 반환', async () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    const result = await importQuestionsAction({ jdId: 1, questionIds: [1] });
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/jobs/1');
    expect(getQuestionsByJdId(1)).toHaveLength(1);
  });
});
