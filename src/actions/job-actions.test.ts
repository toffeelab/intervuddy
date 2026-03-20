import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { getAllJobs, getJobById, softDeleteJobWithQuestions } from '@/data-access/jobs';
import { getLibraryQuestions } from '@/data-access/questions';
import * as schema from '@/db/schema';
import { interviewQuestions } from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestJobDescription,
  seedTestQuestions,
  truncateAllTables,
} from '@/test/helpers/db';
import {
  createJobAction,
  updateJobAction,
  updateJobStatusAction,
  deleteJobAction,
  restoreJobAction,
} from './job-actions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

describe('job-actions', () => {
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

  describe('createJobAction', () => {
    it('JD 생성 후 id 반환 + revalidate', async () => {
      const result = await createJobAction({
        companyName: '카카오',
        positionTitle: '프론트엔드',
      });
      expect(result.id).toBeGreaterThan(0);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');

      const job = await getJobById(result.id);
      expect(job).not.toBeNull();
      expect(job!.companyName).toBe('카카오');
    });
  });

  describe('updateJobAction', () => {
    it('JD 수정 + revalidate 2회', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs();
      await updateJobAction({ id: jobs[0].id, companyName: '라인' });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/interviews/jobs/${jobs[0].id}`);
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
      const updated = await getJobById(jobs[0].id);
      expect(updated!.companyName).toBe('라인');
    });
  });

  describe('updateJobStatusAction', () => {
    it('상태 변경 + revalidate 2회', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs();
      await updateJobStatusAction(jobs[0].id, 'completed');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/interviews/jobs/${jobs[0].id}`);
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
      const updated = await getJobById(jobs[0].id);
      expect(updated!.status).toBe('completed');
    });
  });

  describe('deleteJobAction', () => {
    it('소프트 삭제 + revalidate', async () => {
      await seedTestJobDescription(db);
      const jobs = await getAllJobs();
      await deleteJobAction(jobs[0].id);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(await getAllJobs()).toHaveLength(0);
    });
  });

  describe('restoreJobAction', () => {
    it('JD + 하위 질문 복구 + revalidate', async () => {
      await seedTestQuestions(db);
      await seedTestJobDescription(db);
      const questions = await getLibraryQuestions();
      const jobs = await getAllJobs();

      // Assign question to JD
      await db
        .update(interviewQuestions)
        .set({ jdId: jobs[0].id })
        .where(eq(interviewQuestions.id, questions[0].id));

      await softDeleteJobWithQuestions(jobs[0].id);
      expect(await getAllJobs()).toHaveLength(0);

      await restoreJobAction(jobs[0].id);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
      expect(await getAllJobs()).toHaveLength(1);
    });
  });
});
