import db from './index';

export function initializeDatabase(): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS job_descriptions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name    TEXT    NOT NULL,
        position_title  TEXT    NOT NULL,
        status          TEXT    NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed', 'archived')),
        memo            TEXT,
        deleted_at      TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_job_descriptions_status
        ON job_descriptions (status) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_job_descriptions_deleted_at
        ON job_descriptions (deleted_at) WHERE deleted_at IS NOT NULL;

    CREATE TABLE IF NOT EXISTS interview_categories (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        jd_id           INTEGER REFERENCES job_descriptions (id) ON DELETE CASCADE,
        name            TEXT    NOT NULL,
        slug            TEXT    NOT NULL,
        display_label   TEXT    NOT NULL,
        icon            TEXT    NOT NULL,
        display_order   INTEGER NOT NULL DEFAULT 0,
        deleted_at      TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (jd_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_interview_categories_jd_id
        ON interview_categories (jd_id) WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_categories_global_slug
        ON interview_categories (slug) WHERE jd_id IS NULL AND deleted_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_categories_global_name
        ON interview_categories (name) WHERE jd_id IS NULL AND deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS interview_questions (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id         INTEGER NOT NULL REFERENCES interview_categories (id) ON DELETE CASCADE,
        jd_id               INTEGER REFERENCES job_descriptions (id) ON DELETE CASCADE,
        origin_question_id  INTEGER REFERENCES interview_questions (id) ON DELETE SET NULL,
        question            TEXT    NOT NULL,
        answer              TEXT    NOT NULL DEFAULT '',
        tip                 TEXT,
        display_order       INTEGER NOT NULL DEFAULT 0,
        deleted_at          TEXT,
        created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_interview_questions_category_order
        ON interview_questions (category_id, display_order) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_interview_questions_jd_id
        ON interview_questions (jd_id, category_id, display_order) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_interview_questions_deleted_at
        ON interview_questions (deleted_at) WHERE deleted_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_interview_questions_origin
        ON interview_questions (origin_question_id) WHERE origin_question_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS followup_questions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id     INTEGER NOT NULL REFERENCES interview_questions (id) ON DELETE CASCADE,
        question        TEXT    NOT NULL,
        answer          TEXT    NOT NULL DEFAULT '',
        display_order   INTEGER NOT NULL DEFAULT 0,
        deleted_at      TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_followup_questions_parent_order
        ON followup_questions (question_id, display_order) WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS question_keywords (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id     INTEGER NOT NULL REFERENCES interview_questions (id) ON DELETE CASCADE,
        keyword         TEXT    NOT NULL,
        UNIQUE (question_id, keyword)
    );

    CREATE INDEX IF NOT EXISTS idx_question_keywords_keyword ON question_keywords (keyword);

    -- Triggers for updated_at auto-update
    CREATE TRIGGER IF NOT EXISTS trg_job_descriptions_updated_at
        AFTER UPDATE ON job_descriptions FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
    BEGIN UPDATE job_descriptions SET updated_at = datetime('now') WHERE id = NEW.id; END;

    CREATE TRIGGER IF NOT EXISTS trg_interview_questions_updated_at
        AFTER UPDATE ON interview_questions FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
    BEGIN UPDATE interview_questions SET updated_at = datetime('now') WHERE id = NEW.id; END;

    CREATE TRIGGER IF NOT EXISTS trg_followup_questions_updated_at
        AFTER UPDATE ON followup_questions FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
    BEGIN UPDATE followup_questions SET updated_at = datetime('now') WHERE id = NEW.id; END;
  `);
}
