import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { createAuthState, TEST_USER_A, TEST_USER_B } from './fixtures/auth';
import { seedE2EData, getE2EDbUrl } from './fixtures/seed';

export default async function globalSetup() {
  // 1. 마이그레이션 실행
  const pool = new Pool({ connectionString: getE2EDbUrl() });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  await pool.end();

  // 2. 시드 데이터 삽입
  await seedE2EData();

  // 3. 인증 storageState 생성
  await createAuthState(TEST_USER_A);
  await createAuthState(TEST_USER_B);
}
