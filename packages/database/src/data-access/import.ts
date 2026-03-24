import { eq, and, asc, isNull } from 'drizzle-orm';
import type { Database } from '../connection';
import { interviewQuestions, followupQuestions } from '../schema';

interface ImportResult {
  importedCount: number;
  skippedCount: number;
}

export async function importQuestionsToJob(
  db: Database,
  userId: string,
  params: {
    jdId: string;
    questionIds: string[];
  }
): Promise<ImportResult> {
  let importedCount = 0;
  let skippedCount = 0;

  await db.transaction(async (tx) => {
    for (const questionId of params.questionIds) {
      const [original] = await tx
        .select({
          id: interviewQuestions.id,
          categoryId: interviewQuestions.categoryId,
          question: interviewQuestions.question,
          answer: interviewQuestions.answer,
          tip: interviewQuestions.tip,
          keywords: interviewQuestions.keywords,
          displayOrder: interviewQuestions.displayOrder,
        })
        .from(interviewQuestions)
        .where(
          and(
            eq(interviewQuestions.id, questionId),
            eq(interviewQuestions.userId, userId),
            isNull(interviewQuestions.jdId),
            isNull(interviewQuestions.deletedAt)
          )
        );

      if (!original) {
        skippedCount++;
        continue;
      }

      const [existing] = await tx
        .select({ id: interviewQuestions.id })
        .from(interviewQuestions)
        .where(
          and(
            eq(interviewQuestions.originQuestionId, original.id),
            eq(interviewQuestions.jdId, params.jdId),
            isNull(interviewQuestions.deletedAt)
          )
        );

      if (existing) {
        skippedCount++;
        continue;
      }

      const [newQuestion] = await tx
        .insert(interviewQuestions)
        .values({
          userId,
          categoryId: original.categoryId,
          jdId: params.jdId,
          originQuestionId: original.id,
          question: original.question,
          answer: original.answer,
          tip: original.tip,
          keywords: original.keywords,
          displayOrder: original.displayOrder,
        })
        .returning({ id: interviewQuestions.id });

      const newQuestionId = newQuestion.id;

      const origFollowups = await tx
        .select({
          question: followupQuestions.question,
          answer: followupQuestions.answer,
          displayOrder: followupQuestions.displayOrder,
        })
        .from(followupQuestions)
        .where(
          and(eq(followupQuestions.questionId, original.id), isNull(followupQuestions.deletedAt))
        )
        .orderBy(asc(followupQuestions.displayOrder));

      for (const fu of origFollowups) {
        await tx.insert(followupQuestions).values({
          userId,
          questionId: newQuestionId,
          question: fu.question,
          answer: fu.answer,
          displayOrder: fu.displayOrder,
        });
      }

      importedCount++;
    }
  });

  return { importedCount, skippedCount };
}
