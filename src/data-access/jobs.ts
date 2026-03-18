import { getDb } from '@/db/index';
import type { JobDescription, JobDescriptionStatus, CreateJobInput, UpdateJobInput } from './types';

interface JobRow {
  id: number;
  company_name: string;
  position_title: string;
  status: JobDescriptionStatus;
  memo: string | null;
  question_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: JobRow): JobDescription {
  return {
    id: row.id,
    companyName: row.company_name,
    positionTitle: row.position_title,
    status: row.status,
    memo: row.memo,
    questionCount: row.question_count,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT
    j.id, j.company_name, j.position_title, j.status, j.memo,
    j.deleted_at, j.created_at, j.updated_at,
    (SELECT COUNT(*) FROM interview_questions q
     WHERE q.jd_id = j.id AND q.deleted_at IS NULL) AS question_count
  FROM job_descriptions j
`;

export function getAllJobs(): JobDescription[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    ${BASE_SELECT}
    WHERE j.deleted_at IS NULL
    ORDER BY j.created_at DESC
  `
    )
    .all() as JobRow[];

  return rows.map(mapRow);
}

export function getJobById(id: number): JobDescription | null {
  const db = getDb();
  const row = db
    .prepare(
      `
    ${BASE_SELECT}
    WHERE j.id = ? AND j.deleted_at IS NULL
  `
    )
    .get(id) as JobRow | undefined;

  return row ? mapRow(row) : null;
}

export function createJob(input: CreateJobInput): number {
  const db = getDb();
  const result = db
    .prepare(
      `
    INSERT INTO job_descriptions (company_name, position_title, memo)
    VALUES (?, ?, ?)
  `
    )
    .run(input.companyName, input.positionTitle, input.memo ?? null);

  return Number(result.lastInsertRowid);
}

export function updateJob(input: UpdateJobInput): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.companyName !== undefined) {
    fields.push('company_name = ?');
    values.push(input.companyName);
  }
  if (input.positionTitle !== undefined) {
    fields.push('position_title = ?');
    values.push(input.positionTitle);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    values.push(input.status);
  }
  if (input.memo !== undefined) {
    fields.push('memo = ?');
    values.push(input.memo);
  }

  if (fields.length === 0) return;

  values.push(input.id);
  db.prepare(`UPDATE job_descriptions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function updateJobStatus(id: number, status: JobDescriptionStatus): void {
  const db = getDb();
  db.prepare(`UPDATE job_descriptions SET status = ? WHERE id = ?`).run(status, id);
}

export function softDeleteJob(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE job_descriptions SET deleted_at = datetime('now') WHERE id = ?`).run(id);
}

export function restoreJob(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE job_descriptions SET deleted_at = NULL WHERE id = ?`).run(id);
}

export function getDeletedJobs(): JobDescription[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    ${BASE_SELECT}
    WHERE j.deleted_at IS NOT NULL
    ORDER BY j.deleted_at DESC
  `
    )
    .all() as JobRow[];

  return rows.map(mapRow);
}
