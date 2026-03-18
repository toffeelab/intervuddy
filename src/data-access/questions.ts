import { getDb } from '@/db/index';
import type {
  InterviewQuestion,
  FollowupQuestion,
  CreateQuestionInput,
  UpdateQuestionInput,
} from './types';

interface QuestionRow {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  category_display_label: string;
  jd_id: number | null;
  origin_question_id: number | null;
  question: string;
  answer: string;
  tip: string | null;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FollowupRow {
  id: number;
  question_id: number;
  question: string;
  answer: string;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(
  row: QuestionRow,
  keywords: string[] = [],
  followups: FollowupQuestion[] = []
): InterviewQuestion {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    categoryDisplayLabel: row.category_display_label,
    jdId: row.jd_id,
    originQuestionId: row.origin_question_id,
    question: row.question,
    answer: row.answer,
    tip: row.tip,
    displayOrder: row.display_order,
    keywords,
    followups,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface BatchKeywordRow {
  question_id: number;
  keyword: string;
}
interface BatchFollowupRow extends FollowupRow {
  question_id: number;
}

function batchLoadKeywords(db: ReturnType<typeof getDb>, ids: number[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT question_id, keyword FROM question_keywords WHERE question_id IN (${placeholders})`
    )
    .all(...ids) as BatchKeywordRow[];
  for (const r of rows) {
    const arr = map.get(r.question_id) ?? [];
    arr.push(r.keyword);
    map.set(r.question_id, arr);
  }
  return map;
}

function batchLoadFollowups(
  db: ReturnType<typeof getDb>,
  ids: number[]
): Map<number, FollowupQuestion[]> {
  const map = new Map<number, FollowupQuestion[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `
    SELECT id, question_id, question, answer, display_order, deleted_at, created_at, updated_at
    FROM followup_questions
    WHERE question_id IN (${placeholders}) AND deleted_at IS NULL
    ORDER BY display_order
  `
    )
    .all(...ids) as BatchFollowupRow[];
  for (const r of rows) {
    const arr = map.get(r.question_id) ?? [];
    arr.push({
      id: r.id,
      questionId: r.question_id,
      question: r.question,
      answer: r.answer,
      displayOrder: r.display_order,
      deletedAt: r.deleted_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
    map.set(r.question_id, arr);
  }
  return map;
}

function mapRows(db: ReturnType<typeof getDb>, rows: QuestionRow[]): InterviewQuestion[] {
  const ids = rows.map((r) => r.id);
  const keywordsMap = batchLoadKeywords(db, ids);
  const followupsMap = batchLoadFollowups(db, ids);
  return rows.map((row) =>
    mapRow(row, keywordsMap.get(row.id) ?? [], followupsMap.get(row.id) ?? [])
  );
}

const BASE_SELECT = `
  SELECT
    q.id, q.category_id, c.name AS category_name, c.slug AS category_slug,
    c.display_label AS category_display_label,
    q.jd_id, q.origin_question_id, q.question, q.answer, q.tip,
    q.display_order, q.deleted_at, q.created_at, q.updated_at
  FROM interview_questions q
  JOIN interview_categories c ON c.id = q.category_id
`;

export function getLibraryQuestions(): InterviewQuestion[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    ${BASE_SELECT}
    WHERE q.jd_id IS NULL AND q.deleted_at IS NULL
    ORDER BY c.display_order, q.display_order
  `
    )
    .all() as QuestionRow[];

  return mapRows(db, rows);
}

export function getQuestionsByJdId(jdId: number): InterviewQuestion[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    ${BASE_SELECT}
    WHERE q.jd_id = ? AND q.deleted_at IS NULL
    ORDER BY c.display_order, q.display_order
  `
    )
    .all(jdId) as QuestionRow[];

  return mapRows(db, rows);
}

export function getQuestionsByCategory(categoryId: number): InterviewQuestion[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    ${BASE_SELECT}
    WHERE q.category_id = ? AND q.deleted_at IS NULL
    ORDER BY q.display_order
  `
    )
    .all(categoryId) as QuestionRow[];

  return mapRows(db, rows);
}

export function createQuestion(input: CreateQuestionInput): number {
  const db = getDb();
  const result = db
    .prepare(
      `
    INSERT INTO interview_questions (category_id, jd_id, question, answer, tip, display_order)
    VALUES (?, ?, ?, ?, ?, COALESCE(
      (SELECT MAX(display_order) + 1 FROM interview_questions
       WHERE category_id = ? AND deleted_at IS NULL),
      0
    ))
  `
    )
    .run(
      input.categoryId,
      input.jdId ?? null,
      input.question,
      input.answer,
      input.tip ?? null,
      input.categoryId
    );

  return Number(result.lastInsertRowid);
}

export function updateQuestion(input: UpdateQuestionInput): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.categoryId !== undefined) {
    fields.push('category_id = ?');
    values.push(input.categoryId);
  }
  if (input.question !== undefined) {
    fields.push('question = ?');
    values.push(input.question);
  }
  if (input.answer !== undefined) {
    fields.push('answer = ?');
    values.push(input.answer);
  }
  if (input.tip !== undefined) {
    fields.push('tip = ?');
    values.push(input.tip);
  }

  if (fields.length === 0) return;

  values.push(input.id);
  db.prepare(`UPDATE interview_questions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function updateQuestionKeywords(questionId: number, keywords: string[]): void {
  const db = getDb();
  const deleteStmt = db.prepare('DELETE FROM question_keywords WHERE question_id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO question_keywords (question_id, keyword) VALUES (?, ?)'
  );

  const updateAll = db.transaction(() => {
    deleteStmt.run(questionId);
    for (const keyword of keywords) {
      insertStmt.run(questionId, keyword);
    }
  });
  updateAll();
}

export function softDeleteQuestion(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE interview_questions SET deleted_at = datetime('now') WHERE id = ?`).run(id);
}

export function restoreQuestion(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE interview_questions SET deleted_at = NULL WHERE id = ?`).run(id);
}

export function getDeletedQuestions(jdId?: number): InterviewQuestion[] {
  const db = getDb();
  let query: string;
  let params: unknown[];

  if (jdId !== undefined) {
    query = `${BASE_SELECT} WHERE q.jd_id = ? AND q.deleted_at IS NOT NULL ORDER BY q.deleted_at DESC`;
    params = [jdId];
  } else {
    query = `${BASE_SELECT} WHERE q.deleted_at IS NOT NULL ORDER BY q.deleted_at DESC`;
    params = [];
  }

  const rows = db.prepare(query).all(...params) as QuestionRow[];
  return mapRows(db, rows);
}
