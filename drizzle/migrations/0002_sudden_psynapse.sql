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

-- Step 5: Re-create FK constraints
ALTER TABLE "followup_questions" ADD CONSTRAINT "followup_questions_question_id_interview_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."interview_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_categories" ADD CONSTRAINT "interview_categories_jd_id_job_descriptions_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_jd_id_job_descriptions_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_origin_question_id_interview_questions_id_fk" FOREIGN KEY ("origin_question_id") REFERENCES "public"."interview_questions"("id") ON DELETE set null ON UPDATE no action;
