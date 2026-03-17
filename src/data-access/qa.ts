import { getDb } from '@/db/index';
import type { QAItem, Category, DeepQA } from './types';

interface QAItemRow {
  id: number;
  category_id: number;
  category_name: string;
  tag: string;
  tag_label: string;
  question: string;
  answer: string;
  tip: string | null;
  jd_tip: string | null;
  is_jd: number;
  is_deep: number;
  display_order: number;
}

interface KeywordRow {
  keyword: string;
}

interface DeepQARow {
  id: number;
  question: string;
  answer: string;
}

interface CategoryRow {
  id: number;
  name: string;
  tag: string;
  tag_label: string;
  icon: string;
  is_jd_group: number;
  display_order: number;
  count: number;
}

export function getAllQAItems(): QAItem[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      qi.id,
      qi.category_id,
      c.name AS category_name,
      c.tag,
      c.tag_label,
      qi.question,
      qi.answer,
      qi.tip,
      qi.jd_tip,
      qi.is_jd,
      qi.is_deep,
      qi.display_order
    FROM qa_items qi
    JOIN categories c ON c.id = qi.category_id
    ORDER BY c.display_order, qi.display_order
  `).all() as QAItemRow[];

  const keywordsStmt = db.prepare(`SELECT keyword FROM qa_keywords WHERE qa_item_id = ?`);
  const deepQAStmt = db.prepare(`SELECT id, question, answer FROM deep_qa WHERE qa_item_id = ? ORDER BY display_order`);

  return rows.map((row) => {
    const keywords = (keywordsStmt.all(row.id) as KeywordRow[]).map((k) => k.keyword);

    const deepQA = (deepQAStmt.all(row.id) as DeepQARow[]).map((d): DeepQA => ({
      id: d.id,
      question: d.question,
      answer: d.answer,
    }));

    return {
      id: row.id,
      categoryName: row.category_name,
      tag: row.tag,
      tagLabel: row.tag_label,
      isJD: row.is_jd === 1,
      isDeep: row.is_deep === 1,
      question: row.question,
      answer: row.answer,
      tip: row.tip,
      jdTip: row.jd_tip,
      keywords,
      deepQA,
    };
  });
}

export function getCategories(): Category[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.tag,
      c.tag_label,
      c.icon,
      c.is_jd_group,
      c.display_order,
      COUNT(qi.id) AS count
    FROM categories c
    LEFT JOIN qa_items qi ON qi.category_id = c.id
    GROUP BY c.id
    ORDER BY c.display_order
  `).all() as CategoryRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tag: row.tag,
    tagLabel: row.tag_label,
    icon: row.icon,
    isJdGroup: row.is_jd_group === 1,
    displayOrder: row.display_order,
    count: row.count,
  }));
}
