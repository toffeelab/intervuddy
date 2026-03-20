import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import * as schema from '@/db/schema';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
  truncateAllTables,
} from '@/test/helpers/db';
import { importQuestionsToJob } from './import';
import { getAllJobs } from './jobs';
import { getQuestionsByJdId, getLibraryQuestions } from './questions';

describe('importQuestionsToJob', () => {
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

  it('라이브러리 질문을 JD로 복사 (질문 + 키워드 + 꼬리질문)', async () => {
    await seedTestQuestions(db);
    await seedTestJobDescription(db);

    const questions = await getLibraryQuestions();
    const jobs = await getAllJobs();

    const result = await importQuestionsToJob({ jdId: jobs[0].id, questionIds: [questions[0].id] });
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(0);

    const jdQuestions = await getQuestionsByJdId(jobs[0].id);
    expect(jdQuestions).toHaveLength(1);
    expect(jdQuestions[0].jdId).toBe(jobs[0].id);
    expect(jdQuestions[0].originQuestionId).toBe(questions[0].id);
    expect(jdQuestions[0].question).toBe('자기소개를 해주세요');
    expect(jdQuestions[0].keywords).toHaveLength(2);
    expect(jdQuestions[0].followups).toHaveLength(1);
  });

  it('이미 가져온 질문은 스킵', async () => {
    await seedTestQuestions(db);
    await seedTestJobDescription(db);
    const questions = await getLibraryQuestions();
    const jobs = await getAllJobs();

    await importQuestionsToJob({ jdId: jobs[0].id, questionIds: [questions[0].id] });
    const result = await importQuestionsToJob({ jdId: jobs[0].id, questionIds: [questions[0].id] });
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);

    expect(await getQuestionsByJdId(jobs[0].id)).toHaveLength(1);
  });

  it('존재하지 않는 questionId는 스킵', async () => {
    await seedTestQuestions(db);
    await seedTestJobDescription(db);
    const jobs = await getAllJobs();

    const result = await importQuestionsToJob({ jdId: jobs[0].id, questionIds: [999999] });
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('원본 질문의 category_id를 유지', async () => {
    await seedTestQuestions(db);
    await seedTestJobDescription(db);
    const questions = await getLibraryQuestions();
    const jobs = await getAllJobs();

    await importQuestionsToJob({ jdId: jobs[0].id, questionIds: [questions[0].id] });
    const jdQuestions = await getQuestionsByJdId(jobs[0].id);
    expect(jdQuestions[0].categoryId).toBe(questions[0].categoryId);
  });
});
