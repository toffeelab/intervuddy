# E2E 테스트 인프라 설계

## 개요

Intervuddy 프로젝트에 Playwright 기반 E2E 테스트를 도입한다. 인증(Auth.js v5) + PostgreSQL(Drizzle ORM) 전환 완료 후의 아키텍처를 기반으로, 핵심 사용자 플로우를 검증하는 자동화된 테스트 인프라를 구축한다.

## 목표

- 로컬 개발과 CI(GitHub Actions) 양쪽에서 E2E 테스트 실행
- 핵심 플로우부터 시작하여 점진적으로 커버리지 확장
- PR마다 전체 E2E 실행 (규모 커지면 sharding/선별 실행 도입)

## 기술 결정

### 프레임워크: Playwright

- Next.js와 궁합 좋음, `webServer` 옵션으로 dev 서버 자동 관리
- 프로젝트에 Playwright MCP가 이미 연결되어 있어 자연스러운 선택
- 크로스 브라우저 테스트, trace/screenshot 등 디버깅 도구 내장

### DB: 실제 PostgreSQL (모킹 아님)

- E2E의 목적이 전체 스택 검증이므로 실제 DB 사용
- 로컬: Docker Compose의 기존 PostgreSQL (port 5433) + `intervuddy_test` DB
- CI: GitHub Actions service container로 PostgreSQL 17 자동 생성

### 인증: JWT 세션 주입 (OAuth 우회)

- 테스트 환경에서 `AUTH_SECRET`으로 JWT 토큰 직접 생성
- Playwright `storageState`로 세션 쿠키 주입
- 매 테스트마다 OAuth 로그인 반복하지 않아 빠르고 안정적
- 인증 리다이렉트/보호 검증은 별도 테스트 1개로 커버

## 프로젝트 구조

```
(프로젝트 루트)
├── playwright.config.ts   # Playwright 설정 (프로젝트 루트)
└── e2e/
    ├── fixtures/
    │   ├── auth.ts          # JWT 세션 생성 + storageState 관리
    │   ├── base.ts          # 커스텀 test fixture (인증된 page 등)
    │   └── seed.ts          # 테스트용 시드 데이터 (Drizzle 직접 삽입)
    ├── pages/               # Page Object Model
    │   ├── login.page.ts
    │   ├── interviews.page.ts
    │   ├── job-detail.page.ts
    │   └── study.page.ts
    ├── tests/
    │   ├── auth.spec.ts           # 인증 리다이렉트/보호
    │   ├── job-crud.spec.ts       # 공고 CRUD
    │   ├── question.spec.ts       # 질문 편집/import
    │   ├── study.spec.ts          # 학습 모드
    │   └── data-isolation.spec.ts # 멀티유저 데이터 격리
    ├── global-setup.ts      # DB 초기화 + 시드 + 세션 토큰 생성
    └── global-teardown.ts   # DB 정리 + pool 종료
```

### 기존 테스트와의 관계

- **Vitest** (`src/test/`) → 단위/컴포넌트 테스트 (그대로 유지)
- **Playwright** (`e2e/`) → E2E 테스트 (새로 추가)
- DB 헬퍼 패턴(`src/test/helpers/db.ts`)을 참고하되 E2E용으로 별도 관리

## 인증 처리 상세

### 세션 주입 흐름

```
global-setup.ts
├── 1. intervuddy_test DB 초기화 (마이그레이션 실행)
├── 2. 테스트 유저 생성 (users 테이블에 직접 삽입)
├── 3. Auth.js encode()로 JWT 토큰 생성
├── 4. 세션 쿠키를 storageState JSON 파일로 저장
└── 5. webServer가 DATABASE_URL=intervuddy_test로 dev 서버 시작
```

### Fixture 구조

```typescript
// e2e/fixtures/base.ts
import { test as base } from '@playwright/test';

// 인증된 상태의 page를 기본 제공
export const test = base.extend({
  // storageState에서 세션 쿠키 로드
});

// 비인증 테스트용
export const unauthenticatedTest = base.extend({
  // storageState 없이 깨끗한 브라우저
});
```

### 멀티유저 테스트

```typescript
// data-isolation.spec.ts에서 사용
// 유저 A, 유저 B 각각의 storageState를 생성
// 유저 A 데이터 생성 → 유저 B 브라우저에서 안 보이는지 검증
```

## 테스트 커버리지 (1단계 — 핵심 플로우)

### 인증 (`auth.spec.ts`)

| 시나리오                 | 검증 내용                            |
| ------------------------ | ------------------------------------ |
| 비로그인 → `/interviews` | `/login`으로 리다이렉트              |
| 로그인 → `/`             | `/interviews`로 리다이렉트           |
| 로그인 페이지            | Google/GitHub/Magic link 버튼 렌더링 |

### 채용공고 CRUD (`job-crud.spec.ts`)

| 시나리오     | 검증 내용                    |
| ------------ | ---------------------------- |
| 목록 조회    | 시드 데이터의 공고 표시      |
| 상태 필터링  | 진행중/완료/보관 필터 동작   |
| 새 공고 생성 | 폼 입력 → 저장 → 목록에 반영 |
| 공고 수정    | 편집 → 저장 → 변경 반영      |
| 공고 삭제    | soft delete → 목록에서 제거  |

### 질문 관리 (`question.spec.ts`)

| 시나리오             | 검증 내용                      |
| -------------------- | ------------------------------ |
| 질문 목록            | 공고 상세에서 질문 테이블 표시 |
| 질문 편집            | 드로어 열기 → 수정 → 저장      |
| 시스템 템플릿 import | import 모달 → 선택 → 반영      |

### 학습 모드 (`study.spec.ts`)

| 시나리오         | 검증 내용                 |
| ---------------- | ------------------------- |
| Q&A 카드 목록    | 카드 렌더링 확인          |
| 카테고리 필터    | 필터 선택 → 목록 갱신     |
| 카드 펼치기/접기 | 클릭 → 답변 표시/숨김     |
| 검색             | 검색어 입력 → 결과 필터링 |

### 데이터 격리 (`data-isolation.spec.ts`)

| 시나리오               | 검증 내용                                 |
| ---------------------- | ----------------------------------------- |
| 유저 A 데이터 → 유저 B | 유저 B 브라우저에서 유저 A 데이터 안 보임 |

## CI 워크플로우

### `.github/workflows/e2e.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [develop]
    paths: ['src/**', 'e2e/**', 'playwright.config.ts']

jobs:
  e2e:
    runs-on: ubuntu-latest
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

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run DB migrations
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/intervuddy_test
        run: pnpm db:migrate

      - name: Run E2E tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/intervuddy_test
          AUTH_SECRET: test-secret-for-ci
        run: pnpm test:e2e

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            e2e/test-results/
            e2e/playwright-report/
          retention-days: 7
```

### 핵심 설계 결정

- **트리거**: `src/`, `e2e/`, `playwright.config.ts` 변경된 PR에서만 실행
- **브라우저**: Chromium만 설치 (속도 우선, 크로스 브라우저는 나중에)
- **아티팩트**: 실패 시 trace + screenshot + HTML 리포트 자동 업로드
- **캐싱**: pnpm 의존성 캐시 + Playwright 브라우저 캐시

## Playwright 설정

### `playwright.config.ts` (핵심)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',

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
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://intervuddy:intervuddy@localhost:5433/intervuddy_test',
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret',
    },
  },
});
```

## 로컬 실행

```bash
# 1. Docker PostgreSQL 실행 (이미 안 떠있으면)
docker compose up -d

# 2. E2E 테스트 실행 (DATABASE_URL 기본값: localhost:5433/intervuddy_test)
pnpm test:e2e

# 3. UI 모드로 디버깅
pnpm test:e2e:ui

# 4. 특정 테스트만 실행
pnpm test:e2e -- --grep "공고 생성"

# 5. 커스텀 DB URL로 실행
DATABASE_URL=postgresql://... pnpm test:e2e
```

`playwright.config.ts`의 `webServer.env`에 로컬 Docker 기본값(`postgresql://intervuddy:intervuddy@localhost:5433/intervuddy_test`)이 설정되어 있어, 별도 환경변수 없이 바로 실행 가능하다. CI에서는 `DATABASE_URL` 환경변수가 service container 주소로 오버라이드된다.

### package.json 스크립트 추가

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## 확장 계획 (2단계 이후)

테스트 수가 늘어나면:

1. **Sharding**: `--shard=1/3` 옵션으로 CI에서 병렬 머신 실행
2. **선별 실행**: 변경 파일 기반으로 관련 테스트만 실행
3. **크로스 브라우저**: Firefox, WebKit 프로젝트 추가
4. **모바일 뷰포트**: 반응형 검증용 모바일 프로젝트 추가
5. **Visual regression**: screenshot 비교 테스트

## 제약 사항

- OAuth 실제 로그인 플로우는 E2E로 테스트하지 않음 (외부 서비스 의존)
- Magic link(Resend) 발송 검증은 단위 테스트에서 처리
- 프로덕션 DB(Neon)에 대한 E2E는 실행하지 않음
