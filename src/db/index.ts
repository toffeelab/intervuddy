import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'intervuddy.db');

function getDb(): Database.Database {
  const globalAny = globalThis as Record<string, unknown>;
  if (!globalAny.__db) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    globalAny.__db = db;
  }
  return globalAny.__db as Database.Database;
}

export const db = getDb();
export default db;
