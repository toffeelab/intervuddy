import type {
  InterviewCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@intervuddy/shared';
import { eq, and, isNull, or, asc, count, sql } from 'drizzle-orm';
import type { DbOrTx } from '../connection';
import { interviewCategories, interviewQuestions } from '../schema';

export async function getLibraryCategories(
  db: DbOrTx,
  userId: string
): Promise<InterviewCategory[]> {
  const rows = await db
    .select({
      id: interviewCategories.id,
      jdId: interviewCategories.jdId,
      name: interviewCategories.name,
      slug: interviewCategories.slug,
      displayLabel: interviewCategories.displayLabel,
      icon: interviewCategories.icon,
      displayOrder: interviewCategories.displayOrder,
      questionCount: count(interviewQuestions.id),
      deletedAt: interviewCategories.deletedAt,
      createdAt: interviewCategories.createdAt,
      updatedAt: interviewCategories.updatedAt,
    })
    .from(interviewCategories)
    .leftJoin(
      interviewQuestions,
      and(
        eq(interviewQuestions.categoryId, interviewCategories.id),
        isNull(interviewQuestions.deletedAt)
      )
    )
    .where(
      and(
        eq(interviewCategories.userId, userId),
        isNull(interviewCategories.jdId),
        isNull(interviewCategories.deletedAt)
      )
    )
    .groupBy(interviewCategories.id)
    .orderBy(asc(interviewCategories.displayOrder));

  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
}

/** @deprecated Use getLibraryCategories instead */
export async function getGlobalCategories(
  db: DbOrTx,
  userId: string
): Promise<InterviewCategory[]> {
  return getLibraryCategories(db, userId);
}

export async function getCategoriesByJdId(
  db: DbOrTx,
  userId: string,
  jdId: string
): Promise<InterviewCategory[]> {
  const rows = await db
    .select({
      id: interviewCategories.id,
      jdId: interviewCategories.jdId,
      name: interviewCategories.name,
      slug: interviewCategories.slug,
      displayLabel: interviewCategories.displayLabel,
      icon: interviewCategories.icon,
      displayOrder: interviewCategories.displayOrder,
      questionCount: count(interviewQuestions.id),
      deletedAt: interviewCategories.deletedAt,
      createdAt: interviewCategories.createdAt,
      updatedAt: interviewCategories.updatedAt,
    })
    .from(interviewCategories)
    .leftJoin(
      interviewQuestions,
      and(
        eq(interviewQuestions.categoryId, interviewCategories.id),
        isNull(interviewQuestions.deletedAt)
      )
    )
    .where(
      and(
        eq(interviewCategories.userId, userId),
        or(isNull(interviewCategories.jdId), eq(interviewCategories.jdId, jdId)),
        isNull(interviewCategories.deletedAt)
      )
    )
    .groupBy(interviewCategories.id)
    .orderBy(asc(interviewCategories.displayOrder));

  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
}

export async function createCategory(
  db: DbOrTx,
  userId: string,
  input: CreateCategoryInput
): Promise<number> {
  const jdId = input.jdId ?? null;

  const displayOrderSq =
    jdId === null
      ? sql`COALESCE((SELECT MAX(${interviewCategories.displayOrder}) + 1 FROM ${interviewCategories} WHERE ${interviewCategories.jdId} IS NULL AND ${interviewCategories.deletedAt} IS NULL AND ${interviewCategories.userId} = ${userId}), 0)`
      : sql`COALESCE((SELECT MAX(${interviewCategories.displayOrder}) + 1 FROM ${interviewCategories} WHERE ${interviewCategories.jdId} = ${jdId} AND ${interviewCategories.deletedAt} IS NULL AND ${interviewCategories.userId} = ${userId}), 0)`;

  const [result] = await db
    .insert(interviewCategories)
    .values({
      userId,
      jdId,
      name: input.name,
      slug: input.slug,
      displayLabel: input.displayLabel,
      icon: input.icon,
      displayOrder: displayOrderSq,
    })
    .returning({ id: interviewCategories.id });

  return result.id;
}

export async function updateCategory(
  db: DbOrTx,
  userId: string,
  id: number,
  input: Omit<UpdateCategoryInput, 'id'>
): Promise<void> {
  const updates: Partial<typeof interviewCategories.$inferInsert> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.displayLabel !== undefined) updates.displayLabel = input.displayLabel;
  if (input.icon !== undefined) updates.icon = input.icon;

  if (Object.keys(updates).length === 0) return;

  await db
    .update(interviewCategories)
    .set(updates)
    .where(and(eq(interviewCategories.id, id), eq(interviewCategories.userId, userId)));
}

export async function softDeleteCategory(db: DbOrTx, userId: string, id: number): Promise<void> {
  await db
    .update(interviewCategories)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(interviewCategories.id, id), eq(interviewCategories.userId, userId)));
}

export async function restoreCategory(db: DbOrTx, userId: string, id: number): Promise<void> {
  await db
    .update(interviewCategories)
    .set({ deletedAt: null })
    .where(and(eq(interviewCategories.id, id), eq(interviewCategories.userId, userId)));
}
