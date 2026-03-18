# Vitest 테스트 인프라 설계

## 개요

Intervuddy 프로젝트에 Vitest 기반 테스트 인프라를 도입한다. 3개 레이어(data-access, React 컴포넌트, lib/유틸리티)를 모두 지원하며, 병렬 worktree에서 독립적으로 테스트할 수 있는 구조를 만든다.

## 배경

- 프로젝트에 테스트 프레임워크가 없어 CLAUDE.md의 TDD 워크플로우를 수행할 수 없음
- SQLite DB 경로가 하드코딩되어 테스트와 개발 데이터가 분리되지 않음
- `data-access/qa.ts`가 모듈 로드 시점에 DB를 바인딩하여 테스트에서 in-memory DB 주입 불가

## 설계

### 1. 패키지 설치

**devDependencies에 추가:**

- `vitest` — 테스트 러너
- `@testing-library/react` — React 컴포넌트 테스트
- `@testing-library/jest-dom` — DOM matcher 확장
- `jsdom` — 브라우저 환경 시뮬레이션
- `@vitejs/plugin-react` — JSX/React transform

### 2. DB 레이어 리팩토링

**목표:** 프로덕션 동작 변경 없이, 테스트에서 in-memory DB를 주입할 수 있는 구조로 변경.

#### `src/db/index.ts` 변경

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
export function setDb(db: Database.Database): void {
  dbInstance = db;
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

핵심 변경:

- `globalThis` 캐싱 → 모듈 레벨 `dbInstance` 변수
- `setDb()` / `resetDb()` 추가 (테스트 전용)
- `db` export는 Proxy로 감싸서 항상 최신 `dbInstance`를 참조 → 기존 코드 변경 불필요
- Proxy의 `get` 트랩에서 함수는 반드시 `bind(getDb())`로 바인딩 — better-sqlite3의 네이티브 C++ 메서드가 올바른 `this` 컨텍스트를 요구하기 때문

#### `src/data-access/qa.ts` 변경

prepared statement를 모듈 로드 시점이 아닌 함수 호출 시점에 생성하도록 변경:

```typescript
import { getDb } from '../db/index';
import type { QAItem, Category, DeepQA } from './types';

export function getAllQAItems(): QAItem[] {
  const db = getDb();
  const rows = db.prepare(`SELECT ...`).all() as QAItemRow[];
  // ... 기존 로직 동일
}

export function getCategories(): Category[] {
  const db = getDb();
  const rows = db.prepare(`SELECT ...`).all() as CategoryRow[];
  // ... 기존 로직 동일
}
```

**트레이드오프:** prepared statement 캐싱이 사라지나, 현재 규모(수십~수백 건)에서 성능 영향 무시 가능. 필요 시 나중에 lazy singleton 패턴으로 캐싱 추가 가능.

### 3. 테스트 헬퍼

#### `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
```

#### `src/test/helpers/db.ts`

```typescript
import Database from 'better-sqlite3';
import { setDb, resetDb } from '@/db/index';
import { initializeDatabase } from '@/db/schema';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  setDb(db);
  initializeDatabase(); // 스키마 생성
  return db;
}

export function cleanupTestDb(db: Database.Database): void {
  db.close();
  resetDb();
}

export function seedTestData(db: Database.Database): void {
  // 테스트용 최소 시드 데이터
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

### 4. Vitest 설정

#### `vitest.config.ts`

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

### 5. package.json 스크립트

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 6. 테스트 파일 위치

co-located 방식 — 소스 파일 옆에 배치:

```
src/
├── data-access/
│   ├── qa.ts
│   └── qa.test.ts          # data-access 레이어 테스트
├── components/
│   └── interview/
│       ├── qa-card.tsx
│       └── qa-card.test.tsx # 컴포넌트 테스트
├── lib/
│   ├── utils.ts
│   └── utils.test.ts       # 유틸리티 테스트
└── test/
    ├── setup.ts             # 전역 setup
    └── helpers/
        └── db.ts            # DB 테스트 헬퍼
```

### 7. 샘플 테스트

각 레이어의 테스트 예시를 하나씩 작성하여 인프라가 제대로 동작하는지 검증한다.

#### data-access (`qa.test.ts`)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, cleanupTestDb, seedTestData } from '@/test/helpers/db';
import { getAllQAItems, getCategories } from './qa';

describe('getAllQAItems', () => {
  let db: ReturnType<typeof createTestDb>;

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
  });
});
```

#### React 컴포넌트 (`tip-box.test.tsx`)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TipBox } from './tip-box';

describe('TipBox', () => {
  it('팁 텍스트를 렌더링한다', () => {
    render(<TipBox tip="면접 팁 내용" />);
    expect(screen.getByText('면접 팁 내용')).toBeInTheDocument();
  });
});
```

#### 유틸리티 (`utils.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('클래스를 병합한다', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
});
```

## 병렬 테스트 격리

Vitest는 기본적으로 각 테스트 파일을 별도 worker에서 실행한다 (forks pool). `dbInstance`가 모듈 레벨 싱글턴이므로, 이 worker 격리가 테스트 간 DB 간섭을 방지한다. `--pool=vmThreads` 또는 `--single-thread` 모드는 사용하지 않는다.

## 모듈 임포트 시점

리팩토링 후 `data-access/qa.ts`를 import해도 DB 접근이 발생하지 않는다. prepared statement가 함수 호출 시점에 생성되므로, import 순서에 관계없이 `setDb()` 호출 후 함수를 실행하면 된다.

## 변경 영향 범위

| 파일                    | 변경 내용                                        | 기존 동작 영향                                   |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `src/db/index.ts`       | `setDb`/`resetDb` 추가, Proxy export (bind 포함) | 없음 (Proxy가 동일 인터페이스 제공)              |
| `src/data-access/qa.ts` | prepared statement lazy 생성                     | 없음 (동일 쿼리 결과)                            |
| `src/db/schema.ts`      | 변경 없음                                        | 없음 (Proxy를 통해 정상 동작)                    |
| `src/db/seed.ts`        | 변경 없음                                        | 없음 (Proxy bind로 `transaction()` 등 정상 동작) |
| `package.json`          | devDeps 추가, test 스크립트 추가                 | 없음                                             |
| `.gitignore`            | `coverage/` 추가                                 | 없음                                             |
| 신규 파일               | vitest.config.ts, setup.ts, helpers/db.ts        | 해당 없음                                        |
