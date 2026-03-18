import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'intervuddy.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

/** 테스트 전용: 외부 DB 인스턴스 주입 */
export function setDb(instance: Database.Database): void {
  dbInstance = instance;
}

/** 테스트 전용: DB 인스턴스 초기화 */
export function resetDb(): void {
  dbInstance = null;
}

// 하위 호환: 기존 `import db from '@/db'` 유지
export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const value = Reflect.get(getDb(), prop);
    if (typeof value === 'function') {
      return value.bind(getDb());
    }
    return value;
  },
});

export default db;
