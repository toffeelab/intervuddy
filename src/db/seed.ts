import db from './index';
import { initializeDatabase } from './schema';

const useSample = process.argv.includes('--sample');
const dataSource = useSample ? '../../data/seed.sample' : '../../data/seed';

async function main() {
  const { categories, qaItems } = await import(dataSource);

  console.log(`Using ${useSample ? 'sample' : 'personal'} seed data`);
  console.log('Initializing database schema...');
  initializeDatabase();

  console.log('Clearing existing data...');
  db.exec('DELETE FROM deep_qa');
  db.exec('DELETE FROM qa_keywords');
  db.exec('DELETE FROM qa_items');
  db.exec('DELETE FROM categories');

  console.log(`Inserting ${categories.length} categories...`);
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, tag, tag_label, icon, is_jd_group, display_order)
    VALUES (@name, @tag, @tagLabel, @icon, @isJdGroup, @displayOrder)
  `);

  const categoryMap = new Map<string, number>();

  const insertCategories = db.transaction(() => {
    for (const cat of categories) {
      const result = insertCategory.run({
        name: cat.name,
        tag: cat.tag,
        tagLabel: cat.tagLabel,
        icon: cat.icon,
        isJdGroup: cat.isJdGroup ? 1 : 0,
        displayOrder: cat.displayOrder,
      });
      categoryMap.set(cat.name, result.lastInsertRowid as number);
    }
  });
  insertCategories();

  console.log(`Inserting ${qaItems.length} QA items...`);
  const insertQAItem = db.prepare(`
    INSERT INTO qa_items (category_id, question, answer, tip, jd_tip, is_jd, is_deep, display_order)
    VALUES (@categoryId, @question, @answer, @tip, @jdTip, @isJD, @isDeep, @displayOrder)
  `);

  const insertKeyword = db.prepare(`
    INSERT INTO qa_keywords (qa_item_id, keyword)
    VALUES (@qaItemId, @keyword)
  `);

  const insertDeepQA = db.prepare(`
    INSERT INTO deep_qa (qa_item_id, question, answer, display_order)
    VALUES (@qaItemId, @question, @answer, @displayOrder)
  `);

  const insertAllQAItems = db.transaction(() => {
    const orderByCategory = new Map<string, number>();

    for (const item of qaItems) {
      const categoryId = categoryMap.get(item.cat);
      if (!categoryId) {
        console.warn(`  Warning: Category "${item.cat}" not found, skipping item.`);
        continue;
      }

      const currentOrder = (orderByCategory.get(item.cat) ?? 0) + 1;
      orderByCategory.set(item.cat, currentOrder);

      const result = insertQAItem.run({
        categoryId,
        question: item.q,
        answer: item.a,
        tip: item.tip ?? null,
        jdTip: item.jdTip ?? null,
        isJD: item.isJD ? 1 : 0,
        isDeep: item.isDeep ? 1 : 0,
        displayOrder: currentOrder,
      });

      const qaItemId = result.lastInsertRowid as number;

      for (const keyword of item.keywords) {
        insertKeyword.run({ qaItemId, keyword });
      }

      for (let i = 0; i < item.deepQA.length; i++) {
        const deep = item.deepQA[i];
        insertDeepQA.run({
          qaItemId,
          question: deep.q,
          answer: deep.a,
          displayOrder: i + 1,
        });
      }
    }
  });
  insertAllQAItems();

  // Verify
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  const qaCount = db.prepare('SELECT COUNT(*) as count FROM qa_items').get() as { count: number };
  const kwCount = db.prepare('SELECT COUNT(*) as count FROM qa_keywords').get() as { count: number };
  const deepCount = db.prepare('SELECT COUNT(*) as count FROM deep_qa').get() as { count: number };

  console.log('\nSeed complete!');
  console.log(`  Categories: ${catCount.count}`);
  console.log(`  QA Items:   ${qaCount.count}`);
  console.log(`  Keywords:   ${kwCount.count}`);
  console.log(`  Deep QA:    ${deepCount.count}`);
}

main();
