import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { getAllJobs } from '@/data-access/jobs';
import { getQuestionsByJdId, getLibraryQuestions } from '@/data-access/questions';
import * as schema from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
  truncateAllTables,
} from '@/test/helpers/db';
import { importQuestionsAction } from './import-actions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

describe('importQuestionsAction', () => {
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

  it('질문 가져오기 + revalidate + 결과 반환', async () => {
    await seedTestQuestions(db);
    await seedTestJobDescription(db);

    const questions = await getLibraryQuestions();
    const jobs = await getAllJobs();

    const result = await importQuestionsAction({
      jdId: jobs[0].id,
      questionIds: [questions[0].id],
    });
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/interviews/jobs/${jobs[0].id}`);
    expect(await getQuestionsByJdId(jobs[0].id)).toHaveLength(1);
  });
});
