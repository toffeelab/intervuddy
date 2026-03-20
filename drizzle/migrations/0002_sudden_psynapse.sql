-- Step 1: Drop all FK constraints referencing columns that will change type
ALTER TABLE "followup_questions" DROP CONSTRAINT "followup_questions_question_id_interview_questions_id_fk";--> statement-breakpoint
ALTER TABLE "interview_categories" DROP CONSTRAINT "interview_categories_jd_id_job_descriptions_id_fk";--> statement-breakpoint
ALTER TABLE "interview_questions" DROP CONSTRAINT "interview_questions_jd_id_job_descriptions_id_fk";--> statement-breakpoint
ALTER TABLE "interview_questions" DROP CONSTRAINT "interview_questions_origin_question_id_interview_questions_id_fk";--> statement-breakpoint

-- Step 2: Drop identity before changing type (identity requires integer type)
ALTER TABLE "job_descriptions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "interview_questions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "followup_questions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint

-- Step 3: Change PK column types (integer → text) with USING cast
ALTER TABLE "job_descriptions" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "interview_questions" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "followup_questions" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint

-- Step 4: Change FK column types (integer → text) with USING cast
ALTER TABLE "interview_categories" ALTER COLUMN "jd_id" SET DATA TYPE text USING "jd_id"::text;--> statement-breakpoint
ALTER TABLE "interview_questions" ALTER COLUMN "jd_id" SET DATA TYPE text USING "jd_id"::text;--> statement-breakpoint
ALTER TABLE "interview_questions" ALTER COLUMN "origin_question_id" SET DATA TYPE text USING "origin_question_id"::text;--> statement-breakpoint
ALTER TABLE "followup_questions" ALTER COLUMN "question_id" SET DATA TYPE text USING "question_id"::text;--> statement-breakpoint

-- Step 5: Convert existing integer-string IDs to UUID
-- Create temp mapping tables to update FKs consistently
CREATE TEMP TABLE _jd_id_map AS SELECT id AS old_id, gen_random_uuid()::text AS new_id FROM "job_descriptions";--> statement-breakpoint
CREATE TEMP TABLE _iq_id_map AS SELECT id AS old_id, gen_random_uuid()::text AS new_id FROM "interview_questions";--> statement-breakpoint
CREATE TEMP TABLE _fq_id_map AS SELECT id AS old_id, gen_random_uuid()::text AS new_id FROM "followup_questions";--> statement-breakpoint

-- Update FK references first (before PK changes)
UPDATE "interview_categories" SET "jd_id" = m.new_id FROM _jd_id_map m WHERE "jd_id" = m.old_id;--> statement-breakpoint
UPDATE "interview_questions" SET "jd_id" = m.new_id FROM _jd_id_map m WHERE "jd_id" = m.old_id;--> statement-breakpoint
UPDATE "interview_questions" SET "origin_question_id" = m.new_id FROM _iq_id_map m WHERE "origin_question_id" = m.old_id;--> statement-breakpoint
UPDATE "followup_questions" SET "question_id" = m.new_id FROM _iq_id_map m WHERE "question_id" = m.old_id;--> statement-breakpoint

-- Update PKs
UPDATE "job_descriptions" SET "id" = m.new_id FROM _jd_id_map m WHERE "id" = m.old_id;--> statement-breakpoint
UPDATE "interview_questions" SET "id" = m.new_id FROM _iq_id_map m WHERE "id" = m.old_id;--> statement-breakpoint
UPDATE "followup_questions" SET "id" = m.new_id FROM _fq_id_map m WHERE "id" = m.old_id;--> statement-breakpoint

-- Cleanup temp tables
DROP TABLE _jd_id_map;--> statement-breakpoint
DROP TABLE _iq_id_map;--> statement-breakpoint
DROP TABLE _fq_id_map;--> statement-breakpoint

-- Step 6: Re-create FK constraints
ALTER TABLE "followup_questions" ADD CONSTRAINT "followup_questions_question_id_interview_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."interview_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_categories" ADD CONSTRAINT "interview_categories_jd_id_job_descriptions_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_jd_id_job_descriptions_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_origin_question_id_interview_questions_id_fk" FOREIGN KEY ("origin_question_id") REFERENCES "public"."interview_questions"("id") ON DELETE set null ON UPDATE no action;
