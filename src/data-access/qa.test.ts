import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestData } from '@/test/helpers/db';
import { getAllQAItems, getCategories } from './qa';

describe('getAllQAItems', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  it('시드된 QA 아이템을 반환한다', () => {
    const items = getAllQAItems();
    expect(items).toHaveLength(1);
    expect(items[0].question).toBe('테스트 질문');
    expect(items[0].answer).toBe('테스트 답변');
  });

  it('키워드를 포함한다', () => {
    const items = getAllQAItems();
    expect(items[0].keywords).toEqual(['테스트키워드']);
  });

  it('꼬리질문을 포함한다', () => {
    const items = getAllQAItems();
    expect(items[0].deepQA).toHaveLength(1);
    expect(items[0].deepQA[0].question).toBe('꼬리질문');
  });

  it('빈 DB에서 빈 배열을 반환한다', () => {
    cleanupTestDb(db);
    db = createTestDb();
    const items = getAllQAItems();
    expect(items).toEqual([]);
  });
});

describe('getCategories', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  it('시드된 카테고리를 반환한다', () => {
    const categories = getCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('테스트 카테고리');
    expect(categories[0].tag).toBe('test');
  });

  it('카테고리별 QA 아이템 수를 포함한다', () => {
    const categories = getCategories();
    expect(categories[0].count).toBe(1);
  });
});
