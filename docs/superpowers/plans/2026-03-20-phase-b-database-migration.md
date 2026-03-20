# Phase B: SQLite → Drizzle + PostgreSQL 마이그레이션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SQLite + better-sqlite3 raw SQL 기반 앱을 Drizzle ORM + Docker PostgreSQL(로컬) + Neon PostgreSQL(프로덕션)으로 전환하고 Vercel에 배포한다.

**Architecture:** 기존 data-access 레이어의 모든 함수를 동기 → 비동기로 전환하고, raw SQL → Drizzle 쿼리 빌더로 교체한다. question_keywords 테이블은 interview_questions.keywords TEXT[] 배열로 흡수한다. Phase B에서는 단일유저(DEFAULT_USER_ID = 'local-user')로 동작하며, user_id 컬럼은 스키마에 포함하되 data-access API에는 노출하지 않는다.

**Tech Stack:** Drizzle ORM, @neondatabase/serverless (프로덕션), pg (로컬), Docker Compose, Vercel

**Spec:** `docs/superpowers/specs/2026-03-20-database-migration-multiuser-design.md`

---

## 파일 구조 맵

### 새로 생성할 파일

| 파일                  | 책임                                             |
| --------------------- | ------------------------------------------------ |
| `docker-compose.yml`  | 로컬 PostgreSQL 17 컨테이너                      |
| `.env.local`          | 로컬 DB 연결 문자열                              |
| `.env.example`        | 환경변수 템플릿                                  |
| `drizzle.config.ts`   | Drizzle Kit 설정 (마이그레이션 생성/실행)        |
| `src/db/schema.ts`    | Drizzle pgTable 스키마 정의 (전체 재작성)        |
| `src/db/index.ts`     | DB 연결 관리 (전체 재작성, 환경별 드라이버 분기) |
| `src/db/migrate.ts`   | 마이그레이션 실행 스크립트                       |
| `src/db/constants.ts` | DEFAULT_USER_ID, SYSTEM_USER_ID 상수             |

### 수정할 파일

| 파일                                                 | 변경 내용                                                 |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `package.json`                                       | 의존성 교체 + scripts 추가                                |
| `src/data-access/types.ts`                           | 타입에 keywords 배열 추가, 날짜 타입 변경                 |
| `src/data-access/questions.ts`                       | 전체 재작성 (Drizzle + async)                             |
| `src/data-access/categories.ts`                      | 전체 재작성 (Drizzle + async)                             |
| `src/data-access/jobs.ts`                            | 전체 재작성 (Drizzle + async)                             |
| `src/data-access/followups.ts`                       | 전체 재작성 (Drizzle + async)                             |
| `src/data-access/import.ts`                          | 전체 재작성 (Drizzle + async + keywords 배열)             |
| `src/data-access/cleanup.ts`                         | 전체 재작성 (Drizzle + async + PG 날짜 함수)              |
| `src/data-access/index.ts`                           | import/cleanup re-export 추가                             |
| `src/db/seed.ts`                                     | Drizzle + async 전환                                      |
| `data/seed.sample.ts`                                | keywords를 질문 객체에 직접 포함하도록 구조 변경          |
| `src/test/helpers/db.ts`                             | PG 기반 테스트 헬퍼로 전체 재작성                         |
| `src/app/interviews/page.tsx`                        | async 함수 호출로 전환                                    |
| `src/app/interviews/questions/page.tsx`              | async 함수 호출로 전환                                    |
| `src/app/interviews/jobs/[id]/page.tsx`              | async 함수 호출로 전환                                    |
| `src/app/interviews/jobs/[id]/edit/page.tsx`         | async 함수 호출로 전환                                    |
| `src/app/interviews/jobs/new/page.tsx`               | async 함수 호출로 전환                                    |
| `src/actions/question-actions.ts`                    | async 전환 + updateQuestionKeywords → updateQuestion 통합 |
| `src/actions/category-actions.ts`                    | async 전환                                                |
| `src/actions/job-actions.ts`                         | async 전환                                                |
| `src/actions/followup-actions.ts`                    | async 전환                                                |
| `src/actions/import-actions.ts`                      | async 전환                                                |
| `src/components/interviews/question-edit-drawer.tsx` | updateQuestionKeywordsAction 호출 제거                    |
| `src/app/interviews/trash/page.tsx`                  | async 함수 호출로 전환                                    |
| `src/app/study/page.tsx`                             | async 함수 호출로 전환                                    |
| `.gitignore`                                         | .env.local 추가                                           |
| `vitest.config.ts` (또는 유사)                       | 테스트 환경 설정 변경                                     |

### 삭제할 파일/코드

- `better-sqlite3` 및 `@types/better-sqlite3` 의존성 제거
- `question_keywords` 테이블 관련 코드 (batchLoadKeywords, updateQuestionKeywords)

---

## Task 1: Docker Compose + 환경변수 설정

**Files:**

- Create: `docker-compose.yml`
- Create: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: docker-compose.yml 생성**

```yaml
# docker-compose.yml
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

- [ ] **Step 2: .env.example 생성**

```env
# .env.example
DATABASE_URL=postgresql://intervuddy:intervuddy@localhost:5432/intervuddy
```

- [ ] **Step 3: .env.local 생성**

```env
DATABASE_URL=postgresql://intervuddy:intervuddy@localhost:5432/intervuddy
```

- [ ] **Step 4: .gitignore에 .env.local 추가**

`.gitignore`에 `.env.local`이 없으면 추가. Next.js 프로젝트는 기본적으로 포함되어 있을 수 있으므로 확인.

- [ ] **Step 5: Docker PG 기동 확인**

Run: `docker compose up -d && docker compose exec db psql -U intervuddy -c 'SELECT 1'`
Expected: 정상 연결 확인

- [ ] **Step 6: 커밋**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "chore: add Docker Compose for local PostgreSQL"
```

---

## Task 2: 의존성 교체

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Drizzle/PG 패키지 설치 (better-sqlite3는 아직 제거하지 않음)**

> **주의:** better-sqlite3는 Task 14(최종 검증)에서 제거한다. Task 2~12 중간 단계에서는 기존 코드와 새 코드가 공존하므로, 일부 타입 에러가 발생할 수 있다. 이는 각 Task에서 해당 파일을 전환하면서 해소된다.

Run:

```bash
pnpm add drizzle-orm pg @neondatabase/serverless
pnpm add -D drizzle-kit @types/pg
```

- [ ] **Step 2: package.json scripts 추가**

`package.json`의 `scripts`에 추가:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "tsx src/db/migrate.ts",
"db:studio": "drizzle-kit studio"
```

기존 `db:seed`와 `db:seed:sample`은 유지 (seed.ts를 나중에 전환).

- [ ] **Step 3: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace better-sqlite3 with drizzle-orm and pg"
```

---

## Task 3: Drizzle 스키마 정의

**Files:**

- Rewrite: `src/db/schema.ts`
- Create: `src/db/constants.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: src/db/constants.ts 생성**

```typescript
export const SYSTEM_USER_ID = 'system';
export const DEFAULT_USER_ID = 'local-user';
```

- [ ] **Step 2: src/db/schema.ts를 Drizzle pgTable로 전체 재작성**

기존 `initializeDatabase()` SQL을 Drizzle 스키마로 변환. 스펙 섹션 3.2 + 3.4(Drizzle 예시) 참조.

포함할 테이블:

- `users` (id, name, email, emailVerified, image, createdAt, updatedAt)
- `accounts` (NextAuth용)
- `verificationTokens` (매직 링크용)
- `jobDescriptions` (user_id 포함)
- `interviewCategories` (user_id, sourceCategoryId 포함)
- `interviewQuestions` (user_id, keywords TEXT[] 포함)
- `followupQuestions` (user_id 포함)

**핵심 변경점:**

- `question_keywords` 테이블 없음 → `interviewQuestions.keywords` TEXT[] 배열
- 모든 테이블에 `userId` 컬럼 (FK → users)
- `GENERATED ALWAYS AS IDENTITY` PK
- `TIMESTAMPTZ` 날짜 컬럼
- CHECK 제약: `display_order >= 0`, `length(trim(question)) > 0`
- CHECK 제약: 시스템 유저면 jd_id = NULL

Drizzle relations도 정의하여 관계 조회 가능하도록 함.

- [ ] **Step 3: drizzle.config.ts 생성**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: 마이그레이션 생성 및 확인**

Run: `pnpm db:generate`
Expected: `drizzle/migrations/` 디렉토리에 SQL 마이그레이션 파일 생성

생성된 SQL을 확인하여 스펙의 인덱스(섹션 3.5)와 트리거(섹션 3.6)가 포함되어 있는지 검증. Drizzle Kit이 자동 생성하지 않는 부분은 커스텀 마이그레이션 SQL로 수동 추가.

- [ ] **Step 4.1: 커스텀 마이그레이션 SQL 작성**

Drizzle Kit이 자동 생성하지 않아서 수동 추가가 필요한 항목:

**Partial Index (12개):**

- `idx_categories_user_jd` — WHERE deleted_at IS NULL
- `idx_categories_user_slug_unique` — WHERE jd_id IS NULL AND deleted_at IS NULL
- `idx_categories_jd_name_unique` — WHERE deleted_at IS NULL
- `idx_categories_source_jd` — WHERE source_category_id IS NOT NULL AND deleted_at IS NULL
- `idx_questions_category_order` — WHERE deleted_at IS NULL
- `idx_questions_user_jd` — WHERE deleted_at IS NULL
- `idx_questions_origin_jd` — WHERE origin_question_id IS NOT NULL AND deleted_at IS NULL
- `idx_questions_keywords_gin` — GIN 인덱스
- `idx_followups_question_order` — WHERE deleted_at IS NULL
- `idx_jobs_user_status` — WHERE deleted_at IS NULL
- `idx_questions_deleted` — WHERE deleted_at IS NOT NULL
- `idx_categories_deleted` — WHERE deleted_at IS NOT NULL

**트리거 (5개):**

- `update_updated_at()` 함수 + 5개 테이블 트리거

**CHECK 제약:**

- `user_id != 'system' OR jd_id IS NULL` (categories, questions)

이 SQL을 `drizzle/migrations/` 내 커스텀 파일로 추가하거나, 생성된 마이그레이션 파일에 직접 추가.

> **참고:** `drizzle.config.ts`는 프로젝트 루트에 배치 (Drizzle Kit 기본 동작). 스펙 6.3의 `drizzle/drizzle.config.ts` 경로와 다르나 이것이 올바름.

- [ ] **Step 5: 커밋**

```bash
git add src/db/schema.ts src/db/constants.ts drizzle.config.ts drizzle/
git commit -m "feat: define Drizzle ORM schema for PostgreSQL"
```

---

## Task 4: DB 연결 + 마이그레이션 실행

**Files:**

- Rewrite: `src/db/index.ts`
- Create: `src/db/migrate.ts`

- [ ] **Step 1: src/db/index.ts 전체 재작성**

환경별 드라이버 분기:

- 프로덕션 (Neon): `@neondatabase/serverless` + `drizzle-orm/neon-serverless`
- 로컬 (Docker): `pg` Pool + `drizzle-orm/node-postgres`

분기 기준: `DATABASE_URL`에 `neon.tech`가 포함되면 Neon 드라이버, 아니면 pg Pool.

**Neon 드라이버 선택:** `@neondatabase/serverless`의 `Pool`을 사용 (`neon()` HTTP 함수는 트랜잭션 미지원). `drizzle-orm/neon-serverless`와 조합하여 트랜잭션이 필요한 import/cleanup도 정상 동작.

테스트용 `setDb()`, `resetDb()` 함수도 유지 (async 버전).

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// 환경별 분기 로직
// export const db = ...
// export type Database = typeof db;
```

- [ ] **Step 2: src/db/migrate.ts 생성**

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';
// db 연결 → migrate(db, { migrationsFolder: './drizzle/migrations' })
```

- [ ] **Step 3: 마이그레이션 실행 확인**

Run: `pnpm db:migrate`
Expected: Docker PG에 모든 테이블 생성 확인

검증: `docker compose exec db psql -U intervuddy -c '\dt'` 로 테이블 목록 확인

- [ ] **Step 4: 커밋**

```bash
git add src/db/index.ts src/db/migrate.ts
git commit -m "feat: add DB connection with env-based driver switching and migration runner"
```

---

## Task 5: data-access/types.ts 업데이트

**Files:**

- Modify: `src/data-access/types.ts`

- [ ] **Step 1: 타입 변경**

변경 사항:

- 날짜 필드: `string | null` → `Date | null` (TIMESTAMPTZ → JS Date). Drizzle은 TIMESTAMPTZ를 JS Date로 반환한다.
  - **프론트엔드 영향:** Server Component → Client Component로 Date를 props로 전달하면 Next.js가 자동 직렬화(ISO string)하므로 문제없음. 단, Client Component에서 날짜를 표시하는 코드가 `new Date(createdAt)` 대신 직접 string으로 처리하고 있다면 수정 필요.
- `InterviewQuestion.keywords`: 이미 `string[]`이므로 변경 없음
- `InterviewCategory`에 `updatedAt: Date` 추가 (기존 SQLite에는 없었으나 PostgreSQL 스키마에 추가됨)
- `CreateQuestionInput`에 `keywords?: string[]` 추가
- `UpdateQuestionInput`에 `keywords?: string[]` 추가

- [ ] **Step 2: 커밋**

```bash
git add src/data-access/types.ts
git commit -m "refactor: update data-access types for PostgreSQL (Date, keywords array)"
```

---

## Task 6: data-access/jobs.ts Drizzle 전환

**Files:**

- Rewrite: `src/data-access/jobs.ts`
- Test: 기존 `*.test.ts` (나중에 Task 10에서 전환)

- [ ] **Step 1: jobs.ts 전체 재작성**

모든 함수를 `async`로 전환하고 Drizzle 쿼리 빌더 사용:

```typescript
import { db } from '@/db';
import { jobDescriptions, interviewQuestions } from '@/db/schema';
import { eq, isNull, isNotNull, sql, desc } from 'drizzle-orm';
import { DEFAULT_USER_ID } from '@/db/constants';
```

함수 목록 (모두 async):

- `getAllJobs()` — SELECT + 서브쿼리(question_count) + WHERE deleted_at IS NULL
- `getJobById(id)` — 단일 행 조회
- `createJob(input)` — INSERT + DEFAULT_USER_ID
- `updateJob(input)` — 동적 SET (Drizzle의 `.set()` 사용)
- `updateJobStatus(id, status)` — 단일 필드 UPDATE
- `softDeleteJob(id)` — `sql\`NOW()\`` 사용
- `restoreJob(id)` — deleted_at = NULL
- `softDeleteJobWithQuestions(id)` — 트랜잭션 (db.transaction)
- `restoreJobWithQuestions(id)` — 트랜잭션
- `getDeletedJobs()` — WHERE deleted_at IS NOT NULL

**핵심:** `datetime('now')` → `sql\`NOW()\``변환.`db.prepare(...).run()`→`db.insert/update/select` 변환.

- [ ] **Step 2: 타입 검사 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -30`
Expected: jobs.ts 관련 타입 에러 없음 (다른 파일은 아직 전환 안 됐으므로 에러 있을 수 있음)

- [ ] **Step 3: 커밋**

```bash
git add src/data-access/jobs.ts
git commit -m "refactor: migrate jobs data-access to Drizzle ORM (async)"
```

---

## Task 7: data-access/categories.ts Drizzle 전환

**Files:**

- Rewrite: `src/data-access/categories.ts`

- [ ] **Step 1: categories.ts 전체 재작성**

함수 목록 (모두 async):

- `getGlobalCategories()` — LEFT JOIN + COUNT + GROUP BY (Drizzle query builder)
- `getCategoriesByJdId(jdId)` — 동일 패턴, WHERE 조건만 다름
- `createCategory(input)` — INSERT + COALESCE 서브쿼리 (display_order 자동 계산)
- `updateCategory(id, input)` — 동적 SET
- `softDeleteCategory(id)` — `sql\`NOW()\``
- `restoreCategory(id)` — deleted_at = NULL

**핵심:** COALESCE + CASE WHEN 서브쿼리는 Drizzle의 `sql` 헬퍼로 표현.

```typescript
import { db } from '@/db';
import { interviewCategories, interviewQuestions } from '@/db/schema';
import { eq, isNull, isNotNull, sql, and, or, count } from 'drizzle-orm';
import { DEFAULT_USER_ID } from '@/db/constants';
```

- [ ] **Step 2: 커밋**

```bash
git add src/data-access/categories.ts
git commit -m "refactor: migrate categories data-access to Drizzle ORM (async)"
```

---

## Task 8: data-access/questions.ts Drizzle 전환

**Files:**

- Rewrite: `src/data-access/questions.ts`

- [ ] **Step 1: questions.ts 전체 재작성**

**가장 큰 변경:** batchLoadKeywords 삭제 → keywords가 질문 row에 이미 포함됨.

함수 목록 (모두 async):

- `getLibraryQuestions()` — SELECT + JOIN categories + batchLoadFollowups
- `getQuestionsByJdId(jdId)` — 동일 패턴
- `getQuestionsByCategory(categoryId)` — 동일 패턴
- `createQuestion(input)` — INSERT + COALESCE 서브쿼리 + keywords 배열
- `updateQuestion(input)` — 동적 SET + keywords 배열 업데이트
- `softDeleteQuestion(id)` — `sql\`NOW()\``
- `restoreQuestion(id)` — deleted_at = NULL
- `getDeletedQuestions(jdId?)` — WHERE deleted_at IS NOT NULL

**삭제:**

- `batchLoadKeywords()` — 더 이상 필요 없음
- `updateQuestionKeywords()` — updateQuestion에서 keywords 배열 직접 SET
- `BatchKeywordRow` 인터페이스

**연쇄 변경 (updateQuestionKeywords 삭제에 따른):**

- `src/actions/question-actions.ts`: `updateQuestionKeywordsAction` 함수에서 `dbUpdateKeywords` 대신 `dbUpdateQuestion({ id: questionId, keywords })` 호출로 변경. 또는 `updateQuestionKeywordsAction` 자체를 `updateQuestionAction`에 통합.
- `src/components/interviews/question-edit-drawer.tsx`: `updateQuestionKeywordsAction` 호출을 `updateQuestionAction`에 keywords 포함하여 단일 호출로 통합.
- 관련 테스트 파일도 함께 수정.

**유지:**

- `batchLoadFollowups()` — followup_questions는 여전히 별도 테이블

```typescript
import { db } from '@/db';
import { interviewQuestions, interviewCategories, followupQuestions } from '@/db/schema';
import { eq, isNull, isNotNull, sql, and, inArray } from 'drizzle-orm';
import { DEFAULT_USER_ID } from '@/db/constants';
```

- [ ] **Step 2: 커밋**

```bash
git add src/data-access/questions.ts
git commit -m "refactor: migrate questions data-access to Drizzle ORM (async, keywords array)"
```

---

## Task 9: data-access/followups.ts, import.ts, cleanup.ts, index.ts Drizzle 전환

**Files:**

- Rewrite: `src/data-access/followups.ts`
- Rewrite: `src/data-access/import.ts`
- Rewrite: `src/data-access/cleanup.ts`
- Modify: `src/data-access/index.ts`

- [ ] **Step 1: followups.ts 전체 재작성**

함수 목록 (모두 async):

- `getFollowupsByQuestionId(questionId)` — SELECT + ORDER BY
- `createFollowup(input)` — INSERT + COALESCE 서브쿼리
- `updateFollowup(input)` — 동적 SET
- `softDeleteFollowup(id)` — `sql\`NOW()\``
- `restoreFollowup(id)` — deleted_at = NULL

- [ ] **Step 2: import.ts 전체 재작성**

**변경점:**

- `question_keywords` 테이블 대신 원본 질문의 `keywords` 배열을 직접 복사
- `insertKeyword` 루프 삭제 → 질문 INSERT 시 `keywords` 배열 포함

```typescript
// Before (SQLite):
// const keywords = db.prepare('SELECT keyword FROM question_keywords WHERE question_id = ?')...
// for (const kw of keywords) insertKeyword.run(...)

// After (Drizzle):
// 원본 질문의 keywords 배열을 그대로 새 질문에 넣음
// keywords: original.keywords  ← 이미 배열
```

- [ ] **Step 3: cleanup.ts 전체 재작성**

**변경점:**

- `datetime('now', ?)` → `sql\`NOW() - INTERVAL '1 day' \* ${retentionDays}\`` (PostgreSQL 문법, INTERVAL에 직접 파라미터 바인딩 불가하므로 곱셈 패턴 사용)
- `question_keywords` 관련 주석 제거 (이제 CASCADE로 자동 삭제 대신 keywords가 질문에 포함)

- [ ] **Step 4: index.ts에 import/cleanup re-export 추가**

```typescript
export * from './types';
export * from './questions';
export * from './categories';
export * from './jobs';
export * from './followups';
export * from './import';
export * from './cleanup';
```

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/followups.ts src/data-access/import.ts src/data-access/cleanup.ts src/data-access/index.ts
git commit -m "refactor: migrate followups, import, cleanup to Drizzle ORM (async)"
```

---

## Task 10: 시드 스크립트 전환

**Files:**

- Rewrite: `src/db/seed.ts`
- Modify: `data/seed.sample.ts`

- [ ] **Step 1: data/seed.sample.ts 구조 변경**

keywords를 별도 배열이 아닌 질문 객체에 포함하도록 유지 (이미 포함되어 있으므로 seed.ts의 삽입 로직만 변경).

- [ ] **Step 2: src/db/seed.ts 전체 재작성**

```typescript
// 핵심 변경:
// 1. db.prepare → Drizzle db.insert 사용
// 2. 동기 → async
// 3. question_keywords INSERT 삭제 → keywords 배열을 질문 INSERT에 포함
// 4. DEFAULT_USER_ID로 모든 데이터의 user_id 설정
// 5. 'system' 유저와 'local-user' 유저를 users 테이블에 시드
```

- [ ] **Step 3: 시드 실행 확인**

Run: `pnpm db:seed:sample`
Expected: 정상 실행, 카테고리/질문/키워드/꼬리질문 수 출력

검증: `docker compose exec db psql -U intervuddy -c 'SELECT COUNT(*) FROM interview_questions'`

- [ ] **Step 4: 커밋**

```bash
git add src/db/seed.ts data/seed.sample.ts
git commit -m "refactor: migrate seed script to Drizzle ORM (async, keywords array)"
```

---

## Task 11: 테스트 헬퍼 전환

**Files:**

- Rewrite: `src/test/helpers/db.ts`
- Modify: `vitest.config.ts` (필요 시)

- [ ] **Step 1: src/test/helpers/db.ts 전체 재작성**

```typescript
// 핵심 변경:
// 1. in-memory SQLite → Docker PG의 테스트 DB (intervuddy_test)
// 2. 격리 전략: TRUNCATE ... CASCADE (beforeEach에서 실행)
//    - 트랜잭션 롤백 방식보다 단순하고 Drizzle과 호환 문제 없음
//    - 테스트 수가 적고 데이터가 소규모이므로 성능 문제 없음
// 3. seedTestCategories/seedTestQuestions/seedTestJobDescription을 Drizzle INSERT로 전환
// 4. keywords를 질문 INSERT 시 배열로 포함
```

테스트 DB 연결:

```typescript
const TEST_DATABASE_URL =
  process.env.DATABASE_URL?.replace('/intervuddy', '/intervuddy_test') ||
  'postgresql://intervuddy:intervuddy@localhost:5432/intervuddy_test';
```

테스트 DB 생성은 수동 또는 setup 스크립트로:

```bash
docker compose exec db psql -U intervuddy -c 'CREATE DATABASE intervuddy_test'
```

- [ ] **Step 2: 기존 테스트 파일 수정**

각 `*.test.ts` 파일에서:

- `createTestDb()` → 새로운 async 버전 사용
- `cleanupTestDb()` → 새로운 async 버전 사용
- 동기 data-access 호출 → `await` 추가

- [ ] **Step 3: 테스트 실행 확인**

Run: `pnpm test`
Expected: 모든 테스트 통과

- [ ] **Step 4: 커밋**

```bash
git add src/test/helpers/db.ts src/**/*.test.ts vitest.config.ts
git commit -m "refactor: migrate test infrastructure to Docker PostgreSQL"
```

---

## Task 12: Server Actions 전환

**Files:**

- Modify: `src/actions/question-actions.ts`
- Modify: `src/actions/category-actions.ts`
- Modify: `src/actions/job-actions.ts`
- Modify: `src/actions/followup-actions.ts`
- Modify: `src/actions/import-actions.ts`
- Modify: `src/components/interviews/question-edit-drawer.tsx`

- [ ] **Step 1: question-actions.ts 수정**

핵심 변경:

- `dbUpdateKeywords` import 제거
- `updateQuestionKeywordsAction` 함수에서 `dbUpdateKeywords(questionId, keywords)` 대신 `await dbUpdateQuestion({ id: questionId, keywords })` 호출
- 또는 `updateQuestionKeywordsAction`을 제거하고 `updateQuestionAction`에 keywords 로직 통합

- [ ] **Step 2: question-edit-drawer.tsx 수정**

`updateQuestionKeywordsAction` 호출을 `updateQuestionAction`에 keywords를 포함하여 단일 호출로 통합.

- [ ] **Step 3: 나머지 Server Actions에서 data-access 호출에 await 확인**

`category-actions.ts`, `job-actions.ts`, `followup-actions.ts`, `import-actions.ts`에서 data-access 호출이 이미 await를 사용하고 있는지 확인. 빠진 곳에 await 추가.

- [ ] **Step 4: 커밋**

```bash
git add src/actions/ src/components/interviews/question-edit-drawer.tsx
git commit -m "refactor: update Server Actions for Drizzle async + remove updateQuestionKeywords"
```

---

## Task 13: Server Component async 전환

**Files:**

- Modify: `src/app/interviews/page.tsx`
- Modify: `src/app/interviews/questions/page.tsx`
- Modify: `src/app/interviews/jobs/[id]/page.tsx`
- Modify: `src/app/interviews/jobs/[id]/edit/page.tsx`
- Modify: `src/app/interviews/jobs/new/page.tsx`
- Modify: `src/app/interviews/trash/page.tsx`
- Modify: `src/app/study/page.tsx`

- [ ] **Step 1: 모든 Server Component에서 data-access 호출에 await 추가**

대부분의 Server Component는 이미 `async function`일 가능성이 높음 (Next.js App Router 기본). data-access 함수 호출에 `await`만 추가하면 됨.

```typescript
// Before (동기):
const jobs = getAllJobs();

// After (비동기):
const jobs = await getAllJobs();
```

각 파일을 확인하고 필요한 곳에 `await` 추가.

- [ ] **Step 2: 개발 서버로 동작 확인**

Run: `pnpm dev`
Expected: 모든 페이지가 정상 동작, 데이터 표시 확인

수동 확인:

- `/interviews` — JD 목록 로드
- `/interviews/questions` — 글로벌 질문 목록 로드
- `/interviews/jobs/new` — JD 생성 폼
- `/study` — 스터디 페이지

- [ ] **Step 3: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add src/app/
git commit -m "refactor: add await to all data-access calls in Server Components"
```

---

## Task 14: better-sqlite3 제거 + Lint + 타입 검사 + 전체 테스트

**Files:**

- Modify: `package.json`

- [ ] **Step 1: better-sqlite3 제거**

Run: `pnpm remove better-sqlite3 @types/better-sqlite3`

모든 data-access, db, 테스트 파일이 이미 Drizzle로 전환되었으므로 안전하게 제거 가능.

- [ ] **Step 2: 타입 검사**

Run: `pnpm tsc --noEmit`
Expected: 타입 에러 0개

에러가 있으면 수정 후 재실행.

- [ ] **Step 3: ESLint**

Run: `pnpm lint`
Expected: 에러 0개

에러가 있으면 `pnpm lint:fix`로 자동 수정 시도 후 수동 수정.

- [ ] **Step 4: Prettier**

Run: `pnpm format:check`
Expected: 포매팅 이슈 0개

이슈가 있으면 `pnpm format`으로 수정.

- [ ] **Step 5: 전체 테스트**

Run: `pnpm test`
Expected: 모든 테스트 통과

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore: remove better-sqlite3, fix lint and type errors after Drizzle migration"
```

---

## Task 15: Neon + Vercel 배포

**Files:** 없음 (외부 설정)

- [ ] **Step 1: Neon 프로젝트 생성**

1. [neon.tech](https://neon.tech) 가입/로그인
2. 프로젝트 생성 (region: ap-northeast-1 또는 가장 가까운 리전)
3. 연결 문자열 복사

- [ ] **Step 2: Neon에 마이그레이션 실행**

```bash
DATABASE_URL=<neon-connection-string> pnpm db:migrate
DATABASE_URL=<neon-connection-string> pnpm db:seed:sample
```

- [ ] **Step 3: Vercel 프로젝트 설정**

1. Vercel에 GitHub 레포 연결 (이미 되어 있다면 스킵)
2. Environment Variables에 `DATABASE_URL` = Neon 연결 문자열 추가
3. 배포 트리거

- [ ] **Step 4: 배포 확인**

배포된 URL에서 모든 페이지 동작 확인:

- `/interviews` — JD 목록
- `/interviews/questions` — 글로벌 질문
- `/study` — 스터디 페이지
- CRUD 동작: JD 생성, 질문 추가/수정/삭제

- [ ] **Step 5: 완료 확인**

Phase B 완료 조건 체크:

- [x] Drizzle 스키마 정의 완료
- [x] data-access 전 함수 async 전환 + Drizzle 쿼리 빌더 사용
- [x] Docker PG 로컬 개발 환경 구동
- [x] 기존 테스트 전부 통과 (PG 기반)
- [x] Neon + Vercel 배포 성공
- [x] 기존 기능 동일 동작 확인
