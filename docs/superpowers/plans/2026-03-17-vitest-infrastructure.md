# Vitest 테스트 인프라 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vitest 기반 테스트 인프라를 도입하여 data-access, React 컴포넌트, 유틸리티 3개 레이어를 모두 테스트할 수 있게 한다.

**Architecture:** DB 레이어에 DI(setDb/resetDb)를 추가하고 Proxy로 하위 호환을 유지한다. data-access의 prepared statement를 lazy 생성으로 변경하여 테스트에서 in-memory SQLite를 주입할 수 있게 한다.

**Tech Stack:** Vitest, @testing-library/react, @testing-library/jest-dom, jsdom, @vitejs/plugin-react, better-sqlite3 (in-memory)

**Spec:** `docs/superpowers/specs/2026-03-17-vitest-infrastructure-design.md`

---

### Task 1: 패키지 설치 및 기본 설정

**Files:**

- Modify: `package.json` (devDependencies, scripts)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: devDependencies 설치**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

- [ ] **Step 2: package.json에 test 스크립트 추가**

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: vitest.config.ts 생성**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [['src/components/**/*.test.tsx', 'jsdom']],
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 4: src/test/setup.ts 생성**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: 설치 확인**

```bash
pnpm vitest --version
```

Expected: 버전 번호 출력 (에러 없음)

- [ ] **Step 6: 커밋**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/test/setup.ts
git commit -m "chore: add vitest and testing library dependencies"
```

---

### Task 2: DB 레이어 리팩토링 (DI 지원)

**Files:**

- Modify: `src/db/index.ts`

- [ ] **Step 1: src/db/index.ts를 DI 지원 구조로 변경**

기존 전체 내용을 다음으로 교체:

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'intervuddy.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

/** 테스트 전용: 외부 DB 인스턴스 주입 */
export function setDb(instance: Database.Database): void {
  dbInstance = instance;
}

/** 테스트 전용: DB 인스턴스 초기화 */
export function resetDb(): void {
  dbInstance = null;
}

// 하위 호환: 기존 `import db from '@/db'` 유지
export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const value = Reflect.get(getDb(), prop);
    if (typeof value === 'function') {
      return value.bind(getDb());
    }
    return value;
  },
});

export default db;
```

- [ ] **Step 2: 기존 앱이 정상 동작하는지 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공 (에러 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/db/index.ts
git commit -m "refactor: add DI support to db layer with Proxy for backward compat"
```

---

### Task 3: data-access 레이어 리팩토링 (lazy prepared statements)

**Files:**

- Modify: `src/data-access/qa.ts`

- [ ] **Step 1: qa.ts를 lazy prepared statement 방식으로 변경**

기존 전체 내용을 다음으로 교체:

```typescript
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

  const rows = db
    .prepare(
      `
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
  `
    )
    .all() as QAItemRow[];

  const keywordsStmt = db.prepare(`SELECT keyword FROM qa_keywords WHERE qa_item_id = ?`);
  const deepQAStmt = db.prepare(
    `SELECT id, question, answer FROM deep_qa WHERE qa_item_id = ? ORDER BY display_order`
  );

  return rows.map((row) => {
    const keywords = (keywordsStmt.all(row.id) as KeywordRow[]).map((k) => k.keyword);

    const deepQA = (deepQAStmt.all(row.id) as DeepQARow[]).map(
      (d): DeepQA => ({
        id: d.id,
        question: d.question,
        answer: d.answer,
      })
    );

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

  const rows = db
    .prepare(
      `
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
  `
    )
    .all() as CategoryRow[];

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
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add src/data-access/qa.ts
git commit -m "refactor: lazy prepared statements in data-access for test DI support"
```

---

### Task 4: 테스트 헬퍼 생성

**Files:**

- Create: `src/test/helpers/db.ts`

- [ ] **Step 1: src/test/helpers/db.ts 생성**

```typescript
import Database from 'better-sqlite3';
import { setDb, resetDb } from '@/db/index';
import { initializeDatabase } from '@/db/schema';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  setDb(db);
  initializeDatabase();
  return db;
}

export function cleanupTestDb(db: Database.Database): void {
  db.close();
  resetDb();
}

export function seedTestData(db: Database.Database): void {
  db.exec(`
    INSERT INTO categories (name, tag, tag_label, icon, is_jd_group, display_order)
    VALUES ('테스트 카테고리', 'test', '테스트', 'icon', 0, 1);

    INSERT INTO qa_items (category_id, question, answer, is_jd, is_deep, display_order)
    VALUES (1, '테스트 질문', '테스트 답변', 0, 0, 1);

    INSERT INTO qa_keywords (qa_item_id, keyword) VALUES (1, '테스트키워드');

    INSERT INTO deep_qa (qa_item_id, question, answer, display_order)
    VALUES (1, '꼬리질문', '꼬리답변', 1);
  `);
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/test/helpers/db.ts
git commit -m "chore: add test helper for in-memory SQLite DB setup"
```

---

### Task 5: 유틸리티 레이어 샘플 테스트

**Files:**

- Create: `src/lib/utils.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('여러 클래스를 병합한다', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('충돌하는 Tailwind 클래스를 병합한다', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('falsy 값을 무시한다', () => {
    expect(cn('px-2', false && 'py-1', undefined, null, 'mt-2')).toBe('px-2 mt-2');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 통과 확인**

```bash
pnpm test src/lib/utils.test.ts
```

Expected: 3개 테스트 PASS (cn은 이미 구현되어 있으므로 바로 통과)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/utils.test.ts
git commit -m "test: add unit tests for cn utility"
```

---

### Task 6: data-access 레이어 샘플 테스트

**Files:**

- Create: `src/data-access/qa.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
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
    db = createTestDb(); // 시드 없이 빈 DB
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
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test src/data-access/qa.test.ts
```

Expected: 6개 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
git add src/data-access/qa.test.ts
git commit -m "test: add data-access layer tests for getAllQAItems and getCategories"
```

---

### Task 7: React 컴포넌트 레이어 샘플 테스트

**Files:**

- Create: `src/components/interview/tip-box.test.tsx`

참고: `TipBox`는 서버/클라이언트 구분 없는 순수 렌더링 컴포넌트이므로 컴포넌트 테스트 대상으로 적합하다.

- [ ] **Step 1: 테스트 작성**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TipBox } from './tip-box';

describe('TipBox', () => {
  it('팁 텍스트를 렌더링한다', () => {
    render(<TipBox tip="면접 팁 내용" />);
    expect(screen.getByText('면접 팁 내용')).toBeInTheDocument();
  });

  it('기본 type이 tip이면 💡 면접 팁 라벨을 표시한다', () => {
    render(<TipBox tip="내용" />);
    expect(screen.getByText('💡 면접 팁')).toBeInTheDocument();
  });

  it('type이 jd이면 📌 JD 연결 라벨을 표시한다', () => {
    render(<TipBox tip="JD 내용" type="jd" />);
    expect(screen.getByText('📌 JD 연결')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test src/components/interview/tip-box.test.tsx
```

Expected: 3개 테스트 PASS (jsdom 환경에서 실행)

- [ ] **Step 3: 커밋**

```bash
git add src/components/interview/tip-box.test.tsx
git commit -m "test: add component tests for TipBox"
```

---

### Task 8: 전체 테스트 실행 및 최종 확인

- [ ] **Step 1: 전체 테스트 스위트 실행**

```bash
pnpm test
```

Expected: 12개 테스트 모두 PASS (utils 3 + qa 6 + tip-box 3)

- [ ] **Step 2: 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공

- [ ] **Step 3: CLAUDE.md 디렉토리 구조에 test/ 추가**

`CLAUDE.md`의 디렉토리 구조 섹션에 `test/` 추가:

```
src/
├── ...
├── test/            # 테스트 헬퍼 및 setup
└── lib/             # 유틸리티, 상수
```

명령어 섹션에 추가:

```bash
pnpm test             # 테스트 실행
pnpm test:watch       # 테스트 watch 모드
```

- [ ] **Step 4: 최종 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with test infrastructure info"
```
