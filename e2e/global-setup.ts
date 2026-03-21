import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { createAuthState, TEST_USER_A, TEST_USER_B } from './fixtures/auth';
import { seedE2EData, getE2EDbUrl } from './fixtures/seed';

export default async function globalSetup() {
  // .env.local에서 AUTH_SECRET 등 환경변수를 로드하여 dev 서버와 동일한 값 사용
  dotenv.config({ path: '.env.local' });
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
