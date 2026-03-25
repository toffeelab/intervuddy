import { DEFAULT_USER_ID, SYSTEM_USER_ID } from '@intervuddy/shared';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Database } from '../connection';
import * as schema from '../schema';
import {
  interviewCategories,
  interviewQuestions,
  followupQuestions,
  jobDescriptions,
  interviewSessions,
} from '../schema';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/intervuddy_test') ??
  'postgresql://intervuddy:intervuddy@localhost:5433/intervuddy_test';

// Singleton pool shared across all test files in the same process
let _sharedPool: Pool | null = null;
let _sharedDb: NodePgDatabase<typeof schema> | null = null;

function getSharedPool(): Pool {
  if (!_sharedPool) {
    _sharedPool = new Pool({
      connectionString: TEST_DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return _sharedPool;
}

function getSharedDb(): NodePgDatabase<typeof schema> {
  if (!_sharedDb) {
    _sharedDb = drizzle(getSharedPool(), { schema });
  }
  return _sharedDb;
}

/**
 * Optional callback: when set, createTestDb() will call it to inject
 * the test DB instance into the app-level wrapper (e.g., apps/web's setDb).
 */
let _onCreateTestDb: ((db: Database) => void) | null = null;
let _onCloseTestPool: (() => void) | null = null;

export function registerTestDbCallbacks(callbacks: {
  onSetDb?: (db: Database) => void;
  onResetDb?: () => void;
}) {
  _onCreateTestDb = callbacks.onSetDb ?? null;
  _onCloseTestPool = callbacks.onResetDb ?? null;
}

export async function createTestDb(): Promise<NodePgDatabase<typeof schema>> {
  const db = getSharedDb();
  if (_onCreateTestDb) _onCreateTestDb(db as Database);
  // Note: users are seeded inside truncateAllTables, not here,
  // to avoid concurrent INSERT conflicts with other test files' beforeEach calls.
  return db;
}

export async function cleanupTestDb(): Promise<void> {
  // Do NOT end the pool — it's shared across all test files in singleFork mode.
  // Keep the db reference active so subsequent test files can use getDb().
  // The global-teardown.ts will call closeTestPool() after all tests complete.
}

export async function truncateAllTables(_db: NodePgDatabase<typeof schema>): Promise<void> {
  // Use a PostgreSQL session-level advisory lock to serialize cleanup across concurrent
  // test file setups. Even with singleFork: true, Vitest may overlap beforeAll/beforeEach
  // across test files. The lock ensures only one cleanup + reseed runs at a time,
  // preventing FK violations and duplicate key errors from interleaved operations.
  const pool = getSharedPool();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(12345678)');
    await client.query('DELETE FROM session_feedbacks');
    await client.query('DELETE FROM session_answers');
    await client.query('DELETE FROM session_questions');
    await client.query('DELETE FROM session_invitations');
    await client.query('DELETE FROM session_participants');
    await client.query('DELETE FROM interview_sessions');
    await client.query('DELETE FROM followup_questions');
    await client.query('DELETE FROM interview_questions');
    await client.query('DELETE FROM interview_categories');
    await client.query('DELETE FROM job_descriptions');
    await client.query('DELETE FROM accounts');
    await client.query('DELETE FROM verification_tokens');
    await client.query('DELETE FROM users');
    await client.query(
      'INSERT INTO users (id, name, email) VALUES ($1, $2, $3), ($4, $5, $6) ON CONFLICT DO NOTHING',
      [
        SYSTEM_USER_ID,
        'System',
        'system@intervuddy.internal',
        DEFAULT_USER_ID,
        'Local User',
        'local@intervuddy.internal',
      ]
    );
    await client.query('SELECT pg_advisory_unlock(12345678)');
  } finally {
    client.release();
  }
}

export async function seedTestCategories(db: NodePgDatabase<typeof schema>): Promise<void> {
  await db.insert(interviewCategories).values([
    {
      userId: DEFAULT_USER_ID,
      name: '자기소개/커리어',
      slug: 'self-intro',
      displayLabel: '자기소개',
      icon: '👤',
      displayOrder: 1,
    },
    {
      userId: DEFAULT_USER_ID,
      name: '기술역량',
      slug: 'tech',
      displayLabel: '기술',
      icon: '⚙️',
      displayOrder: 2,
    },
  ]);
}

export async function seedTestQuestions(db: NodePgDatabase<typeof schema>): Promise<void> {
  await seedTestCategories(db);

  const cats = await db
    .select({ id: interviewCategories.id, name: interviewCategories.name })
    .from(interviewCategories);

  const selfIntroCat = cats.find((c) => c.name === '자기소개/커리어');
  if (!selfIntroCat) throw new Error('자기소개/커리어 category not found');

  const [question] = await db
    .insert(interviewQuestions)
    .values({
      userId: DEFAULT_USER_ID,
      categoryId: selfIntroCat.id,
      question: '자기소개를 해주세요',
      answer: '저는 5년차 개발자입니다',
      tip: '구체적 수치를 포함하세요',
      keywords: ['자기소개', '경력'],
      displayOrder: 1,
    })
    .returning({ id: interviewQuestions.id });

  await db.insert(followupQuestions).values({
    userId: DEFAULT_USER_ID,
    questionId: question.id,
    question: '가장 어려웠던 프로젝트는?',
    answer: '실시간 통신 시스템 구축',
    displayOrder: 1,
  });
}

export async function seedTestJobDescription(db: NodePgDatabase<typeof schema>): Promise<void> {
  await db.insert(jobDescriptions).values({
    userId: DEFAULT_USER_ID,
    companyName: '네이버',
    positionTitle: '프론트엔드 시니어',
    status: 'in_progress',
    memo: '웹 플랫폼팀',
  });
}

export async function seedTestSession(db: NodePgDatabase<typeof schema>): Promise<void> {
  await db.insert(interviewSessions).values({
    title: '모의면접 테스트 세션',
    status: 'waiting',
    createdBy: DEFAULT_USER_ID,
    qaOwnerId: DEFAULT_USER_ID,
  });
}

/** Close the shared pool. Call this in a global teardown if needed. */
export async function closeTestPool(): Promise<void> {
  if (_sharedPool) {
    await _sharedPool.end();
    _sharedPool = null;
    _sharedDb = null;
  }
  if (_onCloseTestPool) _onCloseTestPool();
}
