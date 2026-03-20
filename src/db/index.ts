import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function ensureDb(): { db: NodePgDatabase<typeof schema>; pool: Pool } {
  if (!_db) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    _db = drizzle(_pool, { schema });
  }
  return { db: _db, pool: _pool! };
}

export function getPool(): Pool {
  return ensureDb().pool;
}

// 테스트 전용: 외부 DB 인스턴스 주입
let testDb: NodePgDatabase<typeof schema> | null = null;

export function getDb(): NodePgDatabase<typeof schema> {
  return testDb ?? ensureDb().db;
}

/**
 * 테스트 전용: 외부 DB 인스턴스 주입.
 * 테스트 헬퍼(src/test/helpers/db.ts)의 createTestDb()에서 호출.
 */
export function setDb(instance: NodePgDatabase<typeof schema>): void {
  testDb = instance;
}

/**
 * 테스트 전용: DB 인스턴스 초기화.
 * 테스트 종료 시 closeTestPool()에서 호출하여 프로덕션 DB와 격리.
 * 프로덕션 코드에서 호출하지 마세요.
 */
export function resetDb(): void {
  testDb = null;
  _db = null;
  _pool = null;
}

// 하위 호환: 기존 `import db from '@/db'` 유지
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export type Database = NodePgDatabase<typeof schema>;

export default db;
