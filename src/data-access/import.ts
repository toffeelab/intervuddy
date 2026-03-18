import { getDb } from '@/db/index';

interface ImportResult {
  importedCount: number;
  skippedCount: number;
}

interface OriginalQuestionRow {
  id: number;
  category_id: number;
  question: string;
  answer: string;
  tip: string | null;
  display_order: number;
}

interface ExistingRow {
  id: number;
}

interface KeywordRow {
  keyword: string;
}

interface FollowupRow {
  question: string;
  answer: string;
  display_order: number;
}

export function importQuestionsToJob(params: {
  jdId: number;
  questionIds: number[];
}): ImportResult {
  const db = getDb();
  let importedCount = 0;
  let skippedCount = 0;

  const transaction = db.transaction(() => {
    for (const questionId of params.questionIds) {
      const original = db
        .prepare(
          `SELECT id, category_id, question, answer, tip, display_order
           FROM interview_questions
           WHERE id = ? AND jd_id IS NULL AND deleted_at IS NULL`
        )
        .get(questionId) as OriginalQuestionRow | undefined;

      if (!original) {
        skippedCount++;
        continue;
      }

      const existing = db
        .prepare(
          `SELECT id FROM interview_questions
           WHERE origin_question_id = ? AND jd_id = ? AND deleted_at IS NULL`
        )
        .get(original.id, params.jdId) as ExistingRow | undefined;

      if (existing) {
        skippedCount++;
        continue;
      }

      const result = db
        .prepare(
          `INSERT INTO interview_questions
             (category_id, jd_id, origin_question_id, question, answer, tip, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          original.category_id,
          params.jdId,
          original.id,
          original.question,
          original.answer,
          original.tip,
          original.display_order
        );

      const newQuestionId = Number(result.lastInsertRowid);

      const keywords = db
        .prepare(`SELECT keyword FROM question_keywords WHERE question_id = ?`)
        .all(original.id) as KeywordRow[];
      const insertKeyword = db.prepare(
        `INSERT INTO question_keywords (question_id, keyword) VALUES (?, ?)`
      );
      for (const kw of keywords) {
        insertKeyword.run(newQuestionId, kw.keyword);
      }

      const followups = db
        .prepare(
          `SELECT question, answer, display_order FROM followup_questions
           WHERE question_id = ? AND deleted_at IS NULL`
        )
        .all(original.id) as FollowupRow[];
      const insertFollowup = db.prepare(
        `INSERT INTO followup_questions (question_id, question, answer, display_order) VALUES (?, ?, ?, ?)`
      );
      for (const fu of followups) {
        insertFollowup.run(newQuestionId, fu.question, fu.answer, fu.display_order);
      }

      importedCount++;
    }
  });

  transaction();
  return { importedCount, skippedCount };
}
