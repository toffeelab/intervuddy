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

export function seedTestCategories(db: Database.Database): void {
  db.exec(`
    INSERT INTO interview_categories (name, slug, display_label, icon, display_order)
    VALUES
      ('자기소개/커리어', 'self-intro', '자기소개', '👤', 1),
      ('기술역량', 'tech', '기술', '⚙️', 2);
  `);
}

export function seedTestQuestions(db: Database.Database): void {
  seedTestCategories(db);
  db.exec(`
    INSERT INTO interview_questions (category_id, question, answer, tip, display_order)
    VALUES (1, '자기소개를 해주세요', '저는 5년차 개발자입니다', '구체적 수치를 포함하세요', 1);

    INSERT INTO question_keywords (question_id, keyword) VALUES (1, '자기소개');
    INSERT INTO question_keywords (question_id, keyword) VALUES (1, '경력');

    INSERT INTO followup_questions (question_id, question, answer, display_order)
    VALUES (1, '가장 어려웠던 프로젝트는?', '실시간 통신 시스템 구축', 1);
  `);
}

export function seedTestJobDescription(db: Database.Database): void {
  db.exec(`
    INSERT INTO job_descriptions (company_name, position_title, status, memo)
    VALUES ('네이버', '프론트엔드 시니어', 'in_progress', '웹 플랫폼팀');
  `);
}
