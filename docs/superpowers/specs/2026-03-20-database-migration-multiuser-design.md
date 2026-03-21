# DB 마이그레이션 + 멀티유저 전환 설계

> 작성일: 2026-03-20
> 상태: 승인됨 (리뷰 반영 v2)

## 1. 개요

Intervuddy를 로컬 SQLite 단일 유저 앱에서 PostgreSQL 기반 멀티유저 SaaS로 전환한다.

### 목표

- **Phase B**: SQLite → Drizzle ORM + Docker PostgreSQL(로컬) + Neon PostgreSQL(프로덕션) + Vercel 배포
- **Phase A**: NextAuth 인증(Google/GitHub OAuth + 매직 링크) + 멀티유저 데이터 격리

### 구현 순서

Phase B(DB 전환 + 배포)를 먼저 완성한 후, Phase A(멀티유저)를 추가한다. Phase B에서는 기존 단일유저 로직을 Drizzle로 포팅하는 데 집중하고, userId 파라미터는 Phase A에서 추가한다.

**Phase B 단일유저 전략**: Phase B 기간 동안 `DEFAULT_USER_ID = 'local-user'`를 상수로 사용하고, users 테이블에 해당 유저를 시드한다. Phase A에서 인증 연동 시 실제 userId로 전환한다.

### Phase B 완료 조건 (Definition of Done)

- [ ] Drizzle 스키마 정의 완료 (question_keywords 제외, TEXT[] 전환)
- [ ] data-access 전 함수 async 전환 + Drizzle 쿼리 빌더 사용
- [ ] Docker PG 로컬 개발 환경 구동
- [ ] 기존 테스트 전부 통과 (PG 기반)
- [ ] Neon + Vercel 배포 성공
- [ ] 기존 기능 동일 동작 확인

## 2. 기술 스택

| 항목          | 선택                  | 비고                              |
| ------------- | --------------------- | --------------------------------- |
| 호스팅        | Vercel                | 프론트 + API Routes               |
| DB (프로덕션) | Neon PostgreSQL       | Free → Launch ($19/월)            |
| DB (로컬)     | Docker PostgreSQL 17  | docker-compose                    |
| ORM           | Drizzle ORM           | better-sqlite3 raw SQL 대체       |
| 인증          | Auth.js v5 (NextAuth) | Google + GitHub OAuth + 매직 링크 |
| 이메일        | Resend                | 매직 링크 발송 (월 3,000건 무료)  |

### 데이터 흐름 (최종 상태)

```
[브라우저] → [Vercel / Next.js App Router]
                ├── Server Components (읽기)
                ├── Server Actions (쓰기)
                └── NextAuth (인증, JWT 세션)
                        ↓
              [Drizzle ORM]
                        ↓
              [Neon PostgreSQL]  ←→  [Docker PG (로컬)]
```

## 3. 데이터베이스 스키마

### 3.1 NextAuth + users 테이블

```sql
CREATE TABLE users (
  id              TEXT PRIMARY KEY,  -- cuid
  name            TEXT,
  email           TEXT UNIQUE NOT NULL,
  email_verified  TIMESTAMPTZ,
  image           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 시스템 유저 (템플릿 소유자, 로그인 불가 — accounts 레코드 없음)
INSERT INTO users (id, name, email)
VALUES ('system', 'System', 'system@intervuddy.internal');

-- Phase B 단일유저 (Phase A에서 제거)
INSERT INTO users (id, name, email)
VALUES ('local-user', 'Local User', 'local@intervuddy.internal');

CREATE TABLE accounts (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  type                TEXT NOT NULL,
  access_token        TEXT,
  refresh_token       TEXT,
  expires_at          INTEGER,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE verification_tokens (
  identifier     TEXT NOT NULL,
  token          TEXT UNIQUE NOT NULL,
  expires        TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(identifier, token)
);

-- sessions 테이블은 JWT 전략 사용으로 불필요 (섹션 4.1 참조)
```

### 3.2 비즈니스 테이블

```sql
CREATE TABLE job_descriptions (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  position_title  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'completed', 'archived')),
  memo            TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_categories (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jd_id               INTEGER REFERENCES job_descriptions(id) ON DELETE CASCADE,
  source_category_id  INTEGER REFERENCES interview_categories(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  display_label       TEXT NOT NULL,
  icon                TEXT NOT NULL,
  display_order       INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id != 'system' OR jd_id IS NULL)
);

CREATE TABLE interview_questions (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id         INTEGER NOT NULL REFERENCES interview_categories(id) ON DELETE CASCADE,
  jd_id               INTEGER REFERENCES job_descriptions(id) ON DELETE CASCADE,
  origin_question_id  INTEGER REFERENCES interview_questions(id) ON DELETE SET NULL,
  question            TEXT NOT NULL CHECK (length(trim(question)) > 0),
  answer              TEXT NOT NULL DEFAULT '',
  tip                 TEXT,
  keywords            TEXT[] NOT NULL DEFAULT '{}',
  display_order       INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id != 'system' OR jd_id IS NULL)
);

CREATE TABLE followup_questions (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  question        TEXT NOT NULL CHECK (length(trim(question)) > 0),
  answer          TEXT NOT NULL DEFAULT '',
  display_order   INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**스키마 변경 사항 (현재 SQLite 대비):**

| 변경                                                | 이유                                      |
| --------------------------------------------------- | ----------------------------------------- |
| `user_id` 컬럼 추가 (모든 테이블)                   | 멀티유저 데이터 격리                      |
| `followup_questions.user_id` 추가                   | RLS 직접 적용 가능, JOIN 없이 소유권 확인 |
| `question_keywords` 테이블 삭제 → `keywords TEXT[]` | 스키마 간소화, GIN 검색                   |
| `source_category_id` 추가                           | 카테고리 복제 원본 추적                   |
| `INTEGER PK` → `GENERATED ALWAYS AS IDENTITY`       | PostgreSQL 표준                           |
| `TIMESTAMP` → `TIMESTAMPTZ`                         | 멀티유저 타임존 대응                      |
| `interview_categories.updated_at` 추가              | 변경 이력 추적 (기존 SQLite에는 없었음)   |
| `display_label`, `icon` — `NOT NULL` 유지           | 기존 프론트엔드 코드가 non-null 가정      |
| `answer` — `NOT NULL DEFAULT ''` 유지               | 기존 코드가 빈 문자열로 처리              |

### 3.3 삭제된 테이블

- ~~`question_keywords`~~ → `interview_questions.keywords TEXT[]`로 흡수
- ~~`sessions`~~ → JWT 세션 전략 사용으로 불필요

**데이터 마이그레이션**: 신규 PostgreSQL 배포이므로 SQLite 데이터 마이그레이션은 불필요. 시드 데이터로 초기 데이터를 생성한다.

### 3.4 Drizzle 스키마 예시

```typescript
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const interviewQuestions = pgTable('interview_questions', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => interviewCategories.id, { onDelete: 'cascade' }),
  jdId: integer('jd_id').references(() => jobDescriptions.id, { onDelete: 'cascade' }),
  originQuestionId: integer('origin_question_id').references(
    (): AnyColumn => interviewQuestions.id,
    { onDelete: 'set null' }
  ),
  question: text('question').notNull(),
  answer: text('answer').notNull().default(''),
  tip: text('tip'),
  keywords: text('keywords').array().notNull().default([]),
  displayOrder: integer('display_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 3.5 인덱스

```sql
-- 카테고리 목록 (유저별, JD별)
CREATE INDEX idx_categories_user_jd
ON interview_categories(user_id, jd_id, display_order)
WHERE deleted_at IS NULL;

-- 카테고리 slug 유니크 (유저 라이브러리 내)
CREATE UNIQUE INDEX idx_categories_user_slug_unique
ON interview_categories(user_id, slug)
WHERE jd_id IS NULL AND deleted_at IS NULL;

-- 카테고리 이름 유니크 (JD 내)
CREATE UNIQUE INDEX idx_categories_jd_name_unique
ON interview_categories(user_id, jd_id, name)
WHERE deleted_at IS NULL;

-- 카테고리 복제 중복 방지
CREATE UNIQUE INDEX idx_categories_source_jd
ON interview_categories(source_category_id, jd_id)
WHERE source_category_id IS NOT NULL AND deleted_at IS NULL;

-- 질문 목록 (카테고리별)
CREATE INDEX idx_questions_category_order
ON interview_questions(category_id, display_order)
WHERE deleted_at IS NULL;

-- 질문 목록 (유저별, JD별)
CREATE INDEX idx_questions_user_jd
ON interview_questions(user_id, jd_id, category_id, display_order)
WHERE deleted_at IS NULL;

-- 질문 복제 중복 방지
CREATE UNIQUE INDEX idx_questions_origin_jd
ON interview_questions(origin_question_id, jd_id)
WHERE origin_question_id IS NOT NULL AND deleted_at IS NULL;

-- 키워드 검색 (GIN)
CREATE INDEX idx_questions_keywords_gin
ON interview_questions USING GIN(keywords);

-- 꼬리질문 조회
CREATE INDEX idx_followups_question_order
ON followup_questions(question_id, display_order)
WHERE deleted_at IS NULL;

-- JD 목록 (유저별, 상태/날짜순)
CREATE INDEX idx_jobs_user_status
ON job_descriptions(user_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- soft delete 정리용
CREATE INDEX idx_questions_deleted
ON interview_questions(deleted_at)
WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_categories_deleted
ON interview_categories(deleted_at)
WHERE deleted_at IS NOT NULL;
```

### 3.6 트리거

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 비즈니스 테이블 + users에 적용
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON job_descriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON interview_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON interview_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_followups_updated_at
  BEFORE UPDATE ON followup_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.7 레이어드 가시성 모델

| 레이어          | user_id    | jd_id | 조회 조건                             | 권한      |
| --------------- | ---------- | ----- | ------------------------------------- | --------- |
| 시스템 템플릿   | `'system'` | NULL  | `WHERE user_id = 'system'`            | 읽기 전용 |
| 유저 라이브러리 | 본인 ID    | NULL  | `WHERE user_id = ? AND jd_id IS NULL` | 편집 가능 |
| 유저 JD 질문    | 본인 ID    | JD ID | `WHERE user_id = ? AND jd_id = ?`     | 편집 가능 |

**카테고리 조회 패턴 (멀티유저):**

- **JD 페이지**: 유저 라이브러리 카테고리(jd_id IS NULL) + 해당 JD 카테고리(jd_id = ?)를 합산 조회. 시스템 템플릿 카테고리는 "import" UI를 통해 별도로 접근한다.
- **라이브러리 페이지**: 유저의 라이브러리 카테고리만 조회 (user_id = ? AND jd_id IS NULL)
- **시스템 템플릿 브라우징**: 시스템 카테고리만 조회 (user_id = 'system')

### 3.8 복제(Import) 흐름

```
시스템 템플릿 → 유저 라이브러리:
  카테고리 복제 (source_category_id = 원본)
  질문 복제 (origin_question_id = 원본)
  keywords 배열 + 꼬리질문도 함께 복제

유저 라이브러리 → JD:
  기존 importQuestionsToJob 패턴 유지
  origin_question_id = 라이브러리 질문 ID
```

## 4. 인증 플로우 (Phase A)

### 4.1 NextAuth 구성

```
providers:
  ├── Google OAuth
  ├── GitHub OAuth
  └── Resend (매직 링크)

adapter: @auth/drizzle-adapter
session strategy: "jwt"
```

**JWT 세션을 선택한 이유:**

- Vercel Serverless + Neon Free 환경에서 모든 요청마다 DB 조회가 발생하면 cold start와 결합되어 응답 지연
- JWT는 DB 조회 없이 세션 검증 가능 → 성능 우수
- sessions 테이블 불필요 → 스키마 간소화
- 단점(세션 즉시 무효화 불가)은 현재 요구사항에서 문제되지 않음

### 4.2 로그인 플로우

```
[미인증 유저] → /login
  ├── "Continue with Google" → OAuth → 콜백 → JWT 발급 → /interviews
  ├── "Continue with GitHub" → OAuth → 콜백 → JWT 발급 → /interviews
  └── "이메일로 로그인" → Resend 매직 링크 → 메일 클릭 → JWT 발급 → /interviews

[최초 로그인]
  → users 자동 생성 (NextAuth adapter)
  → 시스템 템플릿은 복제하지 않음 (유저가 필요할 때 직접 import)
```

### 4.3 라우트 보호

```
middleware.ts:
  /interviews/*  → 인증 필수 (미인증 시 /login 리다이렉트)
  /study/*       → 인증 필수
  /login         → 미인증만 접근 (인증 시 /interviews 리다이렉트)
  /              → 랜딩 페이지 (인증 불문)
```

### 4.4 세션 접근 패턴

```typescript
// Server Component
const session = await auth(); // JWT에서 디코딩
const userId = session?.user?.id;

// data-access 호출
const jobs = await getAllJobs(userId);
```

## 5. data-access 레이어 변경

### 5.1 변경 원칙

1. 모든 함수에 `userId` 파라미터 추가 (Phase A)
2. 동기 → 비동기 전환 (Phase B)
3. raw SQL → Drizzle 쿼리 빌더 (Phase B)
4. keywords: JOIN 기반 배치 로드 → 배열 컬럼 직접 접근 (Phase B)

### 5.2 함수 시그니처 변경

```typescript
// Phase B: 비동기 전환 (DEFAULT_USER_ID 사용)
getAllJobs()               → async getAllJobs()       // 내부에서 DEFAULT_USER_ID 사용
getJobById(id)             → async getJobById(id)
createJob(input)           → async createJob(input)
getGlobalCategories()      → async getGlobalCategories()
getLibraryQuestions()      → async getLibraryQuestions()
// ... 모든 함수 async 전환

// Phase A: userId 파라미터 추가
async getAllJobs()          → async getAllJobs(userId)
async getJobById(id)       → async getJobById(userId, id)
async getGlobalCategories()→ async getLibraryCategories(userId)
// ... 모든 함수에 userId 첫 파라미터 추가

// followup 함수도 userId 포함 (RLS 직접 적용 대비)
async updateFollowup(input)     → async updateFollowup(userId, input)
async softDeleteFollowup(id)    → async softDeleteFollowup(userId, id)

// cleanup: 유저 스코프 + PostgreSQL 날짜 함수 전환
async purgeExpiredItems(days?)   → async purgeExpiredItems(userId, days?)
// PostgreSQL: NOW() - INTERVAL '30 days' (SQLite datetime 함수 대체)
```

### 5.3 신규 파일 (Phase A)

```typescript
// src/data-access/templates.ts
getSystemCategories();
getSystemQuestions();
getSystemQuestionsByCategory(categoryId);
importSystemToLibrary(userId, params);
```

### 5.4 삭제되는 코드

- `batchLoadKeywords()` — keywords가 질문 row에 포함됨
- `updateQuestionKeywords()` — 질문 UPDATE 시 keywords 배열 직접 수정
- `src/data-access/index.ts`에서 keywords 관련 re-export 제거

**re-export 정책**: `templates.ts`는 `src/data-access/index.ts`에서 re-export한다. `import.ts`, `cleanup.ts`도 동일하게 re-export하여 진입점을 통일한다.

### 5.5 Server Component 변경

```typescript
// Phase B
export default async function InterviewsPage() {
  const jobs = await getAllJobs()  // 내부에서 DEFAULT_USER_ID 사용
  return <JobList jobs={jobs} />
}

// Phase A
export default async function InterviewsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const jobs = await getAllJobs(session.user.id)
  return <JobList jobs={jobs} />
}
```

## 6. 개발 환경

### 6.1 Docker Compose

```yaml
services:
  db:
    image: postgres:17-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: intervuddy
      POSTGRES_USER: intervuddy
      POSTGRES_PASSWORD: intervuddy
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 6.2 환경변수

```env
# .env.local (로컬)
DATABASE_URL=postgresql://intervuddy:intervuddy@localhost:5432/intervuddy

# .env.production (Vercel)
DATABASE_URL=<Neon 연결 문자열>

# Phase A에서 추가
AUTH_SECRET=<생성>
AUTH_GOOGLE_ID=<Google Cloud Console>
AUTH_GOOGLE_SECRET=<Google Cloud Console>
AUTH_GITHUB_ID=<GitHub Settings>
AUTH_GITHUB_SECRET=<GitHub Settings>
RESEND_API_KEY=<Resend Dashboard>
AUTH_RESEND_FROM=noreply@intervuddy.com
```

### 6.3 Drizzle 설정

```
src/db/
├── schema.ts          → Drizzle pgTable 스키마 정의
├── index.ts           → DB 연결 (환경별 드라이버 분기)
├── migrate.ts         → 마이그레이션 실행
└── seed.ts            → 시드 (async 전환)

drizzle/
├── migrations/        → 자동 생성 SQL 마이그레이션
└── drizzle.config.ts  → Drizzle Kit 설정
```

**환경별 DB 연결 분기 (src/db/index.ts):**

```typescript
// 프로덕션 (Neon): @neondatabase/serverless + drizzle-orm/neon-serverless
// 로컬 (Docker): pg Pool + drizzle-orm/node-postgres
// 환경변수 DATABASE_URL의 호스트로 분기하거나, NODE_ENV로 분기
```

```bash
pnpm db:generate    # 스키마 → 마이그레이션 SQL 생성
pnpm db:migrate     # 마이그레이션 실행
pnpm db:studio      # Drizzle Studio GUI
pnpm db:seed:sample # 샘플 데이터 시드
```

### 6.4 테스트 전략

```
Phase B:
  Vitest 테스트를 Drizzle + Docker PG 기반으로 전환
  테스트용 별도 DB: intervuddy_test
  각 테스트 전 트랜잭션 rollback으로 격리

  테스트 헬퍼 마이그레이션 (src/test/helpers/db.ts):
    - better-sqlite3 → Drizzle + pg Pool로 전환
    - seedTestData() 함수를 async로 전환
    - 트랜잭션 기반 격리: beforeEach에서 트랜잭션 시작, afterEach에서 rollback

  CI (GitHub Actions):
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: intervuddy_test
          POSTGRES_USER: intervuddy
          POSTGRES_PASSWORD: intervuddy
        ports: ['5432:5432']

Phase A:
  인증 테스트 추가 (JWT 모킹)
  유저 격리 테스트 (타 유저 데이터 접근 불가 확인)
```

## 7. RDS 마이그레이션 호환성

사용한 PostgreSQL 기능이 모두 표준이므로 Neon → RDS 전환은 연결 문자열 변경 수준:

| 기능                         | RDS 지원    |
| ---------------------------- | ----------- |
| GENERATED ALWAYS AS IDENTITY | PG 10+ 표준 |
| TIMESTAMPTZ                  | 표준        |
| TEXT[] + GIN                 | 표준        |
| Partial Index                | 표준        |
| CHECK 제약                   | 표준        |
| RLS                          | 표준        |
| PL/pgSQL 트리거              | 표준        |

마이그레이션: `pg_dump` → `pg_restore` → Drizzle 연결 문자열 변경

유일한 인프라 차이: connection pooling (Neon 내장 → RDS Proxy 별도 설정)

## 8. 향후 확장 포인트

### Pricing Plan (설계만, 이번 구현 범위 아님)

```sql
-- 향후 별도 테이블로 추가
CREATE TABLE user_subscriptions (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  UNIQUE(user_id)
);

CREATE TABLE plan_limits (
  plan              TEXT PRIMARY KEY,
  max_jd_count      INTEGER NOT NULL,
  max_questions     INTEGER NOT NULL,
  max_categories    INTEGER NOT NULL
);
```

### RLS (Phase A 이후 강화)

data-access 레이어의 userId 필터가 1차 방어선. RLS는 2차 방어선으로 추가 검토. followup_questions에 user_id 컬럼이 있으므로 RLS를 모든 비즈니스 테이블에 직접 적용 가능:

```sql
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON job_descriptions
  USING (user_id = current_setting('app.current_user_id')::TEXT);
-- 각 테이블에 동일 정책 적용
```
