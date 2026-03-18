import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAllJobs, getJobById } from '@/data-access/jobs';
import { createTestDb, cleanupTestDb, seedTestJobDescription } from '@/test/helpers/db';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
import {
  createJobAction,
  updateJobAction,
  updateJobStatusAction,
  deleteJobAction,
} from './job-actions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('createJobAction', () => {
  it('JD 생성 후 id 반환 + revalidate', async () => {
    const result = await createJobAction({
      companyName: '카카오',
      positionTitle: '프론트엔드',
    });
    expect(result.id).toBeGreaterThan(0);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');

    const job = getJobById(result.id);
    expect(job).not.toBeNull();
    expect(job!.companyName).toBe('카카오');
  });
});

describe('updateJobAction', () => {
  it('JD 수정 + revalidate 2회', async () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    await updateJobAction({ id: jobs[0].id, companyName: '라인' });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/interviews/jobs/${jobs[0].id}`);
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    const updated = getJobById(jobs[0].id);
    expect(updated!.companyName).toBe('라인');
  });
});

describe('updateJobStatusAction', () => {
  it('상태 변경 + revalidate 2회', async () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    await updateJobStatusAction(jobs[0].id, 'completed');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/interviews/jobs/${jobs[0].id}`);
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    const updated = getJobById(jobs[0].id);
    expect(updated!.status).toBe('completed');
  });
});

describe('deleteJobAction', () => {
  it('소프트 삭제 + revalidate', async () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    await deleteJobAction(jobs[0].id);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
    expect(getAllJobs()).toHaveLength(0);
  });
});
