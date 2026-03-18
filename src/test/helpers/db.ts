import Database from 'better-sqlite3';
import { setDb, resetDb } from '@/db/index';
import { initializeDatabase } from '@/db/schema';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  setDb(db);
  initializeDatabase();
  return db;
}

export function cleanupTestDb(db: Database.Database): void {
  db.close();
  resetDb();
}

export function seedTestData(db: Database.Database): void {
  db.exec(`
    INSERT INTO categories (name, tag, tag_label, icon, is_jd_group, display_order)
    VALUES ('테스트 카테고리', 'test', '테스트', 'icon', 0, 1);

    INSERT INTO qa_items (category_id, question, answer, is_jd, is_deep, display_order)
    VALUES (1, '테스트 질문', '테스트 답변', 0, 0, 1);

    INSERT INTO qa_keywords (qa_item_id, keyword) VALUES (1, '테스트키워드');

    INSERT INTO deep_qa (qa_item_id, question, answer, display_order)
    VALUES (1, '꼬리질문', '꼬리답변', 1);
  `);
}
