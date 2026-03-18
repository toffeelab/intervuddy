import { getDb } from '@/db/index';
import type { FollowupQuestion, CreateFollowupInput, UpdateFollowupInput } from './types';

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

function mapRow(row: FollowupRow): FollowupQuestion {
  return {
    id: row.id,
    questionId: row.question_id,
    question: row.question,
    answer: row.answer,
    displayOrder: row.display_order,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getFollowupsByQuestionId(questionId: number): FollowupQuestion[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, question_id, question, answer, display_order, deleted_at, created_at, updated_at
    FROM followup_questions
    WHERE question_id = ? AND deleted_at IS NULL
    ORDER BY display_order
  `).all(questionId) as FollowupRow[];

  return rows.map(mapRow);
}

export function createFollowup(input: CreateFollowupInput): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO followup_questions (question_id, question, answer, display_order)
    VALUES (?, ?, ?, COALESCE(
      (SELECT MAX(display_order) + 1 FROM followup_questions
       WHERE question_id = ? AND deleted_at IS NULL),
      0
    ))
  `).run(input.questionId, input.question, input.answer, input.questionId);

  return Number(result.lastInsertRowid);
}

export function updateFollowup(input: UpdateFollowupInput): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.question !== undefined) {
    fields.push('question = ?');
    values.push(input.question);
  }
  if (input.answer !== undefined) {
    fields.push('answer = ?');
    values.push(input.answer);
  }

  if (fields.length === 0) return;

  values.push(input.id);
  db.prepare(`UPDATE followup_questions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function softDeleteFollowup(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE followup_questions SET deleted_at = datetime('now') WHERE id = ?`).run(id);
}

export function restoreFollowup(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE followup_questions SET deleted_at = NULL WHERE id = ?`).run(id);
}
