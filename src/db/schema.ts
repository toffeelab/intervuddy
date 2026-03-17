import db from './index';

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL,
      tag_label TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_jd_group INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS qa_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      tip TEXT,
      jd_tip TEXT,
      is_jd INTEGER NOT NULL DEFAULT 0,
      is_deep INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS qa_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qa_item_id INTEGER NOT NULL REFERENCES qa_items(id),
      keyword TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deep_qa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qa_item_id INTEGER NOT NULL REFERENCES qa_items(id),
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      display_order INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_qa_items_category_id ON qa_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_qa_keywords_qa_item_id ON qa_keywords(qa_item_id);
    CREATE INDEX IF NOT EXISTS idx_deep_qa_qa_item_id ON deep_qa(qa_item_id);
  `);
}
