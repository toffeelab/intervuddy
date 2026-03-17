import { getDb } from '@/db/index';
import type { InterviewCategory, CreateCategoryInput, UpdateCategoryInput } from './types';

interface CategoryRow {
  id: number;
  jd_id: number | null;
  name: string;
  slug: string;
  display_label: string;
  icon: string;
  display_order: number;
  question_count: number;
  deleted_at: string | null;
  created_at: string;
}

function mapRow(row: CategoryRow): InterviewCategory {
  return {
    id: row.id,
    jdId: row.jd_id,
    name: row.name,
    slug: row.slug,
    displayLabel: row.display_label,
    icon: row.icon,
    displayOrder: row.display_order,
    questionCount: row.question_count,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  };
}

export function getGlobalCategories(): InterviewCategory[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      c.id, c.jd_id, c.name, c.slug, c.display_label, c.icon,
      c.display_order, c.deleted_at, c.created_at,
      COUNT(q.id) AS question_count
    FROM interview_categories c
    LEFT JOIN interview_questions q
      ON q.category_id = c.id AND q.deleted_at IS NULL
    WHERE c.jd_id IS NULL AND c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.display_order
  `).all() as CategoryRow[];

  return rows.map(mapRow);
}

export function getCategoriesByJdId(jdId: number): InterviewCategory[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      c.id, c.jd_id, c.name, c.slug, c.display_label, c.icon,
      c.display_order, c.deleted_at, c.created_at,
      COUNT(q.id) AS question_count
    FROM interview_categories c
    LEFT JOIN interview_questions q
      ON q.category_id = c.id AND q.deleted_at IS NULL
    WHERE (c.jd_id IS NULL OR c.jd_id = ?) AND c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.display_order
  `).all(jdId) as CategoryRow[];

  return rows.map(mapRow);
}

export function createCategory(input: CreateCategoryInput): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO interview_categories (jd_id, name, slug, display_label, icon, display_order)
    VALUES (?, ?, ?, ?, ?, COALESCE(
      (SELECT MAX(display_order) + 1 FROM interview_categories WHERE
        CASE WHEN ? IS NULL THEN jd_id IS NULL ELSE jd_id = ? END
        AND deleted_at IS NULL),
      0
    ))
  `).run(
    input.jdId ?? null,
    input.name,
    input.slug,
    input.displayLabel,
    input.icon,
    input.jdId ?? null,
    input.jdId ?? null,
  );

  return Number(result.lastInsertRowid);
}

export function updateCategory(id: number, input: Omit<UpdateCategoryInput, 'id'>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.slug !== undefined) {
    fields.push('slug = ?');
    values.push(input.slug);
  }
  if (input.displayLabel !== undefined) {
    fields.push('display_label = ?');
    values.push(input.displayLabel);
  }
  if (input.icon !== undefined) {
    fields.push('icon = ?');
    values.push(input.icon);
  }

  if (fields.length === 0) return;

  values.push(id);
  db.prepare(`UPDATE interview_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function softDeleteCategory(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE interview_categories SET deleted_at = datetime('now') WHERE id = ?`).run(id);
}

export function restoreCategory(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE interview_categories SET deleted_at = NULL WHERE id = ?`).run(id);
}
