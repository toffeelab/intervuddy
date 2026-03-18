import { getDb } from '@/db/index';
import { DEFAULT_RETENTION_DAYS } from '@/lib/retention-policy';

interface PurgeResult {
  questions: number;
  followups: number;
  categories: number;
  jobs: number;
}

export function purgeExpiredItems(retentionDays: number = DEFAULT_RETENTION_DAYS): PurgeResult {
  const db = getDb();
  const param = `-${retentionDays} days`;

  let followups = 0;
  let questions = 0;
  let categories = 0;
  let jobs = 0;

  const transaction = db.transaction(() => {
    // 순서 중요: FK 의존성 (자식 → 부모)
    // question_keywords는 ON DELETE CASCADE로 자동 삭제
    followups = db
      .prepare(
        "DELETE FROM followup_questions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;

    questions = db
      .prepare(
        "DELETE FROM interview_questions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;

    categories = db
      .prepare(
        "DELETE FROM interview_categories WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;

    jobs = db
      .prepare(
        "DELETE FROM job_descriptions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;
  });

  transaction();

  return { questions, followups, categories, jobs };
}
