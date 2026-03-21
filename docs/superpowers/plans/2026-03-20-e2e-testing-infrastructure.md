# E2E 테스트 인프라 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playwright 기반 E2E 테스트 인프라를 구축하고 핵심 사용자 플로우를 검증하는 테스트를 작성한다.

**Architecture:** Playwright를 프로젝트 루트에 설정하고, `e2e/` 디렉토리에 fixtures(인증/시드), Page Object Model, 테스트 파일을 배치한다. global-setup에서 테스트 DB를 초기화하고 JWT 세션을 주입한다. GitHub Actions 워크플로우로 PR마다 E2E를 자동 실행한다.

**Tech Stack:** Playwright, PostgreSQL (Docker), Auth.js v5 JWT encode, Drizzle ORM, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-20-e2e-testing-infrastructure-design.md`

---

## 파일 구조

| 작업   | 경로                               | 역할                                    |
| ------ | ---------------------------------- | --------------------------------------- |
| Create | `playwright.config.ts`             | Playwright 설정 (프로젝트 루트)         |
| Create | `e2e/global-setup.ts`              | DB 마이그레이션 + 시드 + 세션 토큰 생성 |
| Create | `e2e/global-teardown.ts`           | DB pool 종료                            |
| Create | `e2e/fixtures/auth.ts`             | JWT 세션 생성 + storageState 관리       |
| Create | `e2e/fixtures/base.ts`             | 커스텀 test fixture (인증/비인증)       |
| Create | `e2e/fixtures/seed.ts`             | E2E용 시드 데이터 삽입                  |
| Create | `e2e/pages/login.page.ts`          | 로그인 페이지 POM                       |
| Create | `e2e/pages/interviews.page.ts`     | 면접 목록 페이지 POM                    |
| Create | `e2e/pages/job-detail.page.ts`     | 공고 상세 페이지 POM                    |
| Create | `e2e/pages/study.page.ts`          | 학습 모드 페이지 POM                    |
| Create | `e2e/tests/auth.spec.ts`           | 인증 리다이렉트/보호 테스트             |
| Create | `e2e/tests/job-crud.spec.ts`       | 채용공고 CRUD 테스트                    |
| Create | `e2e/tests/question.spec.ts`       | 질문 편집/import 테스트                 |
| Create | `e2e/tests/study.spec.ts`          | 학습 모드 테스트                        |
| Create | `e2e/tests/data-isolation.spec.ts` | 멀티유저 데이터 격리 테스트             |
| Create | `.github/workflows/e2e.yml`        | CI 워크플로우                           |
| Modify | `package.json`                     | Playwright 의존성 + 스크립트 추가       |
| Modify | `.gitignore`                       | Playwright 아티팩트 제외                |

---

### Task 1: Playwright 설치 + 기본 설정

**Files:**

- Modify: `package.json` (스크립트 추가)
- Create: `playwright.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Playwright 설치**

```bash
pnpm add -D @playwright/test
```

- [ ] **Step 2: Chromium 브라우저 설치**

```bash
pnpm exec playwright install chromium
```

- [ ] **Step 3: package.json에 E2E 스크립트 추가**

`package.json`의 `scripts` 섹션에 추가:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --debug"
```

- [ ] **Step 4: .gitignore에 Playwright 아티팩트 추가**

`.gitignore`에 추가:

```
# Playwright
test-results/
playwright-report/
e2e/.auth/
```

- [ ] **Step 5: playwright.config.ts 작성**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { outputFolder: 'playwright-report' }]] : 'list',
  outputDir: 'test-results',

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://intervuddy:intervuddy@localhost:5433/intervuddy_test',
      AUTH_SECRET: process.env.AUTH_SECRET || 'e2e-test-secret',
      AUTH_TRUST_HOST: 'true',
    },
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts package.json pnpm-lock.yaml .gitignore
git commit -m "chore: Playwright 설치 + 기본 설정"
```

---

### Task 2: 인증 fixture (JWT 세션 주입)

**Files:**

- Create: `e2e/fixtures/auth.ts`

**참고 파일:**

- `src/auth.config.ts` — JWT 세션 전략, 콜백 구조 확인
- `src/db/constants.ts` — `DEFAULT_USER_ID`, `SYSTEM_USER_ID` 값
- Auth.js v5 `encode()` — `next-auth/jwt` 모듈의 `encode` 함수 사용

- [ ] **Step 1: e2e/fixtures/auth.ts 작성**

이 파일은 테스트용 JWT 토큰을 생성하고 storageState JSON 파일로 저장하는 역할.

```typescript
import { encode } from 'next-auth/jwt';
import path from 'path';
import fs from 'fs';

const AUTH_SECRET = process.env.AUTH_SECRET || 'e2e-test-secret';
const STORAGE_STATE_DIR = path.join(__dirname, '..', '.auth');

export interface TestUser {
  id: string;
  name: string;
  email: string;
}

export const TEST_USER_A: TestUser = {
  id: 'e2e-user-a',
  name: 'E2E User A',
  email: 'e2e-a@intervuddy.test',
};

export const TEST_USER_B: TestUser = {
  id: 'e2e-user-b',
  name: 'E2E User B',
  email: 'e2e-b@intervuddy.test',
};

/**
 * Auth.js v5 JWT 토큰을 생성하고 storageState JSON 파일로 저장.
 * Playwright의 storageState 옵션으로 이 파일을 로드하면 인증된 상태가 된다.
 */
export async function createAuthState(user: TestUser): Promise<string> {
  fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
    },
    secret: AUTH_SECRET,
    salt: 'authjs.session-token',
  });

  const storageState = {
    cookies: [
      {
        name: 'authjs.session-token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
        expires: -1,
      },
    ],
    origins: [],
  };

  const filePath = path.join(STORAGE_STATE_DIR, `${user.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(storageState, null, 2));
  return filePath;
}

export function getStorageStatePath(user: TestUser): string {
  return path.join(STORAGE_STATE_DIR, `${user.id}.json`);
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures/auth.ts
git commit -m "feat(e2e): JWT 세션 주입 인증 fixture"
```

---

### Task 3: DB 시드 fixture

**Files:**

- Create: `e2e/fixtures/seed.ts`

**참고 파일:**

- `src/test/helpers/db.ts` — 단위 테스트 시드 패턴 참고
- `src/db/schema.ts` — 테이블 정의, FK 관계
- `src/db/constants.ts` — SYSTEM_USER_ID

- [ ] **Step 1: e2e/fixtures/seed.ts 작성**

E2E 테스트용 시드 데이터. 단위 테스트 헬퍼(`src/test/helpers/db.ts`)와 유사하지만 E2E에 필요한 더 풍부한 데이터를 삽입한다.

```typescript
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';
import {
  users,
  jobDescriptions,
  interviewCategories,
  interviewQuestions,
  followupQuestions,
} from '../../src/db/schema';
import { TEST_USER_A, TEST_USER_B } from './auth';

const SYSTEM_USER_ID = 'system';

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

export function getE2EDbUrl(): string {
  return (
    process.env.DATABASE_URL || 'postgresql://intervuddy:intervuddy@localhost:5433/intervuddy_test'
  );
}

export function getE2EDb(): { pool: Pool; db: NodePgDatabase<typeof schema> } {
  if (!pool) {
    pool = new Pool({ connectionString: getE2EDbUrl() });
    db = drizzle(pool, { schema });
  }
  return { pool, db: db! };
}

export async function closeE2EDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export async function seedE2EData(): Promise<void> {
  const { db } = getE2EDb();

  // 기존 데이터 정리 (FK 순서 준수)
  await db.delete(followupQuestions);
  await db.delete(interviewQuestions);
  await db.delete(interviewCategories);
  await db.delete(jobDescriptions);
  await db.delete(schema.accounts);
  await db.delete(schema.verificationTokens);
  await db.delete(users);

  // 사용자 생성
  await db.insert(users).values([
    { id: SYSTEM_USER_ID, name: 'System', email: 'system@intervuddy.internal' },
    { id: TEST_USER_A.id, name: TEST_USER_A.name, email: TEST_USER_A.email },
    { id: TEST_USER_B.id, name: TEST_USER_B.name, email: TEST_USER_B.email },
  ]);

  // 시스템 카테고리 (템플릿)
  await db.insert(interviewCategories).values([
    {
      userId: SYSTEM_USER_ID,
      name: '자기소개/커리어',
      slug: 'self-intro',
      displayLabel: '자기소개',
      icon: '👤',
      displayOrder: 1,
    },
    {
      userId: SYSTEM_USER_ID,
      name: '기술역량',
      slug: 'tech',
      displayLabel: '기술',
      icon: '⚙️',
      displayOrder: 2,
    },
  ]);

  // User A 데이터: 카테고리 + 채용공고 + 질문
  const [catA] = await db
    .insert(interviewCategories)
    .values({
      userId: TEST_USER_A.id,
      name: '자기소개/커리어',
      slug: 'self-intro',
      displayLabel: '자기소개',
      icon: '👤',
      displayOrder: 1,
    })
    .returning({ id: interviewCategories.id });

  const jobs = await db
    .insert(jobDescriptions)
    .values([
      {
        userId: TEST_USER_A.id,
        companyName: '네이버',
        positionTitle: '프론트엔드 시니어',
        status: 'in_progress',
        memo: '웹 플랫폼팀',
      },
      {
        userId: TEST_USER_A.id,
        companyName: '카카오',
        positionTitle: '백엔드 개발자',
        status: 'completed',
      },
      {
        userId: TEST_USER_A.id,
        companyName: '라인',
        positionTitle: '풀스택 엔지니어',
        status: 'archived',
      },
    ])
    .returning({ id: jobDescriptions.id });

  // 질문을 첫 번째 공고(네이버)에 연결 → 공고 상세 페이지에서 질문 확인 가능
  const naverJobId = jobs[0].id;

  const [questionA] = await db
    .insert(interviewQuestions)
    .values({
      userId: TEST_USER_A.id,
      categoryId: catA.id,
      jdId: naverJobId,
      question: '자기소개를 해주세요',
      answer: '저는 5년차 프론트엔드 개발자입니다.',
      tip: '구체적 수치를 포함하세요',
      keywords: ['자기소개', '경력'],
      displayOrder: 1,
    })
    .returning({ id: interviewQuestions.id });

  await db.insert(followupQuestions).values({
    userId: TEST_USER_A.id,
    questionId: questionA.id,
    question: '가장 어려웠던 프로젝트는?',
    answer: '실시간 통신 시스템 구축',
    displayOrder: 1,
  });

  // User B 데이터: 별도 공고 (데이터 격리 검증용)
  await db.insert(jobDescriptions).values({
    userId: TEST_USER_B.id,
    companyName: '토스',
    positionTitle: 'iOS 개발자',
    status: 'in_progress',
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures/seed.ts
git commit -m "feat(e2e): DB 시드 fixture"
```

---

### Task 4: Global setup/teardown + base fixture

**Files:**

- Create: `e2e/global-setup.ts`
- Create: `e2e/global-teardown.ts`
- Create: `e2e/fixtures/base.ts`

**참고 파일:**

- `src/db/migrate.ts` — 마이그레이션 실행 방식
- `e2e/fixtures/auth.ts` — `createAuthState`, `TEST_USER_A`
- `e2e/fixtures/seed.ts` — `seedE2EData`, `getE2EDbUrl`

- [ ] **Step 1: e2e/global-setup.ts 작성**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { createAuthState, TEST_USER_A, TEST_USER_B } from './fixtures/auth';
import { seedE2EData, getE2EDbUrl } from './fixtures/seed';

export default async function globalSetup() {
  // 1. 마이그레이션 실행
  const pool = new Pool({ connectionString: getE2EDbUrl() });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  await pool.end();

  // 2. 시드 데이터 삽입
  await seedE2EData();

  // 3. 인증 storageState 생성
  await createAuthState(TEST_USER_A);
  await createAuthState(TEST_USER_B);
}
```

- [ ] **Step 2: e2e/global-teardown.ts 작성**

```typescript
import { closeE2EDb } from './fixtures/seed';

export default async function globalTeardown() {
  await closeE2EDb();
}
```

- [ ] **Step 3: e2e/fixtures/base.ts 작성**

커스텀 test fixture. 인증/비인증 두 가지 모드 제공.

```typescript
import { test as base } from '@playwright/test';
import { getStorageStatePath, TEST_USER_A } from './auth';

/**
 * 인증된 상태의 test fixture.
 * 기본적으로 TEST_USER_A로 로그인된 브라우저를 제공한다.
 */
export const test = base.extend({
  storageState: async ({}, use) => {
    await use(getStorageStatePath(TEST_USER_A));
  },
});

/**
 * 비인증 상태의 test fixture.
 * 인증 리다이렉트 테스트 등에 사용.
 */
export const unauthenticatedTest = base.extend({
  storageState: async ({}, use) => {
    await use({ cookies: [], origins: [] });
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 4: 스모크 테스트로 인프라 검증**

임시 테스트 파일을 만들어 전체 파이프라인(DB 시드 → 서버 시작 → 브라우저 인증)이 동작하는지 확인.

```bash
mkdir -p e2e/tests
```

`e2e/tests/smoke.spec.ts` 작성:

```typescript
import { test, expect } from '../fixtures/base';

test('authenticated user can access interviews page', async ({ page }) => {
  await page.goto('/interviews');
  await expect(page).not.toHaveURL(/\/login/);
});
```

```bash
pnpm test:e2e
```

Expected: 테스트 1개 PASS. 만약 실패하면 로그를 확인하여 DB 연결, 인증 토큰, 서버 시작 문제를 디버깅.

- [ ] **Step 5: 스모크 테스트 파일 삭제 후 Commit**

스모크 테스트는 인프라 검증용이므로 삭제.

```bash
rm e2e/tests/smoke.spec.ts
git add e2e/global-setup.ts e2e/global-teardown.ts e2e/fixtures/base.ts
git commit -m "feat(e2e): global setup/teardown + base fixture"
```

---

### Task 5: Page Object Models

**Files:**

- Create: `e2e/pages/login.page.ts`
- Create: `e2e/pages/interviews.page.ts`
- Create: `e2e/pages/job-detail.page.ts`
- Create: `e2e/pages/study.page.ts`

**참고 파일:**

- `src/app/login/page.tsx` — 로그인 페이지 UI 구조
- `src/app/interviews/page.tsx` — 면접 목록 UI 구조
- `src/app/interviews/jobs/[id]/page.tsx` — 공고 상세 UI 구조
- `src/app/study/page.tsx` — 학습 모드 UI 구조
- `src/components/interview/` — 면접 관련 컴포넌트 셀렉터 확인
- `src/components/study/` — 학습 관련 컴포넌트 셀렉터 확인

> **중요:** POM 작성 시 각 페이지의 실제 HTML 구조를 확인하고, `data-testid` 속성이 없으면 `getByRole()`, `getByText()` 등 Playwright의 사용자 관점 로케이터를 우선 사용한다. 필요하면 컴포넌트에 `data-testid`를 추가한다.

- [ ] **Step 1: 각 페이지 컴포넌트의 실제 UI 구조 확인**

아래 파일들을 읽어서 렌더링되는 요소, 텍스트, 버튼 등을 파악:

- `src/app/login/page.tsx`
- `src/app/interviews/page.tsx` + `src/components/interview/` 하위 컴포넌트
- `src/app/interviews/jobs/[id]/page.tsx` + 관련 컴포넌트
- `src/app/interviews/jobs/new/page.tsx`
- `src/app/study/page.tsx` + `src/components/study/` 하위 컴포넌트

- [ ] **Step 2: e2e/pages/login.page.ts 작성**

로그인 페이지의 실제 UI 요소 기반으로 POM 작성. 예시 구조:

```typescript
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly googleButton: Locator;
  readonly githubButton: Locator;
  readonly emailInput: Locator;
  readonly magicLinkButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // 실제 UI 확인 후 로케이터 지정
    this.googleButton = page.getByRole('button', { name: /google/i });
    this.githubButton = page.getByRole('button', { name: /github/i });
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.magicLinkButton = page.getByRole('button', { name: /메일.*로그인|magic/i });
  }

  async goto() {
    await this.page.goto('/login');
  }
}
```

- [ ] **Step 3: e2e/pages/interviews.page.ts 작성**

면접 목록 페이지 POM. 실제 UI 확인 후 로케이터 작성.

```typescript
import { type Page, type Locator } from '@playwright/test';

export class InterviewsPage {
  readonly page: Page;
  readonly newJobButton: Locator;
  // 상태 필터 탭, 공고 카드 목록 등

  constructor(page: Page) {
    this.page = page;
    // 실제 UI 확인 후 로케이터 지정
    this.newJobButton = page.getByRole('link', { name: /새.*공고|추가/i });
  }

  async goto() {
    await this.page.goto('/interviews');
  }

  async filterByStatus(status: 'in_progress' | 'completed' | 'archived') {
    // 실제 필터 UI에 맞게 구현
  }

  async getJobCards(): Promise<Locator> {
    // 실제 카드 셀렉터에 맞게 구현
    return this.page.locator('[data-testid="job-card"]');
  }
}
```

- [ ] **Step 4: e2e/pages/job-detail.page.ts 작성**

공고 상세 POM. 질문 테이블, 편집 드로어, import 모달 등.

- [ ] **Step 5: e2e/pages/study.page.ts 작성**

학습 모드 POM. Q&A 카드 목록, 카테고리 필터, 검색 등.

- [ ] **Step 6: Commit**

```bash
git add e2e/pages/
git commit -m "feat(e2e): Page Object Models"
```

---

### Task 6: 인증 테스트 (auth.spec.ts)

**Files:**

- Create: `e2e/tests/auth.spec.ts`

**참고 파일:**

- `src/auth.config.ts:29-38` — `authorized()` 콜백 (보호 라우트 로직)
- `e2e/fixtures/base.ts` — `test` (인증), `unauthenticatedTest` (비인증)
- `e2e/pages/login.page.ts` — 로그인 페이지 POM

- [ ] **Step 1: auth.spec.ts 작성**

```typescript
import { expect } from '@playwright/test';
import { test, unauthenticatedTest } from '../fixtures/base';
import { LoginPage } from '../pages/login.page';

unauthenticatedTest.describe('비인증 사용자', () => {
  unauthenticatedTest('보호된 페이지 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page).toHaveURL(/\/login/);
  });

  unauthenticatedTest('/study 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/study');
    await expect(page).toHaveURL(/\/login/);
  });

  unauthenticatedTest('로그인 페이지 렌더링', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.googleButton).toBeVisible();
    await expect(loginPage.githubButton).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
  });
});

test.describe('인증된 사용자', () => {
  test('/login 접근 시 /interviews로 리다이렉트', async ({ page }) => {
    // auth.config.ts의 authorized 콜백: /login + 로그인 상태 → /interviews 리다이렉트
    await page.goto('/login');
    await expect(page).toHaveURL(/\/interviews/);
  });

  test('/interviews 정상 접근', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test:e2e -- --grep "auth"
```

Expected: 모든 인증 테스트 PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/auth.spec.ts
git commit -m "test(e2e): 인증 리다이렉트/보호 테스트"
```

---

### Task 7: 채용공고 CRUD 테스트 (job-crud.spec.ts)

**Files:**

- Create: `e2e/tests/job-crud.spec.ts`

**참고 파일:**

- `e2e/pages/interviews.page.ts` — 면접 목록 POM
- `e2e/fixtures/seed.ts` — 시드 데이터 (네이버/카카오/라인 공고)
- `src/app/interviews/jobs/new/page.tsx` — 공고 생성 폼 구조
- `src/app/interviews/jobs/[id]/edit/page.tsx` — 공고 수정 폼 구조

- [ ] **Step 1: job-crud.spec.ts 작성**

```typescript
import { test, expect } from '../fixtures/base';
import { InterviewsPage } from '../pages/interviews.page';

test.describe('채용공고 CRUD', () => {
  test('공고 목록 조회', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();
    // 시드 데이터의 '네이버' 공고가 표시되는지 확인
    await expect(page.getByText('네이버')).toBeVisible();
  });

  test('상태 필터링', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();
    // 진행중/완료/보관 필터 탭 클릭 후 해당 공고만 표시되는지 확인
    // 실제 UI 구조에 맞게 구현
  });

  test('새 공고 생성', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();
    // 새 공고 버튼 클릭 → 폼 작성 → 저장 → 목록에서 확인
    // 실제 폼 구조에 맞게 구현
  });

  test('공고 수정', async ({ page }) => {
    // 기존 공고의 편집 페이지로 이동 → 수정 → 저장 → 변경 확인
  });

  test('공고 삭제 (soft delete)', async ({ page }) => {
    // 공고 삭제 버튼 클릭 → 목록에서 제거 확인
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test:e2e -- --grep "채용공고"
```

Expected: 모든 CRUD 테스트 PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/job-crud.spec.ts
git commit -m "test(e2e): 채용공고 CRUD 테스트"
```

---

### Task 8: 질문 관리 테스트 (question.spec.ts)

**Files:**

- Create: `e2e/tests/question.spec.ts`

**참고 파일:**

- `e2e/pages/job-detail.page.ts` — 공고 상세 POM
- `src/components/interview/question-edit-drawer.tsx` — 질문 편집 드로어 구조
- `src/components/interview/import-modal.tsx` 또는 관련 import UI

- [ ] **Step 1: question.spec.ts 작성**

```typescript
import { test, expect } from '../fixtures/base';
import { JobDetailPage } from '../pages/job-detail.page';

test.describe('질문 관리', () => {
  test('공고 상세에서 질문 목록 확인', async ({ page }) => {
    // 시드 데이터의 첫 번째 공고(네이버) 상세 페이지 이동
    // 질문 테이블에 '자기소개를 해주세요' 표시 확인
  });

  test('질문 편집 드로어', async ({ page }) => {
    // 질문 클릭 → 드로어 열림 → 내용 수정 → 저장 → 변경 반영 확인
  });

  test('시스템 템플릿 import', async ({ page }) => {
    // import 모달 열기 → 카테고리 선택 → import → 질문 추가 확인
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test:e2e -- --grep "질문"
```

Expected: 모든 질문 관리 테스트 PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/question.spec.ts
git commit -m "test(e2e): 질문 편집/import 테스트"
```

---

### Task 9: 학습 모드 테스트 (study.spec.ts)

**Files:**

- Create: `e2e/tests/study.spec.ts`

**참고 파일:**

- `e2e/pages/study.page.ts` — 학습 모드 POM
- `src/components/study/qa-card.tsx` — Q&A 카드 구조
- `src/components/study/qa-list.tsx` — 리스트 + 검색/필터

- [ ] **Step 1: study.spec.ts 작성**

```typescript
import { test, expect } from '../fixtures/base';
import { StudyPage } from '../pages/study.page';

test.describe('학습 모드', () => {
  test('Q&A 카드 목록 렌더링', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();
    // 시드 데이터의 질문 카드가 표시되는지 확인
    await expect(page.getByText('자기소개를 해주세요')).toBeVisible();
  });

  test('카테고리 필터링', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();
    // 카테고리 필터 선택 → 해당 카테고리 질문만 표시
  });

  test('카드 펼치기/접기', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();
    // 카드 클릭 → 답변 표시 → 다시 클릭 → 답변 숨김
  });

  test('검색', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();
    // 검색어 입력 → 결과 필터링 확인
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test:e2e -- --grep "학습"
```

Expected: 모든 학습 모드 테스트 PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/study.spec.ts
git commit -m "test(e2e): 학습 모드 테스트"
```

---

### Task 10: 멀티유저 데이터 격리 테스트 (data-isolation.spec.ts)

**Files:**

- Create: `e2e/tests/data-isolation.spec.ts`

**참고 파일:**

- `e2e/fixtures/auth.ts` — `TEST_USER_A`, `TEST_USER_B`, `getStorageStatePath`
- `e2e/fixtures/seed.ts` — User A는 네이버/카카오/라인 공고, User B는 토스 공고

- [ ] **Step 1: data-isolation.spec.ts 작성**

```typescript
import { test as base, expect } from '@playwright/test';
import { getStorageStatePath, TEST_USER_A, TEST_USER_B } from '../fixtures/auth';

// User A 브라우저
const testAsUserA = base.extend({
  storageState: async ({}, use) => {
    await use(getStorageStatePath(TEST_USER_A));
  },
});

// User B 브라우저
const testAsUserB = base.extend({
  storageState: async ({}, use) => {
    await use(getStorageStatePath(TEST_USER_B));
  },
});

testAsUserA.describe('데이터 격리', () => {
  testAsUserA('User A는 자신의 공고만 볼 수 있다', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page.getByText('네이버')).toBeVisible();
    await expect(page.getByText('토스')).not.toBeVisible(); // User B 데이터
  });
});

testAsUserB.describe('데이터 격리 (User B)', () => {
  testAsUserB('User B는 자신의 공고만 볼 수 있다', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page.getByText('토스')).toBeVisible();
    await expect(page.getByText('네이버')).not.toBeVisible(); // User A 데이터
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test:e2e -- --grep "격리"
```

Expected: 데이터 격리 테스트 PASS. User A와 B가 서로의 데이터에 접근 불가.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/data-isolation.spec.ts
git commit -m "test(e2e): 멀티유저 데이터 격리 테스트"
```

---

### Task 11: GitHub Actions CI 워크플로우

**Files:**

- Create: `.github/workflows/e2e.yml`

**참고 파일:**

- `.github/workflows/claude-review.yml` — 기존 워크플로우 구조 참고
- `docker/init-test-db.sh` — CI에서는 service container가 대체
- `playwright.config.ts` — CI 환경변수 연동

- [ ] **Step 1: .github/workflows/e2e.yml 작성**

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [develop]
    paths: ['src/**', 'e2e/**', 'playwright.config.ts']

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: intervuddy_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: pnpm exec playwright install --with-deps chromium

      - name: Install Playwright system deps
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: pnpm exec playwright install-deps chromium

      - name: Run E2E tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/intervuddy_test
          AUTH_SECRET: e2e-ci-test-secret
        run: pnpm test:e2e

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            test-results/
            playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: E2E 테스트 GitHub Actions 워크플로우"
```

---

### Task 12: 전체 검증 + 최종 정리

**Files:**

- 모든 E2E 파일

- [ ] **Step 1: 전체 E2E 테스트 실행**

```bash
pnpm test:e2e
```

Expected: 모든 테스트 PASS.

- [ ] **Step 2: 기존 단위 테스트 영향 없는지 확인**

```bash
pnpm test
```

Expected: 기존 단위 테스트 모두 PASS (E2E 도입이 기존 테스트에 영향 없음).

- [ ] **Step 3: 린트/빌드 확인**

```bash
pnpm lint && pnpm build
```

Expected: 오류 없음.

- [ ] **Step 4: 최종 Commit**

누락된 파일이 있으면 추가 커밋.

```bash
git status
# 필요 시 추가 커밋
```
