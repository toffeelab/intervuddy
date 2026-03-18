# 테마/CRUD/JD 관리 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intervuddy에 테마 토글, Q&A CRUD, JD 관리, 소프트 삭제/복구 기능을 추가한다.

**Architecture:** 5개의 순차/병렬 feature 브랜치로 분리하여 구현. DB 스키마 v2로 리디자인 후, Server Actions 기반 CRUD와 관리/학습 UI를 구축. 테마 시스템은 독립 브랜치로 병렬 진행.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript 5, SQLite (better-sqlite3), Zustand, Tailwind CSS v4, shadcn/ui, Vitest

**Spec:** `docs/superpowers/specs/2026-03-17-theme-crud-jd-management-design.md`

---

## 브랜치 구조 및 병렬성

```
병렬 A: feature/theme-mode-toggle          (독립)
병렬 B: feature/interview-schema-v2        (기반)
      → feature/question-crud-actions      (B 이후)
      → feature/job-description-management (위 이후)
      → feature/soft-delete-and-recovery   (위 이후)
```

---

## Branch 1: feature/theme-mode-toggle (병렬 A — 독립)

### 파일 맵

| 액션    | 파일                                       | 역할                                 |
| ------- | ------------------------------------------ | ------------------------------------ |
| Create  | `src/stores/theme-store.ts`                | 테마 상태 관리 (Zustand)             |
| Create  | `src/components/shared/theme-toggle.tsx`   | 테마 토글 버튼 컴포넌트              |
| Create  | `src/components/shared/theme-provider.tsx` | 테마 초기화 + SSR hydration          |
| Create  | `src/components/shared/theme-script.tsx`   | FOUC 방지 인라인 스크립트            |
| Create  | `src/stores/theme-store.test.ts`           | 테마 스토어 테스트                   |
| Modify  | `src/app/globals.css`                      | 라이트 모드 CSS 변수 추가            |
| Modify  | `src/app/layout.tsx`                       | ThemeProvider 래핑, dark 클래스 제거 |
| Install | shadcn `dropdown-menu`                     | 테마 선택 드롭다운                   |

---

### Task 1.1: 테마 Zustand 스토어

**Files:**

- Create: `src/stores/theme-store.ts`
- Test: `src/stores/theme-store.test.ts`

- [ ] **Step 1: 테마 스토어 테스트 작성**

```typescript
// src/stores/theme-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore } from './theme-store';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('theme-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useThemeStore.setState({ mode: 'system', resolvedTheme: 'dark' });
  });

  it('초기 모드는 system', () => {
    expect(useThemeStore.getState().mode).toBe('system');
  });

  it('setMode로 테마 변경', () => {
    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });

  it('dark 모드 설정', () => {
    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('system 모드는 시스템 설정을 따름', () => {
    // matchMedia mock
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true, // prefers-color-scheme: dark
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );
    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/stores/theme-store.test.ts`
Expected: FAIL — `theme-store` 모듈 없음

- [ ] **Step 3: 테마 스토어 구현**

```typescript
// src/stores/theme-store.ts
import { create } from 'zustand';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setMode: (mode: ThemeMode) => void;
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function persistMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('iv-theme', mode);
  document.cookie = `iv-theme=${mode};path=/;max-age=31536000;SameSite=Lax`;
}

function applyTheme(resolved: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  html.classList.add(resolved);
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'system',
  resolvedTheme: 'dark',

  setMode: (mode) => {
    const resolvedTheme = resolveTheme(mode);
    persistMode(mode);
    applyTheme(resolvedTheme);
    set({ mode, resolvedTheme });
  },
}));
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/stores/theme-store.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/stores/theme-store.ts src/stores/theme-store.test.ts
git commit -m "feat: 테마 모드 Zustand 스토어 구현"
```

---

### Task 1.2: 라이트 모드 CSS 변수

**Files:**

- Modify: `src/app/globals.css`

- [ ] **Step 1: globals.css에 라이트 모드 `--iv-*` 변수 추가**

현재 `:root`에 다크 모드 `--iv-*` 변수가 정의되어 있음. 이를 `.dark` 블록으로 이동하고, `:root`에 라이트 모드 값을 설정.

`:root`의 `--iv-*` 변수를 다음으로 교체:

```css
:root {
  /* ... 기존 shadcn 변수 유지 ... */

  /* Intervuddy light mode */
  --iv-bg: #ffffff;
  --iv-bg2: #f3f4f6;
  --iv-bg3: #e5e7eb;
  --iv-border: rgba(0, 0, 0, 0.08);
  --iv-border2: rgba(0, 0, 0, 0.15);
  --iv-text: #1a1a2e;
  --iv-text2: #4b5563;
  --iv-text3: #9ca3af;
  --iv-accent: #4f8ef7;
  --iv-accent2: #7c6cf0;
  --iv-green: #3ecf8e;
  --iv-amber: #f59e0b;
  --iv-red: #f87171;
  --iv-pink: #e879a0;
  --iv-jd: #22d3ee;
}
```

`.dark` 블록에 기존 `--iv-*` 다크 값 추가:

```css
.dark {
  /* ... 기존 shadcn dark 변수 유지 ... */

  /* Intervuddy dark mode */
  --iv-bg: #0d0f14;
  --iv-bg2: #13161d;
  --iv-bg3: #1a1e28;
  --iv-border: rgba(255, 255, 255, 0.07);
  --iv-border2: rgba(255, 255, 255, 0.13);
  --iv-text: #e8eaf0;
  --iv-text2: #8b90a0;
  --iv-text3: #555b6e;
  --iv-accent: #4f8ef7;
  --iv-accent2: #7c6cf0;
  --iv-green: #3ecf8e;
  --iv-amber: #f59e0b;
  --iv-red: #f87171;
  --iv-pink: #e879a0;
  --iv-jd: #22d3ee;
}
```

스크롤바 색상도 테마 대응:

```css
@layer base {
  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
  }
  .dark ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공 (CSS 파싱 오류 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/app/globals.css
git commit -m "feat: 라이트 모드 CSS 변수 추가"
```

---

### Task 1.3: FOUC 방지 스크립트 + ThemeProvider

**Files:**

- Create: `src/components/shared/theme-script.tsx`
- Create: `src/components/shared/theme-provider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: FOUC 방지 인라인 스크립트 작성**

```typescript
// src/components/shared/theme-script.tsx
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var mode = localStorage.getItem('iv-theme') || 'system';
        var resolved = mode;
        if (mode === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(resolved);
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
```

- [ ] **Step 2: ThemeProvider 작성**

```typescript
// src/components/shared/theme-provider.tsx
'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setMode = useThemeStore((s) => s.setMode);

  useEffect(() => {
    const saved = localStorage.getItem('iv-theme') as 'dark' | 'light' | 'system' | null;
    if (saved) {
      setMode(saved);
    } else {
      setMode('system');
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (useThemeStore.getState().mode === 'system') {
        setMode('system');
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [setMode]);

  return <>{children}</>;
}
```

- [ ] **Step 3: layout.tsx 수정**

`src/app/layout.tsx`에서:

1. `<html className="dark">` → `<html className="">` (ThemeScript가 처리)
2. `<head>` 안에 `<ThemeScript />` 추가
3. `<body>` 안에 `<ThemeProvider>` 래핑

```typescript
import { ThemeScript } from '@/components/shared/theme-script';
import { ThemeProvider } from '@/components/shared/theme-provider';

export default function RootLayout({ children }: ...) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${notoSansKR.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-iv-bg text-iv-text`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 개발 서버에서 동작 확인**

Run: `pnpm dev`
브라우저에서 확인: 페이지 로드 시 깜빡임 없이 테마 적용

- [ ] **Step 5: 커밋**

```bash
git add src/components/shared/theme-script.tsx src/components/shared/theme-provider.tsx src/app/layout.tsx
git commit -m "feat: ThemeProvider 및 FOUC 방지 스크립트 추가"
```

---

### Task 1.4: 테마 토글 버튼 UI

**Files:**

- Create: `src/components/shared/theme-toggle.tsx`
- Modify: `src/components/interview/interview-header.tsx` (현재 헤더에 추가)

- [ ] **Step 1: shadcn dropdown-menu 설치**

Run: `pnpm dlx shadcn@latest add dropdown-menu`

- [ ] **Step 2: 테마 토글 컴포넌트 작성**

```typescript
// src/components/shared/theme-toggle.tsx
'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThemeStore } from '@/stores/theme-store';

const THEME_OPTIONS = [
  { value: 'light' as const, label: '라이트', icon: Sun },
  { value: 'dark' as const, label: '다크', icon: Moon },
  { value: 'system' as const, label: '시스템', icon: Monitor },
];

export function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useThemeStore();

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">테마 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setMode(value)}
            className={mode === value ? 'bg-accent' : ''}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: 헤더에 ThemeToggle 추가**

`src/components/interview/interview-header.tsx`의 헤더 우측에 `<ThemeToggle />` 배치.

- [ ] **Step 4: 개발 서버에서 동작 확인**

Run: `pnpm dev`
브라우저에서: 토글 클릭 → dark/light/system 전환 동작, 새로고침 시 설정 유지

- [ ] **Step 5: 커밋**

```bash
git add src/components/shared/theme-toggle.tsx src/components/ui/dropdown-menu.tsx src/components/interview/interview-header.tsx
git commit -m "feat: 헤더에 테마 토글 드롭다운 추가"
```

---

## Branch 2: feature/interview-schema-v2 (병렬 B — 기반)

### 파일 맵

| 액션    | 파일                                                               | 역할                       |
| ------- | ------------------------------------------------------------------ | -------------------------- |
| Rewrite | `src/db/schema.ts`                                                 | 스키마 v2 DDL              |
| Rewrite | `src/data-access/types.ts`                                         | 새 타입 정의               |
| Rewrite | `src/data-access/qa.ts` → `src/data-access/questions.ts`           | 질문 data-access           |
| Create  | `src/data-access/jobs.ts`                                          | JD data-access             |
| Create  | `src/data-access/categories.ts`                                    | 카테고리 data-access       |
| Rewrite | `src/data-access/index.ts`                                         | re-exports                 |
| Rewrite | `src/test/helpers/db.ts`                                           | 테스트 헬퍼 (새 스키마)    |
| Rewrite | `src/data-access/qa.test.ts` → `src/data-access/questions.test.ts` | 테스트                     |
| Create  | `src/data-access/jobs.test.ts`                                     | JD 테스트                  |
| Create  | `src/data-access/categories.test.ts`                               | 카테고리 테스트            |
| Create  | `src/lib/retention-policy.ts`                                      | 소프트 삭제 보관 정책 상수 |
| Rename  | `src/app/interview/` → `src/app/study/`                            | 라우트 리네임              |
| Rename  | `src/components/interview/` → `src/components/study/`              | 컴포넌트 리네임            |
| Rename  | `src/stores/interview-store.ts` → `src/stores/study-store.ts`      | 스토어 리네임              |
| Modify  | 기존 컴포넌트 import 경로                                          | 리네임 반영                |
| Rewrite | `data/seed.sample.ts`                                              | 새 스키마용 시드           |

---

### Task 2.1: 스키마 v2 DDL + 테스트 헬퍼

**Files:**

- Rewrite: `src/db/schema.ts`
- Rewrite: `src/test/helpers/db.ts`
- Create: `src/lib/retention-policy.ts`

- [ ] **Step 1: retention-policy 상수 작성**

```typescript
// src/lib/retention-policy.ts
export const DEFAULT_RETENTION_DAYS = 30;
```

- [ ] **Step 2: schema.ts를 스펙 3.3 DDL로 교체**

`src/db/schema.ts`를 스펙 문서의 DDL(job_descriptions, interview_categories, interview_questions, followup_questions, question_keywords) + 트리거(3.4)로 전체 교체. `initializeDatabase()` 함수 내에서 실행.

- [ ] **Step 3: 테스트 헬퍼 수정**

```typescript
// src/test/helpers/db.ts
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

export function seedTestCategories(db: Database.Database): void {
  db.exec(`
    INSERT INTO interview_categories (name, slug, display_label, icon, display_order)
    VALUES
      ('자기소개/커리어', 'self-intro', '자기소개', '👤', 1),
      ('기술역량', 'tech', '기술', '⚙️', 2);
  `);
}

export function seedTestQuestions(db: Database.Database): void {
  seedTestCategories(db);
  db.exec(`
    INSERT INTO interview_questions (category_id, question, answer, tip, display_order)
    VALUES (1, '자기소개를 해주세요', '저는 5년차 개발자입니다', '구체적 수치를 포함하세요', 1);

    INSERT INTO question_keywords (question_id, keyword) VALUES (1, '자기소개');
    INSERT INTO question_keywords (question_id, keyword) VALUES (1, '경력');

    INSERT INTO followup_questions (question_id, question, answer, display_order)
    VALUES (1, '가장 어려웠던 프로젝트는?', '실시간 통신 시스템 구축', 1);
  `);
}

export function seedTestJobDescription(db: Database.Database): void {
  db.exec(`
    INSERT INTO job_descriptions (company_name, position_title, status, memo)
    VALUES ('네이버', '프론트엔드 시니어', 'in_progress', '웹 플랫폼팀');
  `);
}
```

- [ ] **Step 4: 스키마 초기화 테스트**

Run: `pnpm test src/data-access/`
Expected: 기존 테스트 실패 (스키마 변경으로)

- [ ] **Step 5: 커밋**

```bash
git add src/db/schema.ts src/test/helpers/db.ts src/lib/retention-policy.ts
git commit -m "feat: DB 스키마 v2 DDL 및 테스트 헬퍼 재구성"
```

---

### Task 2.2: 타입 재정의

**Files:**

- Rewrite: `src/data-access/types.ts`

- [ ] **Step 1: 새 타입 정의**

```typescript
// src/data-access/types.ts

export interface FollowupQuestion {
  id: number;
  questionId: number;
  question: string;
  answer: string;
  displayOrder: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewQuestion {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryDisplayLabel: string;
  jdId: number | null;
  originQuestionId: number | null;
  question: string;
  answer: string;
  tip: string | null;
  displayOrder: number;
  keywords: string[];
  followups: FollowupQuestion[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCategory {
  id: number;
  jdId: number | null;
  name: string;
  slug: string;
  displayLabel: string;
  icon: string;
  displayOrder: number;
  questionCount: number;
  deletedAt: string | null;
  createdAt: string;
}

export type JobDescriptionStatus = 'in_progress' | 'completed' | 'archived';

export interface JobDescription {
  id: number;
  companyName: string;
  positionTitle: string;
  status: JobDescriptionStatus;
  memo: string | null;
  questionCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Server Action 입력 타입
export interface CreateQuestionInput {
  categoryId: number;
  jdId?: number | null;
  question: string;
  answer: string;
  tip?: string | null;
}

export interface UpdateQuestionInput {
  id: number;
  question?: string;
  answer?: string;
  tip?: string | null;
}

export interface CreateFollowupInput {
  questionId: number;
  question: string;
  answer: string;
}

export interface UpdateFollowupInput {
  id: number;
  question?: string;
  answer?: string;
}

export interface CreateJobInput {
  companyName: string;
  positionTitle: string;
  memo?: string | null;
}

export interface UpdateJobInput {
  id: number;
  companyName?: string;
  positionTitle?: string;
  status?: JobDescriptionStatus;
  memo?: string | null;
}

export interface CreateCategoryInput {
  jdId?: number | null;
  name: string;
  slug: string;
  displayLabel: string;
  icon: string;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/data-access/types.ts
git commit -m "feat: 스키마 v2 기반 타입 재정의"
```

---

### Task 2.3: 카테고리 data-access

**Files:**

- Create: `src/data-access/categories.ts`
- Create: `src/data-access/categories.test.ts`

- [ ] **Step 1: 카테고리 테스트 작성**

```typescript
// src/data-access/categories.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestCategories } from '@/test/helpers/db';
import { getGlobalCategories, getCategoriesByJdId, createCategory } from './categories';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('getGlobalCategories', () => {
  it('공통 카테고리만 반환', () => {
    seedTestCategories(db);
    const cats = getGlobalCategories();
    expect(cats.length).toBe(2);
    expect(cats[0].name).toBe('자기소개/커리어');
    expect(cats[0].jdId).toBeNull();
  });
});

describe('createCategory', () => {
  it('공통 카테고리 생성', () => {
    const id = createCategory({ name: '새 카테고리', slug: 'new', displayLabel: '새', icon: '🆕' });
    expect(id).toBeGreaterThan(0);
    const cats = getGlobalCategories();
    expect(cats.find((c) => c.slug === 'new')).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/categories.test.ts`
Expected: FAIL

- [ ] **Step 3: 카테고리 data-access 구현**

`src/data-access/categories.ts`에 `getGlobalCategories()`, `getCategoriesByJdId(jdId)`, `createCategory(input)`, `updateCategory(id, input)`, `softDeleteCategory(id)`, `restoreCategory(id)` 구현. 모든 조회 함수에 `WHERE deleted_at IS NULL` 조건 포함.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/categories.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/categories.ts src/data-access/categories.test.ts
git commit -m "feat: 카테고리 data-access 레이어 구현"
```

---

### Task 2.4: 질문 data-access

**Files:**

- Create: `src/data-access/questions.ts` (기존 `qa.ts` 대체)
- Create: `src/data-access/questions.test.ts`
- Delete: `src/data-access/qa.ts`, `src/data-access/qa.test.ts`

- [ ] **Step 1: 질문 테스트 작성**

```typescript
// src/data-access/questions.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestQuestions } from '@/test/helpers/db';
import {
  getQuestionsByCategory,
  getQuestionsByJdId,
  getLibraryQuestions,
  createQuestion,
  updateQuestion,
  softDeleteQuestion,
  restoreQuestion,
} from './questions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('getLibraryQuestions', () => {
  it('공통 라이브러리 질문 반환 (jd_id IS NULL)', () => {
    seedTestQuestions(db);
    const questions = getLibraryQuestions();
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].jdId).toBeNull();
    expect(questions[0].keywords).toContain('자기소개');
    expect(questions[0].followups.length).toBe(1);
  });
});

describe('createQuestion', () => {
  it('질문 생성 후 조회 가능', () => {
    seedTestQuestions(db);
    const id = createQuestion({ categoryId: 1, question: '새 질문', answer: '새 답변' });
    expect(id).toBeGreaterThan(0);
    const questions = getLibraryQuestions();
    expect(questions.find((q) => q.id === id)).toBeDefined();
  });
});

describe('softDeleteQuestion / restoreQuestion', () => {
  it('소프트 삭제 후 조회에서 제외, 복구 후 다시 포함', () => {
    seedTestQuestions(db);
    const questions = getLibraryQuestions();
    const id = questions[0].id;

    softDeleteQuestion(id);
    expect(getLibraryQuestions().find((q) => q.id === id)).toBeUndefined();

    restoreQuestion(id);
    expect(getLibraryQuestions().find((q) => q.id === id)).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/questions.test.ts`
Expected: FAIL

- [ ] **Step 3: 질문 data-access 구현**

`src/data-access/questions.ts`에 구현:

- `getLibraryQuestions()`: `WHERE jd_id IS NULL AND deleted_at IS NULL`
- `getQuestionsByJdId(jdId)`: 해당 JD의 질문
- `getQuestionsByCategory(categoryId)`: 카테고리별 질문
- `createQuestion(input)`: 생성 + category/jd 무결성 검증
- `updateQuestion(input)`: 부분 업데이트
- `softDeleteQuestion(id)`: `deleted_at = datetime('now')`
- `restoreQuestion(id)`: `deleted_at = NULL`
- `getDeletedQuestions(jdId?)`: 삭제된 질문 조회

각 질문에 keywords, followups를 JOIN하여 로딩 (기존 `qa.ts` 패턴 유지).

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/questions.test.ts`
Expected: PASS

- [ ] **Step 5: 기존 qa.ts, qa.test.ts 삭제**

```bash
git rm src/data-access/qa.ts src/data-access/qa.test.ts
```

- [ ] **Step 6: 커밋**

```bash
git add src/data-access/questions.ts src/data-access/questions.test.ts
git commit -m "feat: 질문 data-access 레이어 구현 (스키마 v2)"
```

---

### Task 2.5: JD data-access

**Files:**

- Create: `src/data-access/jobs.ts`
- Create: `src/data-access/jobs.test.ts`

- [ ] **Step 1: JD 테스트 작성**

```typescript
// src/data-access/jobs.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestJobDescription } from '@/test/helpers/db';
import {
  getAllJobs,
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJob,
  restoreJob,
} from './jobs';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('createJob / getAllJobs', () => {
  it('JD 생성 및 조회', () => {
    const id = createJob({ companyName: '카카오', positionTitle: '백엔드' });
    const jobs = getAllJobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].companyName).toBe('카카오');
    expect(jobs[0].status).toBe('in_progress');
  });
});

describe('updateJobStatus', () => {
  it('상태 변경', () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    updateJobStatus(jobs[0].id, 'completed');
    const updated = getAllJobs();
    expect(updated[0].status).toBe('completed');
  });
});

describe('softDeleteJob / restoreJob', () => {
  it('JD 소프트 삭제 및 복구', () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    const id = jobs[0].id;

    softDeleteJob(id);
    expect(getAllJobs().length).toBe(0);

    restoreJob(id);
    expect(getAllJobs().length).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/jobs.test.ts`
Expected: FAIL

- [ ] **Step 3: JD data-access 구현**

`src/data-access/jobs.ts`에 `getAllJobs()`, `getJobById(id)`, `createJob(input)`, `updateJob(input)`, `updateJobStatus(id, status)`, `softDeleteJob(id)`, `restoreJob(id)`, `getDeletedJobs()` 구현.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/jobs.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/jobs.ts src/data-access/jobs.test.ts
git commit -m "feat: JD data-access 레이어 구현"
```

---

### Task 2.6: data-access index + 꼬리질문 data-access

**Files:**

- Create: `src/data-access/followups.ts`
- Create: `src/data-access/followups.test.ts`
- Rewrite: `src/data-access/index.ts`

- [ ] **Step 1: 꼬리질문 테스트 작성**

`getFollowupsByQuestionId`, `createFollowup`, `updateFollowup`, `softDeleteFollowup`, `restoreFollowup` 테스트.

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/followups.test.ts`
Expected: FAIL

- [ ] **Step 3: 꼬리질문 data-access 구현**

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/followups.test.ts`
Expected: PASS

- [ ] **Step 5: index.ts 재구성**

```typescript
// src/data-access/index.ts
export * from './types';
export * from './questions';
export * from './categories';
export * from './jobs';
export * from './followups';
```

- [ ] **Step 6: 커밋**

```bash
git add src/data-access/followups.ts src/data-access/followups.test.ts src/data-access/index.ts
git commit -m "feat: 꼬리질문 data-access 및 index 재구성"
```

---

### Task 2.7: 리네이밍 + 기존 컴포넌트 마이그레이션

**Files:**

- Rename: `src/app/interview/` → `src/app/study/`
- Rename: `src/components/interview/` → `src/components/study/`
- Rename: `src/stores/interview-store.ts` → `src/stores/study-store.ts`
- Modify: 모든 import 경로

- [ ] **Step 1: 디렉토리/파일 리네임**

```bash
git mv src/app/interview src/app/study
git mv src/components/interview src/components/study
git mv src/stores/interview-store.ts src/stores/study-store.ts
```

- [ ] **Step 2: import 경로 일괄 수정**

모든 `@/components/interview/` → `@/components/study/`
모든 `@/stores/interview-store` → `@/stores/study-store`
`useInterviewStore` → `useStudyStore`
`InterviewStore` → `StudyStore`

- [ ] **Step 3: 기존 컴포넌트를 새 타입에 맞게 수정**

- `qa-list.tsx`: `QAItem` → `InterviewQuestion`, `isJD` 제거, `jdId` 사용
- `qa-card.tsx`: `jdTip` → `tip`, `isDeep` 제거
- `sidebar.tsx`: `Category` → `InterviewCategory`, `isJdGroup` → `jdId !== null`
- `tip-box.tsx`: `jd_tip` 관련 로직 → `tip`으로 통합
- `study-store.ts`: `CATEGORY_ALL` 유지, `selectedJdId` 추가

- [ ] **Step 4: 기존 컴포넌트 테스트 수정 및 통과 확인**

Run: `pnpm test`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/app/study/ src/components/study/ src/stores/study-store.ts src/components/landing/ src/app/page.tsx src/app/layout.tsx src/data-access/ src/lib/
git commit -m "refactor: interview → study 리네이밍 및 스키마 v2 타입 마이그레이션"
```

> 주의: `git add -A` 대신 변경 파일을 명시적으로 지정. 삭제된 원본 경로는 `git mv`로 처리되어 자동 반영됨.

---

### Task 2.8: 시드 데이터 수정

**Files:**

- Rewrite: `data/seed.sample.ts`
- Modify: `src/db/seed.ts`

- [ ] **Step 1: seed.sample.ts를 새 스키마에 맞게 재작성**

새 테이블명(`interview_categories`, `interview_questions`, `followup_questions`, `question_keywords`) 사용. `is_jd`, `is_deep`, `jd_tip` 제거.

- [ ] **Step 2: seed.ts import 경로 확인**

- [ ] **Step 3: 시딩 테스트**

Run: `pnpm db:seed:sample`
Expected: 정상 시딩

- [ ] **Step 4: 커밋**

```bash
git add data/seed.sample.ts src/db/seed.ts
git commit -m "feat: 스키마 v2용 샘플 시드 데이터 재작성"
```

---

## Branch 3: feature/question-crud-actions (B 이후)

### 파일 맵

| 액션    | 파일                                                 | 역할                       |
| ------- | ---------------------------------------------------- | -------------------------- |
| Create  | `src/actions/question-actions.ts`                    | 질문 Server Actions        |
| Create  | `src/actions/followup-actions.ts`                    | 꼬리질문 Server Actions    |
| Create  | `src/actions/category-actions.ts`                    | 카테고리 Server Actions    |
| Create  | `src/stores/edit-store.ts`                           | 편집 UI 상태               |
| Create  | `src/components/shared/inline-edit.tsx`              | 인라인 편집 공통 컴포넌트  |
| Create  | `src/components/study/followup-item.tsx`             | 꼬리질문 개별 항목         |
| Create  | `src/components/study/quick-add-form.tsx`            | 빠른 추가 폼               |
| Modify  | `src/components/study/qa-card.tsx`                   | 간편편집 추가              |
| Modify  | `src/components/study/qa-list.tsx`                   | 빠른 추가 버튼             |
| Install | shadcn `textarea`, `dialog`, `drawer`, `tabs`        | UI 컴포넌트                |
| Create  | `src/app/interviews/layout.tsx`                      | 관리 레이아웃              |
| Create  | `src/app/interviews/page.tsx`                        | JD 목록 (임시 placeholder) |
| Create  | `src/app/interviews/questions/page.tsx`              | 공통 라이브러리 관리       |
| Create  | `src/components/interviews/question-table.tsx`       | 질문 관리 테이블           |
| Create  | `src/components/interviews/question-edit-drawer.tsx` | 전체 편집 드로어           |
| Create  | `src/components/interviews/category-manager.tsx`     | 카테고리 관리              |

---

### Task 3.1: Server Actions (질문/꼬리질문/카테고리)

**Files:**

- Create: `src/actions/question-actions.ts`
- Create: `src/actions/followup-actions.ts`
- Create: `src/actions/category-actions.ts`

- [ ] **Step 1: 질문 Server Actions 작성**

```typescript
// src/actions/question-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import {
  createQuestion as dbCreate,
  updateQuestion as dbUpdate,
  softDeleteQuestion as dbDelete,
  restoreQuestion as dbRestore,
} from '@/data-access/questions';
import type { CreateQuestionInput, UpdateQuestionInput } from '@/data-access/types';

export async function createQuestionAction(input: CreateQuestionInput) {
  const id = dbCreate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
  return { id };
}

export async function updateQuestionAction(input: UpdateQuestionInput) {
  dbUpdate(input);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function deleteQuestionAction(id: number) {
  dbDelete(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}

export async function restoreQuestionAction(id: number) {
  dbRestore(id);
  revalidatePath('/study');
  revalidatePath('/interviews/questions');
}
```

- [ ] **Step 2: 꼬리질문/카테고리 Server Actions 동일 패턴으로 작성**

- [ ] **Step 3: 커밋**

```bash
git add src/actions/
git commit -m "feat: 질문/꼬리질문/카테고리 Server Actions 구현"
```

---

### Task 3.2: 인라인 편집 공통 컴포넌트

**Files:**

- Create: `src/components/shared/inline-edit.tsx`
- Create: `src/stores/edit-store.ts`
- Install: shadcn `textarea`

- [ ] **Step 1: shadcn textarea 설치**

Run: `pnpm dlx shadcn@latest add textarea`

- [ ] **Step 2: edit-store 작성**

```typescript
// src/stores/edit-store.ts
import { create } from 'zustand';

interface EditStore {
  editingItemId: string | null; // "question-5", "followup-3" 등
  drawerOpen: boolean;
  drawerTargetId: number | null;

  startEditing: (itemId: string) => void;
  stopEditing: () => void;
  openDrawer: (targetId: number) => void;
  closeDrawer: () => void;
}

export const useEditStore = create<EditStore>((set) => ({
  editingItemId: null,
  drawerOpen: false,
  drawerTargetId: null,

  startEditing: (itemId) => set({ editingItemId: itemId }),
  stopEditing: () => set({ editingItemId: null }),
  openDrawer: (targetId) => set({ drawerOpen: true, drawerTargetId: targetId }),
  closeDrawer: () => set({ drawerOpen: false, drawerTargetId: null }),
}));
```

- [ ] **Step 3: inline-edit 컴포넌트 작성**

```typescript
// src/components/shared/inline-edit.tsx
'use client';
// 클릭 → textarea 전환, blur/Ctrl+Enter → 저장, Escape → 취소
// Props: value, onSave, multiline?, className?
```

textarea 또는 input으로 전환되는 공통 컴포넌트. `onSave(newValue)` 콜백으로 Server Action 호출.

- [ ] **Step 4: 커밋**

```bash
git add src/components/shared/inline-edit.tsx src/stores/edit-store.ts src/components/ui/textarea.tsx
git commit -m "feat: 인라인 편집 공통 컴포넌트 및 edit-store 구현"
```

---

### Task 3.3: /study 페이지 간편편집 통합

**Files:**

- Create: `src/components/study/followup-item.tsx`
- Create: `src/components/study/quick-add-form.tsx`
- Modify: `src/components/study/qa-card.tsx`
- Modify: `src/components/study/qa-list.tsx`
- Modify: `src/components/study/deep-qa-box.tsx`

- [ ] **Step 1: followup-item 컴포넌트 작성**

개별 꼬리질문을 렌더링하면서 `InlineEdit`로 질문/답변 텍스트 편집 가능. `updateFollowupAction` 호출.

- [ ] **Step 2: quick-add-form 컴포넌트 작성**

질문+답변 입력 → `createQuestionAction` 또는 `createFollowupAction` 호출. 추가 후 폼 리셋.

- [ ] **Step 3: qa-card에 간편편집 통합**

기존 qa-card에:

- 질문 텍스트 → `InlineEdit` 래핑
- 답변 텍스트 → `InlineEdit` 래핑
- 팁 텍스트 → `InlineEdit` 래핑
- `deep-qa-box` → `followup-item` 사용으로 교체
- "상세 편집" 버튼 추가 (드로어 오픈)

- [ ] **Step 4: qa-list에 빠른 추가 버튼 통합**

각 카테고리 그룹 하단에 `<QuickAddForm />` 배치.

- [ ] **Step 5: 개발 서버에서 동작 확인**

Run: `pnpm dev`
브라우저에서: 질문 클릭 → 인라인 편집, "+ 질문 추가" 동작 확인

- [ ] **Step 6: 커밋**

```bash
git add src/components/study/
git commit -m "feat: /study 페이지 간편편집 및 빠른 추가 통합"
```

---

### Task 3.4: /interviews 관리 레이아웃 + 공통 라이브러리 페이지

**Files:**

- Create: `src/app/interviews/layout.tsx`
- Create: `src/app/interviews/page.tsx` (placeholder)
- Create: `src/app/interviews/questions/page.tsx`
- Create: `src/components/interviews/question-table.tsx`
- Create: `src/components/interviews/question-edit-drawer.tsx`
- Create: `src/components/interviews/category-manager.tsx`
- Install: shadcn `dialog`, `drawer`, `tabs`

- [ ] **Step 1: shadcn 컴포넌트 설치**

Run: `pnpm dlx shadcn@latest add dialog drawer tabs`

- [ ] **Step 2: /interviews 레이아웃 작성**

사이드 네비게이션 (JD 목록 링크, 공통 라이브러리 링크) + 메인 콘텐츠 영역. `ThemeToggle` 헤더에 포함.

- [ ] **Step 3: /interviews placeholder 페이지**

JD 목록은 Branch 4에서 구현. 임시로 "JD 관리 페이지 (준비 중)" 표시.

- [ ] **Step 4: question-table 컴포넌트 작성**

질문 목록을 테이블/리스트로 표시. 각 행에 수정/삭제 버튼. 카테고리별 그룹핑.

- [ ] **Step 5: question-edit-drawer 작성**

드로어 내에 전체 편집 폼: 질문, 답변, 팁, 키워드 태그 편집, 꼬리질문 추가/삭제/순서변경, 카테고리 변경.

- [ ] **Step 6: category-manager 작성**

카테고리 추가/수정/삭제 UI. 아이콘 선택, slug 자동 생성.

- [ ] **Step 7: /interviews/questions 페이지 조립**

Server Component에서 `getGlobalCategories()`, `getLibraryQuestions()` 호출 → props로 전달. `QuestionTable`, `CategoryManager`, `QuestionEditDrawer` 조합.

- [ ] **Step 8: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add src/app/interviews/ src/components/interviews/ src/components/ui/dialog.tsx src/components/ui/drawer.tsx src/components/ui/tabs.tsx
git commit -m "feat: /interviews 관리 레이아웃 및 공통 라이브러리 페이지"
```

---

## Branch 4: feature/job-description-management (Branch 3 이후)

### 파일 맵

| 액션    | 파일                                             | 역할                 |
| ------- | ------------------------------------------------ | -------------------- |
| Create  | `src/actions/job-actions.ts`                     | JD Server Actions    |
| Create  | `src/actions/import-actions.ts`                  | 질문 가져오기 Action |
| Create  | `src/data-access/import.ts`                      | 질문 복사 로직       |
| Create  | `src/data-access/import.test.ts`                 | 가져오기 테스트      |
| Create  | `src/components/interviews/job-card.tsx`         | JD 카드              |
| Create  | `src/components/interviews/job-form.tsx`         | JD 생성/수정 폼      |
| Create  | `src/components/interviews/job-status-badge.tsx` | 상태 뱃지            |
| Create  | `src/components/interviews/import-modal.tsx`     | 질문 가져오기 모달   |
| Modify  | `src/app/interviews/page.tsx`                    | JD 목록 실제 구현    |
| Create  | `src/app/interviews/jobs/new/page.tsx`           | JD 생성              |
| Create  | `src/app/interviews/jobs/[id]/page.tsx`          | JD 상세              |
| Create  | `src/app/interviews/jobs/[id]/edit/page.tsx`     | JD 수정              |
| Modify  | `src/components/study/sidebar.tsx`               | JD 선택 드롭다운     |
| Modify  | `src/stores/study-store.ts`                      | selectedJdId 추가    |
| Install | shadcn `select`                                  | JD 선택 드롭다운     |

---

### Task 4.1: 질문 가져오기 data-access

**Files:**

- Create: `src/data-access/import.ts`
- Create: `src/data-access/import.test.ts`

- [ ] **Step 1: import 테스트 작성**

```typescript
// src/data-access/import.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import { importQuestionsToJob } from './import';
import { getQuestionsByJdId } from './questions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('importQuestionsToJob', () => {
  it('라이브러리 질문을 JD로 복사', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);
    const result = importQuestionsToJob({ jdId: 1, questionIds: [1] });
    expect(result.importedCount).toBe(1);

    const jdQuestions = getQuestionsByJdId(1);
    expect(jdQuestions.length).toBe(1);
    expect(jdQuestions[0].originQuestionId).toBe(1);
    expect(jdQuestions[0].jdId).toBe(1);
    // 꼬리질문, 키워드도 복사되었는지 확인
    expect(jdQuestions[0].followups.length).toBe(1);
    expect(jdQuestions[0].keywords.length).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/import.test.ts`
Expected: FAIL

- [ ] **Step 3: import 로직 구현**

`importQuestionsToJob({ jdId, questionIds })`: 각 질문을 복사 (question, answer, tip, display_order) + 키워드 복사 + 꼬리질문 복사. `origin_question_id`에 원본 ID 설정. 트랜잭션으로 감싸기.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/import.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/import.ts src/data-access/import.test.ts
git commit -m "feat: 라이브러리→JD 질문 가져오기 data-access 구현"
```

---

### Task 4.2: JD Server Actions

**Files:**

- Create: `src/actions/job-actions.ts`
- Create: `src/actions/import-actions.ts`

- [ ] **Step 1: JD Server Actions 작성**

`createJobAction`, `updateJobAction`, `updateJobStatusAction`, `deleteJobAction`, `restoreJobAction` — data-access 함수 호출 + `revalidatePath`.

- [ ] **Step 2: import Server Action 작성**

`importQuestionsAction({ jdId, questionIds })` — `importQuestionsToJob` 호출 + revalidate.

- [ ] **Step 3: 커밋**

```bash
git add src/actions/job-actions.ts src/actions/import-actions.ts
git commit -m "feat: JD 및 질문 가져오기 Server Actions"
```

---

### Task 4.3: JD 목록 페이지 + 카드

**Files:**

- Create: `src/components/interviews/job-card.tsx`
- Create: `src/components/interviews/job-status-badge.tsx`
- Modify: `src/app/interviews/page.tsx`

- [ ] **Step 1: job-status-badge 컴포넌트**

`in_progress` → 파란색 "진행중", `completed` → 초록색 "완료", `archived` → 회색 "보관". shadcn Badge 사용.

- [ ] **Step 2: job-card 컴포넌트**

회사명, 포지션, 상태 뱃지, 질문 수, 생성일 표시. 클릭 시 `/interviews/jobs/[id]`로 이동.

- [ ] **Step 3: /interviews 페이지 실제 구현**

Server Component에서 `getAllJobs()` 호출. 상태 필터 (클라이언트 상태). "새 JD 만들기" 버튼 → `/interviews/jobs/new`.

- [ ] **Step 4: 개발 서버 확인**

- [ ] **Step 5: 커밋**

```bash
git add src/components/interviews/job-card.tsx src/components/interviews/job-status-badge.tsx src/app/interviews/page.tsx
git commit -m "feat: JD 목록 페이지 및 카드 컴포넌트"
```

---

### Task 4.4: JD 생성 페이지 + 질문 가져오기 모달

**Files:**

- Create: `src/app/interviews/jobs/new/page.tsx`
- Create: `src/components/interviews/job-form.tsx`
- Create: `src/components/interviews/import-modal.tsx`
- Install: shadcn `select`

- [ ] **Step 1: shadcn select 설치**

Run: `pnpm dlx shadcn@latest add select`

- [ ] **Step 2: job-form 작성**

회사명, 포지션, 메모 입력 폼. 제출 시 `createJobAction` 호출 → 생성된 JD 상세 페이지로 리다이렉트.

- [ ] **Step 3: import-modal 작성**

Dialog 컴포넌트 사용. 내부에 카테고리 필터 + 검색 + 질문 체크박스 리스트. "카테고리 전체 가져오기" 버튼. 이미 가져온 질문은 "가져옴" 뱃지. 선택 후 `importQuestionsAction` 호출.

- [ ] **Step 4: JD 생성 페이지 조립**

`JobForm` + 생성 후 `ImportModal` 표시 (선택사항).

- [ ] **Step 5: 커밋**

```bash
git add src/app/interviews/jobs/ src/components/interviews/job-form.tsx src/components/interviews/import-modal.tsx src/components/ui/select.tsx
git commit -m "feat: JD 생성 페이지 및 질문 가져오기 모달"
```

---

### Task 4.5: JD 상세/수정 페이지

**Files:**

- Create: `src/app/interviews/jobs/[id]/page.tsx`
- Create: `src/app/interviews/jobs/[id]/edit/page.tsx`

- [ ] **Step 1: JD 상세 페이지**

Server Component. `getJobById(id)` + `getQuestionsByJdId(id)` + `getCategoriesByJdId(id)`. 상단 메타정보, 본문 카테고리별 질문 리스트. "질문 가져오기" 버튼 (ImportModal 재사용). "커스텀 카테고리 추가" 버튼.

- [ ] **Step 2: JD 수정 페이지**

`JobForm`을 편집 모드로 재사용. `updateJobAction` 호출.

- [ ] **Step 3: 커밋**

```bash
git add src/app/interviews/jobs/
git commit -m "feat: JD 상세 및 수정 페이지"
```

---

### Task 4.6: /study 페이지 JD 선택 통합

**Files:**

- Modify: `src/stores/study-store.ts`
- Modify: `src/components/study/sidebar.tsx`
- Modify: `src/app/study/page.tsx`

- [ ] **Step 1: study-store에 selectedJdId 추가**

```typescript
selectedJdId: number | null; // null = 공통 라이브러리
setSelectedJdId: (id: number | null) => void;
```

- [ ] **Step 2: sidebar에 JD 선택 드롭다운 추가**

상단에 Select 컴포넌트: "공통 라이브러리" + 각 JD (회사명 - 포지션).

- [ ] **Step 3: /study page.tsx에서 JD 기반 데이터 fetch**

`selectedJdId`에 따라 `getLibraryQuestions()` 또는 `getQuestionsByJdId(jdId)` 호출. searchParams 또는 client-side 필터링.

- [ ] **Step 4: 개발 서버 확인**

- [ ] **Step 5: 커밋**

```bash
git add src/stores/study-store.ts src/components/study/sidebar.tsx src/app/study/page.tsx
git commit -m "feat: /study 페이지 JD 선택 드롭다운 통합"
```

---

## Branch 5: feature/soft-delete-and-recovery (Branch 4 이후)

### 파일 맵

| 액션   | 파일                                           | 역할                     |
| ------ | ---------------------------------------------- | ------------------------ |
| Create | `src/components/interviews/trash-list.tsx`     | 삭제 항목 리스트 + 복구  |
| Create | `src/data-access/cleanup.ts`                   | 보관 기간 만료 영구 삭제 |
| Create | `src/data-access/cleanup.test.ts`              | 정리 로직 테스트         |
| Modify | `src/app/interviews/page.tsx`                  | "삭제된 JD 보기" 토글    |
| Modify | `src/app/interviews/questions/page.tsx`        | "삭제된 질문 보기" 토글  |
| Modify | `src/app/interviews/jobs/[id]/page.tsx`        | "삭제된 질문 보기" 토글  |
| Modify | `src/components/interviews/question-table.tsx` | 삭제/복구 버튼           |
| Modify | `src/components/interviews/job-card.tsx`       | 삭제/복구 버튼           |

---

### Task 5.1: 영구 삭제 정리 로직

**Files:**

- Create: `src/data-access/cleanup.ts`
- Create: `src/data-access/cleanup.test.ts`

- [ ] **Step 1: 정리 로직 테스트 작성**

```typescript
// src/data-access/cleanup.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, cleanupTestDb, seedTestQuestions } from '@/test/helpers/db';
import { purgeExpiredItems } from './cleanup';
import { softDeleteQuestion, getDeletedQuestions } from './questions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('purgeExpiredItems', () => {
  it('보관 기간 만료 항목 영구 삭제', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    // deleted_at을 31일 전으로 조작
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.questions).toBe(1);
    expect(getDeletedQuestions().length).toBe(0);
  });

  it('보관 기간 내 항목은 유지', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    // deleted_at을 29일 전으로 조작
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-29 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.questions).toBe(0);
    expect(getDeletedQuestions().length).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/cleanup.test.ts`
Expected: FAIL

- [ ] **Step 3: 정리 로직 구현**

```typescript
// src/data-access/cleanup.ts
import { getDb } from '@/db/index';
import { DEFAULT_RETENTION_DAYS } from '@/lib/retention-policy';

interface PurgeResult {
  questions: number;
  followups: number;
  categories: number;
  jobs: number;
}

export function purgeExpiredItems(retentionDays: number = DEFAULT_RETENTION_DAYS): PurgeResult {
  const db = getDb();
  const param = `-${retentionDays} days`;

  // 순서 중요: 자식 테이블부터 삭제 (CASCADE와 별개로 명시적 삭제 카운트 정확성을 위해)
  const followups = db
    .prepare(
      "DELETE FROM followup_questions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
    )
    .run(param).changes;

  const questions = db
    .prepare(
      "DELETE FROM interview_questions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
    )
    .run(param).changes;

  const categories = db
    .prepare(
      "DELETE FROM interview_categories WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
    )
    .run(param).changes;

  const jobs = db
    .prepare(
      "DELETE FROM job_descriptions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
    )
    .run(param).changes;

  return { questions, followups, categories, jobs };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/cleanup.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/cleanup.ts src/data-access/cleanup.test.ts
git commit -m "feat: 소프트 삭제 보관 기간 만료 영구 삭제 로직"
```

---

### Task 5.2: 휴지통 UI (소속 기반)

**Files:**

- Create: `src/components/interviews/trash-list.tsx`
- Modify: `src/app/interviews/page.tsx`
- Modify: `src/app/interviews/questions/page.tsx`
- Modify: `src/app/interviews/jobs/[id]/page.tsx`

- [ ] **Step 1: trash-list 공통 컴포넌트 작성**

삭제된 항목 리스트. 각 항목에 "복구" 버튼 + 삭제 시간 + 남은 보관 기간 표시. `restoreQuestionAction`, `restoreJobAction` 호출.

- [ ] **Step 2: /interviews (JD 목록) 페이지에 "삭제된 JD 보기" 토글 추가**

토글 ON → `getDeletedJobs()` 결과 표시. 각 JD 카드에 "복구" 버튼.

- [ ] **Step 3: /interviews/questions (라이브러리) 페이지에 "삭제된 질문 보기" 토글 추가**

토글 ON → `getDeletedQuestions()` 결과 표시.

- [ ] **Step 4: /interviews/jobs/[id] (JD 상세) 페이지에 "삭제된 질문 보기" 토글 추가**

토글 ON → `getDeletedQuestions(jdId)` 결과 표시.

- [ ] **Step 5: 개발 서버에서 전체 흐름 확인**

1. 질문 삭제 → 목록에서 사라짐
2. "삭제된 질문 보기" → 삭제된 질문 표시
3. "복구" 클릭 → 다시 목록에 나타남
4. JD 삭제/복구 동일 흐름

- [ ] **Step 6: 커밋**

```bash
git add src/components/interviews/trash-list.tsx src/app/interviews/
git commit -m "feat: 소속 기반 휴지통 UI 및 복구 기능"
```

---

### Task 5.3: 앱 시작 시 정리 실행 + 최종 빌드

**Files:**

- Modify: `src/db/schema.ts` (initializeDatabase 내에서 purge 호출)
- Modify: `src/data-access/index.ts` (cleanup export)

- [ ] **Step 1: initializeDatabase에서 purgeExpiredItems 호출 추가**

`initializeDatabase()` 마지막에 `purgeExpiredItems()` 호출. 앱 시작(서버 시작) 시 1회 실행.

- [ ] **Step 2: 전체 테스트 실행**

Run: `pnpm test`
Expected: 모든 테스트 PASS

- [ ] **Step 3: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add src/db/schema.ts src/data-access/index.ts
git commit -m "feat: 앱 시작 시 만료된 소프트 삭제 항목 자동 정리"
```
