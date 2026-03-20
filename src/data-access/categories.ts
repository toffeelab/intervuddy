import { eq, and, isNull, or, asc, count, sql } from 'drizzle-orm';
import { DEFAULT_USER_ID } from '@/db/constants';
import { getDb } from '@/db/index';
import { interviewCategories, interviewQuestions } from '@/db/schema';
import type { InterviewCategory, CreateCategoryInput, UpdateCategoryInput } from './types';

export async function getGlobalCategories(): Promise<InterviewCategory[]> {
  const rows = await getDb()
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
        eq(interviewCategories.userId, DEFAULT_USER_ID),
        isNull(interviewCategories.jdId),
        isNull(interviewCategories.deletedAt)
      )
    )
    .groupBy(interviewCategories.id)
    .orderBy(asc(interviewCategories.displayOrder));

  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
}

export async function getCategoriesByJdId(jdId: number): Promise<InterviewCategory[]> {
  const rows = await getDb()
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
        eq(interviewCategories.userId, DEFAULT_USER_ID),
        or(isNull(interviewCategories.jdId), eq(interviewCategories.jdId, jdId)),
        isNull(interviewCategories.deletedAt)
      )
    )
    .groupBy(interviewCategories.id)
    .orderBy(asc(interviewCategories.displayOrder));

  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
}

export async function createCategory(input: CreateCategoryInput): Promise<number> {
  const jdId = input.jdId ?? null;

  const displayOrderSq =
    jdId === null
      ? sql`COALESCE((SELECT MAX(${interviewCategories.displayOrder}) + 1 FROM ${interviewCategories} WHERE ${interviewCategories.jdId} IS NULL AND ${interviewCategories.deletedAt} IS NULL AND ${interviewCategories.userId} = ${DEFAULT_USER_ID}), 0)`
      : sql`COALESCE((SELECT MAX(${interviewCategories.displayOrder}) + 1 FROM ${interviewCategories} WHERE ${interviewCategories.jdId} = ${jdId} AND ${interviewCategories.deletedAt} IS NULL AND ${interviewCategories.userId} = ${DEFAULT_USER_ID}), 0)`;

  const [result] = await getDb()
    .insert(interviewCategories)
    .values({
      userId: DEFAULT_USER_ID,
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
  id: number,
  input: Omit<UpdateCategoryInput, 'id'>
): Promise<void> {
  const updates: Partial<typeof interviewCategories.$inferInsert> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.displayLabel !== undefined) updates.displayLabel = input.displayLabel;
  if (input.icon !== undefined) updates.icon = input.icon;

  if (Object.keys(updates).length === 0) return;

  await getDb().update(interviewCategories).set(updates).where(eq(interviewCategories.id, id));
}

export async function softDeleteCategory(id: number): Promise<void> {
  await getDb()
    .update(interviewCategories)
    .set({ deletedAt: sql`NOW()` })
    .where(eq(interviewCategories.id, id));
}

export async function restoreCategory(id: number): Promise<void> {
  await getDb()
    .update(interviewCategories)
    .set({ deletedAt: null })
    .where(eq(interviewCategories.id, id));
}
