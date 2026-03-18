import db from './index';
import { initializeDatabase } from './schema';

const useSample = process.argv.includes('--sample');
const dataSource = useSample ? '../../data/seed.sample' : '../../data/seed';

async function main() {
  const { categories, questions } = await import(dataSource);

  console.log(`Using ${useSample ? 'sample' : 'personal'} seed data`);
  console.log('Initializing database schema...');
  initializeDatabase();

  console.log('Clearing existing data...');
  db.exec('DELETE FROM question_keywords');
  db.exec('DELETE FROM followup_questions');
  db.exec('DELETE FROM interview_questions');
  db.exec('DELETE FROM interview_categories');
  db.exec('DELETE FROM job_descriptions');

  console.log(`Inserting ${categories.length} categories...`);
  const insertCategory = db.prepare(`
    INSERT INTO interview_categories (name, slug, display_label, icon, display_order)
    VALUES (@name, @slug, @displayLabel, @icon, @displayOrder)
  `);

  const categoryMap = new Map<string, number>();

  const insertCategories = db.transaction(() => {
    for (const cat of categories) {
      const result = insertCategory.run({
        name: cat.name,
        slug: cat.slug,
        displayLabel: cat.displayLabel,
        icon: cat.icon,
        displayOrder: cat.displayOrder,
      });
      categoryMap.set(cat.name, result.lastInsertRowid as number);
    }
  });
  insertCategories();

  console.log(`Inserting ${questions.length} questions...`);
  const insertQuestion = db.prepare(`
    INSERT INTO interview_questions (category_id, question, answer, tip, display_order)
    VALUES (@categoryId, @question, @answer, @tip, @displayOrder)
  `);

  const insertKeyword = db.prepare(`
    INSERT INTO question_keywords (question_id, keyword)
    VALUES (@questionId, @keyword)
  `);

  const insertFollowup = db.prepare(`
    INSERT INTO followup_questions (question_id, question, answer, display_order)
    VALUES (@questionId, @question, @answer, @displayOrder)
  `);

  const insertAllQuestions = db.transaction(() => {
    const orderByCategory = new Map<string, number>();

    for (const item of questions) {
      const categoryId = categoryMap.get(item.cat);
      if (!categoryId) {
        console.warn(`  Warning: Category "${item.cat}" not found, skipping item.`);
        continue;
      }

      const currentOrder = (orderByCategory.get(item.cat) ?? 0) + 1;
      orderByCategory.set(item.cat, currentOrder);

      const result = insertQuestion.run({
        categoryId,
        question: item.q,
        answer: item.a,
        tip: item.tip ?? null,
        displayOrder: currentOrder,
      });

      const questionId = result.lastInsertRowid as number;

      for (const keyword of item.keywords) {
        insertKeyword.run({ questionId, keyword });
      }

      for (let i = 0; i < item.followups.length; i++) {
        const followup = item.followups[i];
        insertFollowup.run({
          questionId,
          question: followup.q,
          answer: followup.a,
          displayOrder: i + 1,
        });
      }
    }
  });
  insertAllQuestions();

  // Verify
  const catCount = db.prepare('SELECT COUNT(*) as count FROM interview_categories').get() as { count: number };
  const qCount = db.prepare('SELECT COUNT(*) as count FROM interview_questions').get() as { count: number };
  const kwCount = db.prepare('SELECT COUNT(*) as count FROM question_keywords').get() as { count: number };
  const fCount = db.prepare('SELECT COUNT(*) as count FROM followup_questions').get() as { count: number };

  console.log('\nSeed complete!');
  console.log(`  Categories:  ${catCount.count}`);
  console.log(`  Questions:   ${qCount.count}`);
  console.log(`  Keywords:    ${kwCount.count}`);
  console.log(`  Followups:   ${fCount.count}`);
}

main();
