import { createDb, type Database } from '@intervuddy/database';
import { Pool } from 'pg';

let _db: Database | null = null;
let _pool: Pool | null = null;
let _testDb: Database | null = null;

export function getDb(): Database {
  if (_testDb) return _testDb;
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

export function setDb(db: Database) {
  _testDb = db;
}

export function resetDb() {
  _testDb = null;
  _db = null;
  _pool = null;
}

export type { Database };
