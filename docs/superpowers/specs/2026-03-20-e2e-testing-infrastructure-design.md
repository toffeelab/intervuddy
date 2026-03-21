# E2E 테스트 인프라 설계

## 개요

Intervuddy 프로젝트에 Playwright 기반 E2E 테스트를 도입한다. Auth.js v5 + PostgreSQL(Drizzle ORM) 아키텍처를 기반으로, 핵심 사용자 플로우를 검증하는 자동화된 테스트 인프라를 구축한다.

## 목표

- 로컬 개발과 CI(GitHub Actions) 양쪽에서 E2E 테스트 실행
- 핵심 플로우부터 시작하여 점진적으로 커버리지 확장
- PR마다 전체 E2E 실행 (규모 커지면 sharding/선별 실행 도입)

## 기술 결정

| 항목          | 결정                                      |
| ------------- | ----------------------------------------- |
| 프레임워크    | Playwright                                |
| 실행 환경     | 로컬 + CI (GitHub Actions)                |
| DB            | 실제 PostgreSQL (`intervuddy_test`)       |
| CI 트리거     | PR마다 전체 E2E 실행 (src/, e2e/ 변경 시) |
| 커버리지 전략 | 핵심 플로우 먼저 → 점진 확장              |
| 인증 처리     | JWT 토큰 직접 생성 → storageState 주입    |
| 확장 계획     | 50개+ 테스트 시 sharding/선별 실행 도입   |

## 아키텍처

### 실행 순서 (중요)

Playwright는 다음 순서로 실행한다:

1. **globalSetup 실행** (webServer 시작 전)
   - DB 마이그레이션 + 시드 + JWT 토큰 생성
2. **webServer 시작** (`pnpm dev`)
   - globalSetup 완료 후 자동 시작
3. **테스트 실행**
4. **webServer 종료**
5. **globalTeardown 실행** (DB 풀 종료)

### 테스트 실행 흐름

```
global-setup.ts
├── 1. intervuddy_test DB TRUNCATE CASCADE + 마이그레이션
├── 2. 테스트 유저 생성 (users 테이블에 직접 삽입)
├── 3. 시드 데이터 삽입 (공고, 카테고리, 질문)
├── 4. Auth.js encode()로 JWT 토큰 생성 (AUTH_SECRET은 process.env에서 읽음)
└── 5. storageState JSON 파일로 저장 (쿠키명: authjs.session-token)
    ├── e2e/.auth/user-a.json (유저 A 인증 상태)
    └── e2e/.auth/user-b.json (유저 B, 격리 테스트용)

playwright.config.ts
└── webServer: pnpm dev (DATABASE_URL=intervuddy_test, AUTH_SECRET 동일)

테스트 실행 (각 spec 파일 beforeAll에서 DB 리셋 + 시드)
├── auth.spec.ts           → storageState 없이 (비인증 테스트)
├── job-crud.spec.ts       → user-a storageState
├── question.spec.ts       → user-a storageState
├── study.spec.ts          → user-a storageState
└── data-isolation.spec.ts → user-a + user-b 교차 검증

global-teardown.ts
└── DB 풀 종료
```

### 환경변수 일관성 (Critical)

`AUTH_SECRET`은 global-setup과 webServer(dev 서버)가 반드시 동일한 값을 사용해야 한다. 불일치 시 JWT 디코딩 실패로 모든 인증 테스트가 깨진다.

**해결 방식**: `playwright.config.ts`의 `webServer.env`에 `AUTH_SECRET`을 설정하고, `global-setup.ts`도 동일한 `process.env.AUTH_SECRET`을 읽는다. Playwright는 globalSetup 실행 시 config의 환경변수를 `process.env`에 주입하므로 일관성이 보장된다.

**DATABASE_URL 우선순위**: `webServer.env`에 설정된 `DATABASE_URL`이 `.env.local`의 값보다 우선한다. Playwright의 `webServer.env`는 child process의 환경변수를 직접 설정하므로 Next.js가 `.env.local`에서 읽는 값을 덮어쓴다.

### 인증 전략

OAuth 로그인(Google/GitHub)은 E2E에서 직접 테스트하지 않는다. 대신:

1. `global-setup`에서 테스트 유저를 `users` 테이블에 직접 삽입
2. `next-auth/jwt`의 `encode()` + `AUTH_SECRET`으로 JWT 토큰 생성
3. 생성된 토큰을 `authjs.session-token` 쿠키로 storageState에 저장 (HTTP 환경이므로 `__Secure-` 접두사 없음)
4. 각 테스트는 저장된 storageState를 로드하여 인증된 상태로 시작

```typescript
// e2e/fixtures/auth.ts — JWT 생성 예시
import { encode } from 'next-auth/jwt';

const token = await encode({
  token: { sub: userId, id: userId },
  secret: process.env.AUTH_SECRET!,
});
// storageState에 { name: 'authjs.session-token', value: token } 쿠키로 저장
```

### 멀티유저 테스트

- 유저 A, 유저 B 각각의 storageState를 global-setup에서 생성
- `data-isolation.spec.ts`에서 유저 A 데이터 생성 → 유저 B 브라우저에서 안 보이는지 검증

### 테스트 간 데이터 정리 전략

E2E 테스트가 생성하는 데이터(새 공고, 질문 등)가 다른 테스트에 영향을 주지 않도록:

- **각 spec 파일의 `beforeAll`**에서 TRUNCATE CASCADE + 시드 데이터 재삽입
- `e2e/fixtures/seed.ts`에 `resetAndSeed()` 함수를 두어 재사용
- `fullyParallel: true`이지만 **spec 파일 간은 순차 실행** (`workers: process.env.CI ? 1 : undefined`)으로 DB 충돌 방지
- 로컬에서는 workers 기본값(CPU 코어 수)을 사용하되, 각 spec이 자체 시드를 갖고 있으므로 격리됨

## 디렉토리 구조

```
(프로젝트 루트)
├── playwright.config.ts   # Playwright 설정
└── e2e/
    ├── .auth/               # storageState 파일 (.gitignore에 추가)
    │   ├── user-a.json
    │   └── user-b.json
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

### .gitignore 추가 항목

```
# E2E
e2e/.auth/
e2e/test-results/
e2e/playwright-report/
```

### 기존 테스트와의 관계

- **Vitest** (`src/test/`) → 단위/컴포넌트 테스트 (그대로 유지)
- **Playwright** (`e2e/`) → E2E 테스트 (새로 추가)
- DB 헬퍼 패턴(`src/test/helpers/db.ts`)을 참고하되 E2E용으로 별도 관리

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

## Playwright 설정

```typescript
// playwright.config.ts
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

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/intervuddy_test
          AUTH_SECRET: e2e-test-secret
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

핵심:

- `src/`, `e2e/`, `playwright.config.ts` 변경된 PR에서만 트리거
- Chromium만 설치 (속도 우선)
- Playwright 브라우저 캐싱으로 설치 시간 단축
- 실패 시 trace + report 아티팩트 자동 업로드
- DB 마이그레이션은 CI에서 별도 step 없이 `global-setup.ts`에서 프로그래밍 방식으로 실행

## 로컬 실행

```bash
# Docker PostgreSQL 실행 (이미 안 떠있으면)
docker compose up -d

# 전체 E2E 실행
pnpm test:e2e

# UI 모드 (디버깅)
pnpm test:e2e:ui

# 특정 테스트만
pnpm test:e2e -- --grep "공고 생성"

# headed 모드
pnpm test:e2e -- --headed
```

`playwright.config.ts`의 `webServer.env`에 로컬 Docker 기본값이 설정되어 있어 별도 환경변수 없이 바로 실행 가능하다. CI에서는 `DATABASE_URL` 환경변수가 service container 주소로 오버라이드된다.

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

1. **Sharding**: `--shard=1/3` 옵션으로 CI에서 병렬 머신 실행
2. **선별 실행**: 변경 파일 기반으로 관련 테스트만 실행
3. **크로스 브라우저**: Firefox, WebKit 프로젝트 추가
4. **모바일 뷰포트**: 반응형 검증용 모바일 프로젝트 추가
5. **Visual regression**: screenshot 비교 테스트

## 제약 사항

- OAuth 실제 로그인 플로우는 E2E로 테스트하지 않음 (외부 서비스 의존)
- Magic link(Resend) 발송 검증은 단위 테스트에서 처리
- 프로덕션 DB(Neon)에 대한 E2E는 실행하지 않음
