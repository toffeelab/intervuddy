/* eslint-disable no-console */
import { sql } from 'drizzle-orm';
import { getDb, getPool } from '@/db';
import { SYSTEM_USER_ID, DEFAULT_USER_ID } from '@/db/constants';
import {
  users,
  interviewCategories,
  interviewQuestions,
  followupQuestions,
  jobDescriptions,
} from '@/db/schema';

const useSample = process.argv.includes('--sample');
const dataSource = useSample ? '../../data/seed.sample' : '../../data/seed';

async function main() {
  console.log(`Using ${useSample ? 'sample' : 'personal'} seed data`);

  const db = getDb();
  const { categories, questions } = await import(dataSource);

  console.log('Clearing existing data...');
  await db.delete(followupQuestions);
  await db.delete(interviewQuestions);
  await db.delete(interviewCategories);
  await db.delete(jobDescriptions);
  // Don't delete users — just ensure they exist

  console.log('Seeding users...');
  await db
    .insert(users)
    .values([
      { id: SYSTEM_USER_ID, name: 'System', email: 'system@intervuddy.internal' },
      { id: DEFAULT_USER_ID, name: 'Local User', email: 'local@intervuddy.internal' },
    ])
    .onConflictDoNothing();

  console.log(`Inserting ${categories.length} categories, ${questions.length} questions...`);
  const categoryMap = new Map<string, number>();

  await db.transaction(async (tx) => {
    for (const cat of categories) {
      const [result] = await tx
        .insert(interviewCategories)
        .values({
          userId: DEFAULT_USER_ID,
          name: cat.name,
          slug: cat.slug,
          displayLabel: cat.displayLabel,
          icon: cat.icon,
          displayOrder: cat.displayOrder,
        })
        .returning({ id: interviewCategories.id });
      categoryMap.set(cat.name, result.id);
    }

    const orderByCategory = new Map<string, number>();
    for (const item of questions) {
      const categoryId = categoryMap.get(item.cat);
      if (!categoryId) {
        console.warn(`  Warning: Category "${item.cat}" not found, skipping item.`);
        continue;
      }

      const currentOrder = (orderByCategory.get(item.cat) ?? 0) + 1;
      orderByCategory.set(item.cat, currentOrder);

      const [questionResult] = await tx
        .insert(interviewQuestions)
        .values({
          userId: DEFAULT_USER_ID,
          categoryId,
          question: item.q,
          answer: item.a,
          tip: item.tip ?? null,
          keywords: item.keywords ?? [],
          displayOrder: currentOrder,
        })
        .returning({ id: interviewQuestions.id });

      const questionId = questionResult.id;

      for (let i = 0; i < item.followups.length; i++) {
        const followup = item.followups[i];
        await tx.insert(followupQuestions).values({
          userId: DEFAULT_USER_ID,
          questionId,
          question: followup.q,
          answer: followup.a,
          displayOrder: i + 1,
        });
      }
    }
  });

  // Seed system templates (same categories, no questions needed for templates)
  console.log('Seeding system templates...');
  await db.transaction(async (tx) => {
    for (const cat of categories) {
      await tx.insert(interviewCategories).values({
        userId: SYSTEM_USER_ID,
        name: cat.name,
        slug: cat.slug,
        displayLabel: cat.displayLabel,
        icon: cat.icon,
        displayOrder: cat.displayOrder,
      });
    }
  });

  // Verify counts
  const [{ catCount }] = await db
    .select({ catCount: sql<number>`COUNT(*)` })
    .from(interviewCategories);
  const [{ qCount }] = await db.select({ qCount: sql<number>`COUNT(*)` }).from(interviewQuestions);
  const [{ fCount }] = await db.select({ fCount: sql<number>`COUNT(*)` }).from(followupQuestions);

  console.log('\nSeed complete!');
  console.log(`  Categories:  ${catCount}`);
  console.log(`  Questions:   ${qCount}`);
  console.log(`  Followups:   ${fCount}`);

  await getPool().end();
}

main().catch(console.error);
