# Monorepo + NestJS Backend Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 단일 앱을 pnpm workspace + Turborepo 모노레포로 전환하고, NestJS(Fastify) 백엔드를 추가한다.

**Architecture:** 점진적 마이그레이션 7단계. 각 단계에서 빌드/테스트 통과를 확인하며, git mv로 히스토리를 보존한다. packages/database로 DB 레이어를 추출하고, 서비스 JWT로 Next.js↔NestJS 인증을 분리한다.

**Tech Stack:** pnpm workspace, Turborepo, NestJS 11, Fastify, Drizzle ORM, @nestjs/jwt, jsonwebtoken

**Spec:** `docs/superpowers/specs/2026-03-23-monorepo-nestjs-setup-design.md`

---

## File Structure Overview

### 신규 생성 파일

```
# 루트 설정
pnpm-workspace.yaml
turbo.json
tsconfig.base.json
package.json                          ← 루트 (기존 것을 재구성)

# packages/shared
packages/shared/package.json
packages/shared/src/index.ts
packages/shared/src/types.ts          ← git mv from src/data-access/types.ts
packages/shared/src/constants.ts      ← git mv from src/db/constants.ts
packages/shared/tsconfig.json

# packages/database
packages/database/package.json
packages/database/src/index.ts
packages/database/src/connection.ts   ← 신규 (듀얼 드라이버 팩토리)
packages/database/src/schema.ts       ← git mv from src/db/schema.ts
packages/database/src/migrate.ts      ← git mv from src/db/migrate.ts
packages/database/src/seed.ts         ← git mv from src/db/seed.ts
packages/database/src/data-access/    ← git mv from src/data-access/ (전체)
packages/database/src/test-helpers/db.ts ← git mv from src/test/helpers/db.ts
packages/database/drizzle/            ← git mv from drizzle/
packages/database/drizzle.config.ts   ← git mv from drizzle.config.ts
packages/database/tsconfig.json
packages/database/vitest.config.ts

# apps/web 래퍼
apps/web/src/db/index.ts              ← 신규 (getDb 래퍼)
apps/web/package.json                 ← 기존 package.json에서 분리

# apps/server (NestJS)
apps/server/package.json
apps/server/tsconfig.json
apps/server/tsconfig.build.json
apps/server/nest-cli.json
apps/server/src/main.ts
apps/server/src/app.module.ts
apps/server/src/app.controller.ts
apps/server/src/app.controller.spec.ts
apps/server/src/common/config/env.validation.ts
apps/server/src/common/database/database.module.ts
apps/server/src/common/guards/jwt-auth.guard.ts
apps/server/src/common/strategies/jwt.strategy.ts
apps/server/src/common/filters/global-exception.filter.ts
apps/server/src/common/interceptors/logging.interceptor.ts
apps/server/src/modules/.gitkeep
apps/server/Dockerfile
apps/server/.env.local
apps/server/vitest.config.ts

# apps/web 서비스 JWT
apps/web/src/app/api/auth/service-token/route.ts
apps/web/src/lib/service-jwt.ts

# Docker
.dockerignore                         ← 루트에 위치 (Docker context가 루트이므로)
```

### 수정 파일

```
# 모노레포 전환 시 이동
partykit/ → apps/partykit/            ← PartyKit 디렉토리도 workspace 멤버로 이동
apps/web/tsconfig.json                ← extends 수정
apps/web/vitest.config.ts             ← 경로 수정
apps/web/playwright.config.ts         ← 경로 수정
apps/web/next.config.ts               ← 이동 후 transpilePackages 추가

# import 경로 변경 (대량)
apps/web/src/**/*.ts                  ← @/db → @/db (래퍼) or @intervuddy/database
apps/web/src/**/*.tsx                 ← @/data-access → @intervuddy/database

# ESLint
eslint.config.mjs                     ← apps/server override 추가

# Docker
docker-compose.yml                    ← server 서비스 추가 (선택)
```

---

## Task 1: 모노레포 골격 생성

**Files:**

- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `package.json` (루트 재구성)

- [ ] **Step 1: pnpm-workspace.yaml 생성**

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: turbo.json 생성**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 3: tsconfig.base.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules"]
}
```

> **Note**: `noEmit`과 `jsx`는 앱별 tsconfig에서 설정. base에는 포함하지 않음. apps/web은 `"jsx": "preserve"`, `"noEmit": true`. apps/server는 `"noEmit": false`, `"outDir": "./dist"`.

- [ ] **Step 4: apps/ 및 packages/ 디렉토리 생성**

```bash
mkdir -p apps packages/shared/src packages/database/src
```

- [ ] **Step 5: turbo를 루트 devDependencies에 추가**

```bash
pnpm add -D turbo -w
```

- [ ] **Step 6: 검증 - pnpm install 성공 확인**

Run: `pnpm install`
Expected: 성공, node_modules에 turbo 설치됨

- [ ] **Step 7: 커밋**

```bash
git add pnpm-workspace.yaml turbo.json tsconfig.base.json package.json pnpm-lock.yaml
git commit -m "chore: 모노레포 골격 생성 (pnpm workspace + turbo)"
```

---

## Task 2: Next.js를 apps/web/으로 이동

**Files:**

- Move: `src/` → `apps/web/src/`
- Move: `public/` → `apps/web/public/`
- Move: Next.js 설정 파일들 → `apps/web/`
- Create: `apps/web/package.json`
- Modify: `package.json` (루트 - 의존성 분리)
- Modify: `apps/web/tsconfig.json` (extends 수정)

- [ ] **Step 1: Next.js 관련 파일 모두 이동**

```bash
git mv src/ apps/web/src/
git mv public/ apps/web/public/
git mv next.config.ts apps/web/
git mv tailwind.config.ts apps/web/
git mv postcss.config.mjs apps/web/
git mv components.json apps/web/
git mv tsconfig.json apps/web/
git mv vitest.config.ts apps/web/
git mv playwright.config.ts apps/web/
git mv next-env.d.ts apps/web/
git mv e2e/ apps/web/e2e/
git mv data/ apps/web/data/
git mv partykit/ apps/partykit/
```

> **Note**: `partykit/`는 자체 `package.json`이 있으므로 `apps/partykit/`로 이동하여 workspace 멤버로 등록. `docker/`, `.husky/`, `.github/`는 루트에 유지.

- [ ] **Step 2: .env.local 복사 (gitignored이므로 git mv 불필요)**

```bash
cp .env.local apps/web/.env.local
```

- [ ] **Step 3: apps/web/package.json 생성**

기존 루트 `package.json`의 dependencies와 devDependencies를 `apps/web/package.json`으로 이동. 아래는 핵심 구조:

```json
{
  "name": "@intervuddy/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    "next": "16.1.7",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "next-auth": "5.0.0-beta.30",
    "@auth/drizzle-adapter": "^2.10.0",
    "drizzle-orm": "^0.45.1",
    "pg": "^8.20.0",
    "@neondatabase/serverless": "^1.0.0",
    "zustand": "^5.0.12",
    "resend": "^4.5.2",
    "lucide-react": "^0.488.0",
    "@intervuddy/database": "workspace:*",
    "@intervuddy/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "vitest": "^4.1.0",
    "@testing-library/react": "^16.3.0",
    "@playwright/test": "^1.58.2",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  }
}
```

> **주의**: 위 의존성 목록은 예시. **반드시 기존 `package.json`에서 정확한 버전과 전체 목록을 가져올 것.** 특히 누락하기 쉬운 패키지: `@base-ui/react`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `shadcn`, `tailwind-merge`, `tw-animate-css`, `vaul`, `@vitejs/plugin-react`, `dotenv`, `jsdom`, `@testing-library/jest-dom`. `packageManager` 필드도 루트 `package.json`에 유지할 것 (예: `"packageManager": "pnpm@9.15.9"`).

- [ ] **Step 4: 루트 package.json을 공통 devDeps만 남기도록 수정**

```json
{
  "name": "intervuddy",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:generate": "pnpm --filter @intervuddy/database db:generate",
    "db:migrate": "pnpm --filter @intervuddy/database db:migrate",
    "db:studio": "pnpm --filter @intervuddy/database db:studio",
    "db:seed:sample": "pnpm --filter @intervuddy/database db:seed:sample",
    "db:seed": "pnpm --filter @intervuddy/database db:seed"
  },
  "devDependencies": {
    "turbo": "^2",
    "prettier": "^3",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "eslint": "^9",
    "typescript": "^5",
    "husky": "^9",
    "lint-staged": "^16"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

- [ ] **Step 5: apps/web/tsconfig.json 수정 — extends 추가**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: apps/web/next.config.ts에 transpilePackages 추가**

현재 `next.config.ts`에 아래 설정 추가 (internal packages 트랜스파일):

```typescript
// next.config.ts에 추가
transpilePackages: ['@intervuddy/database', '@intervuddy/shared'],
```

- [ ] **Step 7: apps/web/vitest.config.ts 경로 수정**

`resolve.alias`의 `@` 경로가 `./src`를 가리키는지 확인. 모노레포 이동 후에도 상대 경로이므로 변경 불필요할 가능성 높음. 확인 후 필요 시 수정.

- [ ] **Step 8: eslint.config.mjs를 루트에 유지하되 apps/web 경로 반영**

ESLint flat config는 루트에 유지. 파일 패턴이 `src/**`였다면 `apps/web/src/**`로 변경 필요한지 확인. Turborepo가 각 앱 디렉토리에서 `eslint .`을 실행하므로, 앱 안에서의 상대 경로는 유지될 수 있음.

- [ ] **Step 9: pnpm install 실행**

```bash
pnpm install
```

- [ ] **Step 10: 검증 — apps/web 빌드 및 개발 서버**

```bash
pnpm --filter @intervuddy/web dev
# → localhost:3000 접속 확인

pnpm --filter @intervuddy/web build
# → 성공 확인
```

Expected: 기존과 동일하게 동작

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -m "refactor: Next.js를 apps/web/으로 이동 (모노레포 1단계)"
```

---

## Task 3: packages/shared 추출

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Move: `apps/web/src/data-access/types.ts` → `packages/shared/src/types.ts`
- Move: `apps/web/src/db/constants.ts` → `packages/shared/src/constants.ts`
- Modify: `apps/web/src/` 내 import 경로 변경

- [ ] **Step 1: packages/shared/package.json 생성**

```json
{
  "name": "@intervuddy/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {}
}
```

- [ ] **Step 2: packages/shared/tsconfig.json 생성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 타입과 상수 파일 이동**

```bash
git mv apps/web/src/data-access/types.ts packages/shared/src/types.ts
git mv apps/web/src/db/constants.ts packages/shared/src/constants.ts
```

- [ ] **Step 4: packages/shared/src/index.ts 생성 (public exports)**

```typescript
export * from './types';
export * from './constants';
```

- [ ] **Step 5: apps/web에서 import 경로 일괄 변경**

아래 패턴을 프로젝트 전체에서 변경:

```
@/data-access/types  →  @intervuddy/shared
@/db/constants       →  @intervuddy/shared
```

검색 명령어:

```bash
# 변경 대상 파일 확인
grep -r "@/data-access/types" apps/web/src/ --include="*.ts" --include="*.tsx" -l
grep -r "@/db/constants" apps/web/src/ --include="*.ts" --include="*.tsx" -l
```

각 파일에서 import 경로 변경. 예시:

```typescript
// Before
import type { JobDescription } from '@/data-access/types';
import { SYSTEM_USER_ID } from '@/db/constants';

// After
import type { JobDescription } from '@intervuddy/shared';
import { SYSTEM_USER_ID } from '@intervuddy/shared';
```

- [ ] **Step 6: pnpm install**

```bash
pnpm install
```

- [ ] **Step 7: 검증 — 타입 체크 및 빌드**

```bash
pnpm --filter @intervuddy/web build
```

Expected: 성공

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "refactor: packages/shared로 타입 및 상수 추출"
```

---

## Task 4: packages/database 추출

이 태스크가 가장 크고 위험합니다. 서브태스크로 나눕니다.

> **중요**: Task 4a, 4b, 4c는 원자적 단위로 취급. 4a 커밋 후 ~ 4c 완료 전까지 `pnpm build`는 실패할 수 있음. 전체 검증은 4c 마지막에 수행. 문제 발생 시 4a 이전으로 롤백.

### Task 4a: 패키지 생성 + DB 파일 이동

**Files:**

- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/src/connection.ts` (신규 — 듀얼 드라이버)
- Create: `packages/database/src/index.ts`
- Move: `apps/web/src/db/schema.ts` → `packages/database/src/schema.ts`
- Move: `apps/web/src/db/migrate.ts` → `packages/database/src/migrate.ts`
- Move: `apps/web/src/db/seed.ts` → `packages/database/src/seed.ts`
- Move: `drizzle/` → `packages/database/drizzle/`
- Move: `drizzle.config.ts` → `packages/database/drizzle.config.ts`

- [ ] **Step 1: packages/database/package.json 생성**

```json
{
  "name": "@intervuddy/database",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:seed:sample": "tsx --env-file=../../apps/web/.env.local src/seed.ts --sample",
    "db:seed": "tsx --env-file=../../apps/web/.env.local src/seed.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.1",
    "pg": "^8.20.0",
    "@neondatabase/serverless": "^1.0.0",
    "@intervuddy/shared": "workspace:*"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.10",
    "tsx": "^4.21.0",
    "vitest": "^4.1.0",
    "@types/pg": "^8"
  }
}
```

- [ ] **Step 2: packages/database/tsconfig.json 생성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: DB 파일 이동**

```bash
git mv apps/web/src/db/schema.ts packages/database/src/schema.ts
git mv apps/web/src/db/migrate.ts packages/database/src/migrate.ts
git mv apps/web/src/db/seed.ts packages/database/src/seed.ts
```

- [ ] **Step 4: drizzle 마이그레이션 디렉토리 이동**

```bash
# drizzle/과 drizzle.config.ts는 루트에 위치 (Task 2에서 이동하지 않음)
git mv drizzle/ packages/database/drizzle/
git mv drizzle.config.ts packages/database/drizzle.config.ts
```

- [ ] **Step 5: packages/database/drizzle.config.ts 경로 수정**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 6: packages/database/src/connection.ts 생성 (pg Pool 전용)**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database 타입
export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Transaction 타입
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// Database 또는 Transaction (조합 가능한 함수용)
export type DbOrTx = Database | Transaction;

// 표준 pg Pool (NestJS, 로컬 개발, Docker, 테스트, 그리고 Vercel도)
export function createDb(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
```

> **Neon 드라이버 결정**: 현재 프로젝트는 이미 `pg` Pool로 Neon에 연결 중이고 정상 동작함 (Neon은 표준 PostgreSQL 프로토콜 지원). `@neondatabase/serverless` HTTP 드라이버는 Edge Runtime 전용이며, 현재 앱은 Edge Runtime을 사용하지 않으므로 `pg` Pool 단일 드라이버로 충분. Neon serverless 드라이버가 필요해지면 (Edge Runtime 전환 시) 별도 `connection-neon.ts` 파일로 추가.
>
> 이 결정으로 **트랜잭션 비호환 문제** (Neon HTTP 드라이버는 `db.transaction()` 미지원)를 근본적으로 회피함.

- [ ] **Step 7: 커밋 (파일 이동만, 리팩토링 전)**

```bash
git add -A
git commit -m "refactor: DB 파일을 packages/database로 이동"
```

### Task 4b: data-access 함수 리팩토링 (db 파라미터화)

**Files:**

- Move: `apps/web/src/data-access/*.ts` → `packages/database/src/data-access/`
- Move: `apps/web/src/test/helpers/db.ts` → `packages/database/src/test-helpers/db.ts`
- Create: `packages/database/src/index.ts`
- Modify: 모든 data-access 함수 (db 파라미터 추가)

- [ ] **Step 1: data-access 파일 이동**

```bash
git mv apps/web/src/data-access/ packages/database/src/data-access/
git mv apps/web/src/test/helpers/db.ts packages/database/src/test-helpers/db.ts
```

> `apps/web/src/data-access/types.ts`는 이미 Step 3에서 `packages/shared`로 이동됨. 남아있다면 이 시점에는 없어야 함.

- [ ] **Step 2: data-access 함수에 db 파라미터 추가**

모든 data-access 파일에서 다음 패턴으로 변환:

**변환 규칙:**

1. `import { db } from '@/db'` 또는 `import { getDb } from '@/db'` 제거
2. 함수 시그니처의 첫 번째 파라미터에 `db: Database` 추가 (또는 `db: DbOrTx`)
3. 트랜잭션을 시작하는 함수는 `db: Database`, 내부 호출은 `db: DbOrTx`
4. `import type { Database, DbOrTx } from '../connection'` 추가
5. `import { ... } from '@/data-access/types'` → `import { ... } from '@intervuddy/shared'`

**예시 — jobs.ts:**

```typescript
// packages/database/src/data-access/jobs.ts
import { eq, and, isNull, desc, sql, count } from 'drizzle-orm';
import type { Database, DbOrTx } from '../connection';
import { jobDescriptions, interviewQuestions } from '../schema';
import type { JobDescription } from '@intervuddy/shared';

export async function getAllJobs(db: DbOrTx, userId: string): Promise<JobDescription[]> {
  // 기존 쿼리 로직 그대로 유지, db는 파라미터로 받음
  // ...
}

export async function getJobById(db: DbOrTx, userId: string, id: string) {
  // ...
}

export async function createJob(db: DbOrTx, userId: string, input: CreateJobInput) {
  // ...
}

// 트랜잭션을 시작하는 함수
export async function softDeleteJobWithQuestions(db: Database, userId: string, id: string) {
  return db.transaction(async (tx) => {
    // tx를 내부 함수에 전달
    await softDeleteJob(tx, userId, id);
    // ...
  });
}

export async function softDeleteJob(db: DbOrTx, userId: string, id: string) {
  // ...
}
```

**변환 대상 파일 목록:**

- `jobs.ts` — getAllJobs, getJobById, createJob, updateJob, updateJobStatus, softDeleteJob, softDeleteJobWithQuestions, restoreJob, restoreJobWithQuestions, getDeletedJobs
- `categories.ts` — getLibraryCategories, getCategoriesByJdId, getCategoryById, createCategory, updateCategory, deleteCategory
- `questions.ts` — getLibraryQuestions, getQuestionsByJdId, getQuestionById, createQuestion, updateQuestion, deleteQuestion
- `followups.ts` — createFollowupQuestion, updateFollowupQuestion, deleteFollowupQuestion
- `templates.ts` — getTemplateCategories, getTemplateQuestions 등
- `import.ts` — importQuestionsToJob (트랜잭션 사용)
- `cleanup.ts` — permanentlyDeleteExpiredItems (트랜잭션 사용)
- `sessions.ts` — createSession, getSessionById, updateSessionStatus
- `session-invitations.ts` — createInvitation, getInvitationByCode, acceptInvitation, revokeInvitation
- `session-participants.ts` — addParticipant, removeParticipant, getParticipants, getParticipantRole
- `session-records.ts` — recordQuestion, recordAnswer, recordFeedback, getSessionRecords, getSessionQuestionByDisplayOrder

> **핵심**: 쿼리 로직은 변경하지 않는다. 시그니처만 변경. `db` 또는 `getDb()` 호출을 제거하고 파라미터로 받는 것이 전부.

- [ ] **Step 3: data-access/index.ts 확인/수정**

`packages/database/src/data-access/index.ts`가 모든 모듈을 re-export하는지 확인:

```typescript
export * from './jobs';
export * from './categories';
export * from './questions';
export * from './followups';
export * from './templates';
export * from './import';
export * from './cleanup';
export * from './sessions';
export * from './session-invitations';
export * from './session-participants';
export * from './session-records';
```

- [ ] **Step 4: packages/database/src/index.ts 생성 (패키지 public API)**

```typescript
// Schema
export * from './schema';

// Connection
export { createDb, createNeonDb } from './connection';
export type { Database, Transaction, DbOrTx } from './connection';

// Data Access
export * from './data-access';
```

- [ ] **Step 5: 테스트 헬퍼 수정**

`packages/database/src/test-helpers/db.ts`에서 import 경로를 패키지 내부 경로로 수정:

```typescript
import { createDb, type Database } from '../connection';
// 기존 setDb/resetDb 로직을 createDb 기반으로 전환
```

- [ ] **Step 6: packages/database/vitest.config.ts 생성**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-helpers/db.ts'],
  },
  resolve: {
    alias: {
      '@intervuddy/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
```

- [ ] **Step 7: 테스트 파일의 import 수정**

모든 `*.test.ts` 파일에서:

- `import { ... } from '@/db'` → `import { ... } from '../connection'` 또는 `'../../connection'`
- `import { ... } from '@/data-access/...'` → 상대 경로 (같은 패키지 내)
- `import { ... } from '@/data-access/types'` → `import { ... } from '@intervuddy/shared'`
- 테스트 내 함수 호출에 `db` 파라미터 추가

- [ ] **Step 8: 커밋 (data-access 리팩토링)**

```bash
git add -A
git commit -m "refactor: data-access 함수를 db 파라미터 방식으로 전환"
```

### Task 4c: apps/web import 경로 변경 + db 래퍼

**Files:**

- Create: `apps/web/src/db/index.ts` (얇은 래퍼)
- Modify: `apps/web/src/` 전체 — import 경로 변경

- [ ] **Step 1: apps/web/src/db/index.ts 래퍼 생성**

기존 `src/db/index.ts`는 packages/database로 이동됨. 새로운 래퍼 생성:

```typescript
// apps/web/src/db/index.ts
import { createDb, type Database } from '@intervuddy/database';
import { Pool } from 'pg';

let _db: Database | null = null;
let _pool: Pool | null = null;
let _testDb: Database | null = null;

export function getDb(): Database {
  if (_testDb) return _testDb;
  if (!_db) {
    const conn = createDb(process.env.DATABASE_URL!);
    _db = conn.db;
    _pool = conn.pool;
  }
  return _db;
}

export function getPool(): Pool {
  if (!_pool) getDb(); // pool 초기화
  return _pool!;
}

// 테스트용
export function setDb(db: Database) {
  _testDb = db;
}

export function resetDb() {
  _testDb = null;
}

export type { Database };
```

- [ ] **Step 2: apps/web 전체에서 import 경로 일괄 변경**

변환 패턴:

```
# data-access 함수 import
import { getAllJobs } from '@/data-access/jobs'
→ import { getAllJobs } from '@intervuddy/database'

# data-access index
import { getAllJobs, getJobById } from '@/data-access'
→ import { getAllJobs, getJobById } from '@intervuddy/database'

# 스키마 import (Server Action 등에서 직접 사용하는 경우)
import { jobDescriptions } from '@/db/schema'
→ import { jobDescriptions } from '@intervuddy/database'

# db import는 래퍼 유지
import { db } from '@/db'
→ import { getDb } from '@/db'
```

검색 대상:

```bash
grep -r "from '@/data-access" apps/web/src/ --include="*.ts" --include="*.tsx" -l
grep -r "from '@/db/schema" apps/web/src/ --include="*.ts" --include="*.tsx" -l
grep -r "from '@/db'" apps/web/src/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 3: Server Action / Page에서 함수 호출 패턴 변경**

모든 Server Action과 Server Component에서:

```typescript
// Before
import { getAllJobs } from '@/data-access/jobs';
const jobs = await getAllJobs(userId);

// After
import { getDb } from '@/db';
import { getAllJobs } from '@intervuddy/database';
const jobs = await getAllJobs(getDb(), userId);
```

> **주의**: 이것이 가장 많은 파일을 수정하는 단계. 모든 Server Action, page.tsx, layout.tsx에서 data-access 함수를 호출하는 곳을 찾아 `getDb()` 첫 번째 인자를 추가해야 함.

- [ ] **Step 4: pnpm install**

```bash
pnpm install
```

- [ ] **Step 5: 검증 — 전체 빌드 + 테스트 + DB 명령어**

```bash
pnpm build
pnpm test
pnpm db:generate
pnpm db:migrate
```

Expected: 모두 성공

- [ ] **Step 6: 검증 — 개발 서버에서 주요 기능 동작 확인**

```bash
pnpm --filter @intervuddy/web dev
```

확인 사항:

- 로그인 동작
- JD 목록 로드
- Q&A CRUD
- 스터디 모드

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor: apps/web import 경로를 @intervuddy/database로 변경"
```

---

## Task 5: NestJS 서버 생성 (apps/server)

**Files:**

- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/tsconfig.build.json`
- Create: `apps/server/nest-cli.json`
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/app.module.ts`
- Create: `apps/server/src/app.controller.ts`
- Create: `apps/server/src/app.controller.spec.ts`
- Create: `apps/server/src/common/config/env.validation.ts`
- Create: `apps/server/src/common/database/database.module.ts`
- Create: `apps/server/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/server/src/common/strategies/jwt.strategy.ts`
- Create: `apps/server/src/common/filters/global-exception.filter.ts`
- Create: `apps/server/src/common/interceptors/logging.interceptor.ts`
- Create: `apps/server/src/modules/.gitkeep`
- Create: `apps/server/.env.local`

### Task 5a: NestJS 프로젝트 스캐폴딩

- [ ] **Step 1: apps/server/package.json 생성**

```json
{
  "name": "@intervuddy/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "start:debug": "nest start --debug --watch",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    "@nestjs/common": "^11",
    "@nestjs/core": "^11",
    "@nestjs/platform-fastify": "^11",
    "@nestjs/config": "^4",
    "@nestjs/jwt": "^11",
    "@nestjs/passport": "^11",
    "passport": "^0.7",
    "passport-jwt": "^4.0",
    "fastify": "^5",
    "reflect-metadata": "^0.2",
    "rxjs": "^7",
    "pg": "^8.20.0",
    "@intervuddy/database": "workspace:*",
    "@intervuddy/shared": "workspace:*"
  },
  "devDependencies": {
    "@nestjs/cli": "^11",
    "@nestjs/schematics": "^11",
    "@nestjs/testing": "^11",
    "@types/passport-jwt": "^4",
    "typescript": "^5",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: apps/server/tsconfig.json 생성**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: apps/server/tsconfig.build.json 생성**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

- [ ] **Step 4: apps/server/nest-cli.json 생성**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

- [ ] **Step 5: apps/server/.env.local 생성**

```bash
DATABASE_URL=postgresql://intervuddy:intervuddy@localhost:5433/intervuddy
PORT=4000
JWT_SECRET=dev-jwt-secret-change-in-production
WEB_URL=http://localhost:3000
```

> `.env.local`을 `.gitignore`에 추가 확인

- [ ] **Step 6: pnpm install**

```bash
pnpm install
```

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "chore: NestJS 프로젝트 스캐폴딩 (apps/server)"
```

### Task 5b: NestJS 핵심 모듈 구현

- [ ] **Step 1: 환경변수 검증 — env.validation.ts**

```typescript
// apps/server/src/common/config/env.validation.ts
export interface EnvConfig {
  DATABASE_URL: string;
  PORT: number;
  JWT_SECRET: string;
  WEB_URL: string;
}

export function validateEnv(): EnvConfig {
  const config: EnvConfig = {
    DATABASE_URL: process.env.DATABASE_URL!,
    PORT: parseInt(process.env.PORT || '4000', 10),
    JWT_SECRET: process.env.JWT_SECRET!,
    WEB_URL: process.env.WEB_URL || 'http://localhost:3000',
  };

  const missing: string[] = [];
  if (!config.DATABASE_URL) missing.push('DATABASE_URL');
  if (!config.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return config;
}
```

- [ ] **Step 2: DatabaseModule — database.module.ts**

```typescript
// apps/server/src/common/database/database.module.ts
import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { createDb, type Database } from '@intervuddy/database';
import { Pool } from 'pg';

export const DATABASE_TOKEN = 'DATABASE';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_TOKEN,
      useFactory: () => {
        const { db, pool } = createDb(process.env.DATABASE_URL!);
        return { db, pool };
      },
    },
  ],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly dbConn: { db: Database; pool: Pool }
  ) {}

  async onModuleDestroy() {
    await this.dbConn.pool.end();
  }
}
```

- [ ] **Step 3: JWT 전략 — jwt.strategy.ts**

```typescript
// apps/server/src/common/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // userId
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub };
  }
}
```

- [ ] **Step 4: JWT Auth Guard — jwt-auth.guard.ts**

```typescript
// apps/server/src/common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5: Global Exception Filter — global-exception.filter.ts**

```typescript
// apps/server/src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      new Logger('ExceptionFilter').error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception
      );
    }

    response
      .status(status)
      .send(typeof message === 'string' ? { statusCode: status, message } : message);
  }
}
```

- [ ] **Step 6: Logging Interceptor — logging.interceptor.ts**

```typescript
// apps/server/src/common/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { FastifyRequest } from 'fastify';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - now;
        this.logger.log(`${method} ${url} — ${ms}ms`);
      })
    );
  }
}
```

- [ ] **Step 7: App Controller (헬스체크) — app.controller.ts**

```typescript
// apps/server/src/app.controller.ts
import { Controller, Get, Inject, UseGuards, Req, Logger } from '@nestjs/common';
import { DATABASE_TOKEN } from './common/database/database.module';
import type { Database } from '@intervuddy/database';
import { Pool } from 'pg';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { FastifyRequest } from 'fastify';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly dbConn: { db: Database; pool: Pool }
  ) {}

  @Get('health')
  async getHealth() {
    try {
      await this.dbConn.pool.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch (error) {
      this.logger.error('DB health check failed', error);
      return { status: 'degraded', db: 'disconnected' };
    }
  }

  // JWT 보호 테스트 엔드포인트 (서비스 JWT 검증용)
  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: FastifyRequest) {
    return { userId: (req as FastifyRequest & { user: { userId: string } }).user.userId };
  }
}
```

- [ ] **Step 8: App Module — app.module.ts**

```typescript
// apps/server/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: () => validateEnv(),
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [JwtStrategy],
})
export class AppModule {}
```

- [ ] **Step 9: main.ts — Fastify 부트스트랩**

```typescript
// apps/server/src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Server running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 10: modules/.gitkeep 생성**

```bash
touch apps/server/src/modules/.gitkeep
```

- [ ] **Step 10a: apps/server/vitest.config.ts 생성**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  },
});
```

- [ ] **Step 11: 검증 — NestJS 빌드 및 실행**

```bash
pnpm --filter @intervuddy/server build
pnpm --filter @intervuddy/server dev
# → http://localhost:4000/health 접속 → { "status": "ok", "db": "connected" }
```

- [ ] **Step 12: 헬스체크 테스트 작성 — app.controller.spec.ts**

```typescript
// apps/server/src/app.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { DATABASE_TOKEN } from './common/database/database.module';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: DATABASE_TOKEN,
          useValue: {
            db: {},
            pool: { query: vi.fn().mockResolvedValue({}) },
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('health check should return ok', async () => {
    const result = await controller.getHealth();
    expect(result.status).toBe('ok');
  });
});
```

- [ ] **Step 13: 테스트 실행**

```bash
pnpm --filter @intervuddy/server test
```

Expected: PASS

- [ ] **Step 14: 커밋**

```bash
git add -A
git commit -m "feat: NestJS 서버 초기 구현 (헬스체크, JWT 가드, DB 모듈)"
```

---

## Task 6: 서비스 JWT 발급 엔드포인트 (Next.js 측)

**Files:**

- Create: `apps/web/src/lib/service-jwt.ts`
- Create: `apps/web/src/app/api/auth/service-token/route.ts`

- [ ] **Step 1: jsonwebtoken 패키지 추가**

```bash
pnpm --filter @intervuddy/web add jsonwebtoken
pnpm --filter @intervuddy/web add -D @types/jsonwebtoken
```

- [ ] **Step 2: JWT_SECRET 환경변수를 apps/web/.env.local에 추가**

```
JWT_SECRET=dev-jwt-secret-change-in-production
```

> `apps/server/.env.local`과 동일한 값이어야 함

- [ ] **Step 3: 서비스 JWT 유틸 생성 — service-jwt.ts**

```typescript
// apps/web/src/lib/service-jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function createServiceToken(userId: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}
```

- [ ] **Step 4: API Route 생성 — service-token/route.ts**

```typescript
// apps/web/src/app/api/auth/service-token/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServiceToken } from '@/lib/service-jwt';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = createServiceToken(session.user.id);

  return NextResponse.json({ token });
}
```

- [ ] **Step 5: 검증 — E2E 테스트 (수동 또는 curl)**

```bash
# 개발 서버 실행 상태에서
# 1. 브라우저에서 로그인
# 2. 개발자 도구 → 콘솔에서:
# fetch('/api/auth/service-token', { method: 'POST' }).then(r => r.json()).then(console.log)
# → { token: "eyJhbGciOiJIUzI1NiIs..." }

# 3. 발급받은 토큰으로 NestJS 헬스체크 호출:
# curl http://localhost:4000/auth/me -H "Authorization: Bearer <token>"
# → { userId: "..." } 또는 401
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 서비스 JWT 발급 엔드포인트 추가 (Next.js → NestJS 인증)"
```

---

## Task 7: Docker 설정 + docker-compose 업데이트

**Files:**

- Create: `apps/server/Dockerfile`
- Modify: `docker-compose.yml`

- [ ] **Step 1: apps/server/Dockerfile 생성**

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

RUN pnpm install --frozen-lockfile --prod=false
RUN pnpm --filter @intervuddy/server build

# Production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Production stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/packages/shared/ ./packages/shared/
COPY --from=builder /app/packages/database/ ./packages/database/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/server

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { if (r.statusCode !== 200) throw new Error() })"

CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: docker-compose.yml 업데이트**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: intervuddy-postgres
    ports:
      - '5433:5432'
    environment:
      POSTGRES_DB: intervuddy
      POSTGRES_USER: intervuddy
      POSTGRES_PASSWORD: intervuddy
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init-test-db.sh:/docker-entrypoint-initdb.d/init-test-db.sh
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'intervuddy']
      interval: 10s
      timeout: 5s
      retries: 5

  # 선택: 로컬 개발 시에는 pnpm --filter server dev 를 직접 실행하는 것이 더 편리
  # Docker로 실행이 필요할 때만 사용
  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    container_name: intervuddy-server
    ports:
      - '4000:4000'
    environment:
      DATABASE_URL: postgresql://intervuddy:intervuddy@postgres:5432/intervuddy
      JWT_SECRET: dev-jwt-secret-change-in-production
      WEB_URL: http://localhost:3000
      PORT: '4000'
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

- [ ] **Step 3: 루트 .dockerignore 생성 (Docker context가 루트이므로)**

```
# .dockerignore (루트)
**/node_modules
**/.next
**/dist
**/.env.local
**/.env.production
apps/web/
e2e/
test-results/
.git/
.husky/
docs/
```

- [ ] **Step 4: 검증 — Docker 빌드 + 실행**

```bash
docker compose build server
docker compose up -d
curl http://localhost:4000/health
# → { "status": "ok", "db": "connected" }
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: NestJS Dockerfile + docker-compose 업데이트"
```

---

## Task 8: ESLint 설정 업데이트 + CLAUDE.md 업데이트

**Files:**

- Modify: `eslint.config.mjs`
- Modify: `CLAUDE.md`

- [ ] **Step 1: eslint.config.mjs에 apps/server override 추가**

ESLint flat config는 디렉토리를 자동으로 올라가며 탐색하지 않음. Turborepo가 각 앱 디렉토리에서 `eslint .`을 실행하므로, **각 앱/패키지에 eslint.config.mjs를 생성**하거나 루트 config를 import하는 방식이 필요. 가장 간단한 방법: 각 앱 디렉토리에 루트 config를 re-export하는 eslint.config.mjs를 생성.

NestJS 코드에는 React 플러그인이 불필요. 루트 ESLint flat config에서 apps/server 대상으로 React 관련 규칙 비활성화:

```javascript
// eslint.config.mjs에 추가
// apps/server 전용 설정 (React 플러그인 제외)
{
  files: ['apps/server/**/*.ts'],
  rules: {
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
},
```

- [ ] **Step 2: CLAUDE.md 업데이트**

모노레포 구조를 반영하여 CLAUDE.md의 디렉토리 구조, 명령어, 컨벤션 섹션 업데이트:

주요 변경:

- 디렉토리 구조 → 모노레포 구조로 갱신
- 명령어 → turbo 기반으로 갱신
- import 경로 → `@intervuddy/database`, `@intervuddy/shared` 추가
- data-access 함수 → db 파라미터 방식 설명 추가
- NestJS 서버 설명 추가

- [ ] **Step 3: 전체 lint 검증**

```bash
pnpm lint
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: ESLint 모노레포 설정 + CLAUDE.md 업데이트"
```

---

## Task 9: 최종 검증

- [ ] **Step 1: 전체 빌드**

```bash
pnpm build
```

Expected: apps/web + apps/server 모두 빌드 성공

- [ ] **Step 2: 전체 테스트**

```bash
pnpm test
```

Expected: packages/database + apps/web + apps/server 테스트 모두 통과

- [ ] **Step 3: 동시 개발 서버 기동**

```bash
pnpm dev
# → turbo가 apps/web (port 3000) + apps/server (port 4000) 동시 실행
```

확인:

- http://localhost:3000 → Next.js 정상
- http://localhost:4000/health → `{ "status": "ok", "db": "connected" }`

- [ ] **Step 4: DB 명령어 확인**

```bash
pnpm db:generate  # → no changes (변경 없으므로)
pnpm db:migrate   # → already up to date
```

- [ ] **Step 5: Docker 통합 확인**

```bash
docker compose up -d
curl http://localhost:4000/health
docker compose down
```

- [ ] **Step 6: 서비스 JWT 플로우 E2E 확인**

1. `pnpm dev` 실행
2. 브라우저에서 로그인
3. `/api/auth/service-token` 호출 → 토큰 발급 확인
4. 토큰으로 `http://localhost:4000/auth/me` 호출 → 유저 정보 반환 확인

- [ ] **Step 7: 최종 커밋 (필요 시)**

```bash
git add -A
git commit -m "chore: 모노레포 전환 최종 검증 완료"
```

---

## Summary

| Task      | 내용                    | 예상 커밋 수 |
| --------- | ----------------------- | ------------ |
| Task 1    | 모노레포 골격           | 1            |
| Task 2    | Next.js → apps/web 이동 | 1            |
| Task 3    | packages/shared 추출    | 1            |
| Task 4a   | DB 파일 이동            | 1            |
| Task 4b   | data-access 리팩토링    | 1            |
| Task 4c   | apps/web import 변경    | 1            |
| Task 5a   | NestJS 스캐폴딩         | 1            |
| Task 5b   | NestJS 모듈 구현        | 1            |
| Task 6    | 서비스 JWT              | 1            |
| Task 7    | Docker 설정             | 1            |
| Task 8    | ESLint + CLAUDE.md      | 1            |
| Task 9    | 최종 검증               | 0-1          |
| **Total** |                         | **~11 커밋** |
