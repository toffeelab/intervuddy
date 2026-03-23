import { createDb, type Database } from '@intervuddy/database';
import { Pool } from 'pg';

let _db: Database | null = null;
let _pool: Pool | null = null;

export function getDb(): Database {
  if (!_db) {
    const conn = createDb(process.env.DATABASE_URL!);
    _db = conn.db;
    _pool = conn.pool;
  }
  return _db;
}

export function getPool(): Pool {
  if (!_pool) getDb();
  return _pool!;
}

export type { Database };
