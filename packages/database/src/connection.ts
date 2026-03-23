import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database 타입
export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Transaction 타입
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// Database 또는 Transaction (조합 가능한 함수용)
export type DbOrTx = Database | Transaction;

// 표준 pg Pool (NestJS, 로컬 개발, Docker, 테스트, 그리고 Vercel도)
export function createDb(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
