# Monorepo + NestJS Backend Setup Design

> **Status**: Draft
> **Date**: 2026-03-23
> **Scope**: 모노레포 구조 전환 + NestJS 백엔드 초기 셋업
> **Prerequisite**: 없음 (첫 번째 인프라 스펙)
> **Next**: 스펙 2 (JD 스크래핑 + AI 질문 생성), 스펙 3 (WebSocket 이전), 스펙 4 (AWS 인프라)

---

## 1. 배경 및 동기

### 현재 상태

- Next.js 16 App Router 단일 앱으로 운영
- PartyKit WebSocket으로 실시간 모의면접 구현 (이슈 있음)
- 서버리스 환경(Vercel)에서 장시간 실행 작업 제약

### 왜 모노레포 + 백엔드가 필요한가

향후 기능들이 서버리스 환경의 한계를 넘어섬:

| 기능                      | 제약                                    |
| ------------------------- | --------------------------------------- |
| JD URL 스크래핑           | 외부 HTTP 요청 + AI 파싱, 장시간 실행   |
| AI 질문 생성              | Anthropic API 스트리밍, 백그라운드 처리 |
| WebSocket (PartyKit 대체) | 상시 연결, 서버 상태 관리               |
| Phase 2 WebRTC 시그널링   | 상시 서버 필요                          |

단일 Next.js에 모두 넣으면 나중에 분리 비용이 크므로, 지금 구조를 잡는다.

---

## 2. 디렉토리 구조

```
intervuddy/
├── apps/
│   ├── web/                        ← 기존 Next.js (이동)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── stores/
│   │   │   ├── lib/
│   │   │   └── test/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── server/                     ← NestJS (신규)
│       ├── src/
│       │   ├── main.ts             ← Fastify adapter
│       │   ├── app.module.ts
│       │   ├── app.controller.ts   ← 헬스체크
│       │   ├── common/
│       │   │   ├── config/         ← ConfigModule (환경변수 검증)
│       │   │   ├── guards/         ← JwtAuthGuard
│       │   │   ├── filters/        ← GlobalExceptionFilter
│       │   │   └── interceptors/   ← LoggingInterceptor
│       │   └── modules/
│       │       └── .gitkeep        ← 기능 모듈은 스펙 2+에서 추가
│       ├── test/
│       ├── Dockerfile
│       ├── nest-cli.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── database/                   ← Drizzle 스키마 + data-access 추출
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── connection.ts       ← createDb(connectionString) 팩토리
│   │   │   ├── migrate.ts
│   │   │   ├── data-access/
│   │   │   │   ├── jobs.ts
│   │   │   │   ├── categories.ts
│   │   │   │   ├── questions.ts
│   │   │   │   ├── followups.ts
│   │   │   │   ├── templates.ts
│   │   │   │   ├── import.ts
│   │   │   │   ├── cleanup.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── session-invitations.ts
│   │   │   │   ├── session-participants.ts
│   │   │   │   ├── session-records.ts
│   │   │   │   └── types.ts        ← @intervuddy/shared로 이동하는 타입 re-export
│   │   │   └── index.ts            ← public exports
│   │   ├── drizzle/                ← 마이그레이션 파일
│   │   ├── drizzle.config.ts
│   │   └── package.json            ← @intervuddy/database
│   │
│   └── shared/                     ← 공통 타입, 상수
│       ├── src/
│       │   ├── types.ts            ← JobDescription, InterviewQuestion 등
│       │   ├── constants.ts        ← SYSTEM_USER_ID, DEFAULT_USER_ID
│       │   └── index.ts
│       └── package.json            ← @intervuddy/shared
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── package.json                    ← 루트 (turbo, 공통 devDeps)
└── CLAUDE.md                       ← 업데이트 필요
```

---

## 3. 패키지 의존성 및 빌드

### 의존성 그래프

```
apps/web ──────→ @intervuddy/database
    │                    │
    └──→ @intervuddy/shared ←──┘
              ↑
apps/server ──┘
    │
    └──→ @intervuddy/database
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json

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
    "lint": {}
  }
}
```

### 빌드 순서

```
packages/shared → packages/database → apps/web + apps/server (병렬)
```

### 패키지 빌드 방식

- `packages/shared`, `packages/database`: **internal packages** (빌드 없이 TypeScript 소스 직접 참조)
- 각 패키지의 `package.json`에 `"main": "./src/index.ts"`, `"types": "./src/index.ts"` 설정
- 소비하는 앱(web, server)이 각자 번들링 시 트랜스파일

### 루트 스크립트

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write .",
    "db:generate": "pnpm --filter @intervuddy/database db:generate",
    "db:migrate": "pnpm --filter @intervuddy/database db:migrate",
    "db:studio": "pnpm --filter @intervuddy/database db:studio"
  }
}
```

### 환경변수 관리

- `DATABASE_URL`: 각 앱의 `.env.local`에서 주입 (루트 `.env` 없음)
- `apps/web/.env.local`: AUTH_SECRET, DATABASE_URL, AUTH_GOOGLE_ID 등
- `apps/server/.env.local`: DATABASE_URL, PORT, JWT_SECRET 등

---

## 4. NestJS 서버 설계

### HTTP 어댑터: Fastify

- `@nestjs/platform-fastify` 사용
- Express 대비 2-3배 성능
- NestJS의 구조(모듈/DI) + Fastify의 성능

### 초기 스코프

이번 스펙에서 NestJS에 포함하는 것:

| 구성요소              | 설명                                           |
| --------------------- | ---------------------------------------------- |
| `GET /health`         | 헬스체크 (ECS 연동)                            |
| ConfigModule          | 환경변수 검증 (DATABASE_URL, PORT, JWT_SECRET) |
| JwtAuthGuard          | 서비스 JWT 검증 (아래 섹션 5 참조)             |
| GlobalExceptionFilter | 통합 에러 핸들링                               |
| LoggingInterceptor    | 요청/응답 로깅                                 |

기능 모듈(JD 스크래핑, AI 등)은 **스펙 2에서 추가**.

### main.ts 구조

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 4000, '0.0.0.0');
}
bootstrap();
```

### 모듈 구조 (향후 확장 포함)

```
modules/
  health/          ← 이번 스펙
  auth/            ← 이번 스펙 (JWT 검증만)
  scraping/        ← 스펙 2
  ai/              ← 스펙 2
  interview/       ← 스펙 3 (WebSocket gateway)
```

---

## 5. 인증: 서비스 JWT 전략

### 문제

Auth.js v5의 JWT는 JWE 암호화(A256CBC-HS512)를 사용하며, 내부 구조가 버전 간 변경될 수 있음. NestJS에서 직접 디코딩하면 Auth.js 업데이트 시 깨질 위험.

### 해결: 전용 서비스 JWT 발급

```
[사용자 브라우저]
  → Next.js (Auth.js 세션 확인)
    → POST /api/auth/service-token 호출
      → 표준 JWT 발급 (jsonwebtoken, HS256)
        → 브라우저가 NestJS에 이 토큰으로 요청
          → NestJS JwtAuthGuard가 표준 JWT 검증
```

### Next.js 측 (서비스 JWT 발급)

- `apps/web/src/app/api/auth/service-token/route.ts`
- Auth.js 세션 확인 → userId 추출 → 표준 JWT 생성
- `JWT_SECRET` (AUTH_SECRET과 별도) 사용
- 토큰 만료: 1시간 (짧은 TTL)
- payload: `{ sub: userId, iat, exp }`

### NestJS 측 (서비스 JWT 검증)

- `@nestjs/jwt` + `@nestjs/passport` 사용
- `JwtAuthGuard`가 Authorization header에서 Bearer 토큰 추출
- 동일한 `JWT_SECRET`으로 검증
- Auth.js 내부와 완전 분리

### 토큰 관리 전략

- **저장**: 브라우저 메모리 (Zustand 또는 React state). localStorage/cookie 사용 안 함
- **갱신**: 만료 5분 전에 자동 갱신 요청 (silent refresh)
- **실패 시**: NestJS 401 응답 → 토큰 재발급 시도 → 실패 시 로그인 리다이렉트
- **상세 구현은 스펙 2에서** (실제 NestJS 엔드포인트가 생길 때)

### 장점

- Auth.js 버전 업데이트에 영향 없음
- 표준 JWT이므로 디버깅 용이 (jwt.io에서 확인 가능)
- 향후 서비스 간 통신에도 동일 패턴 적용 가능

---

## 6. packages/database 추출 설계

### data-access 함수 리팩토링

**현재** (글로벌 싱글턴):

```typescript
// src/data-access/jobs.ts
import { db } from '@/db';

export async function getAllJobs(userId: string) {
  return db.select()...
}
```

**변경 후** (db 파라미터):

```typescript
// packages/database/src/data-access/jobs.ts
import type { Database } from '../connection';

export async function getAllJobs(db: Database, userId: string) {
  return db.select()...
}
```

### 트랜잭션 패턴

data-access 함수 중 트랜잭션을 사용하는 함수(`softDeleteJobWithQuestions`, `importQuestionsToJob` 등)의 처리 방식:

```typescript
// Database 또는 Transaction 모두 수용
import type { Database, Transaction } from '../connection';

type DbOrTx = Database | Transaction;

// 내부적으로 트랜잭션을 생성하는 함수
export async function softDeleteJobWithQuestions(db: Database, userId: string, id: string) {
  return db.transaction(async (tx) => {
    await softDeleteJob(tx, userId, id);
    await softDeleteQuestionsByJdId(tx, userId, id);
  });
}

// 트랜잭션 안에서도 호출 가능한 함수
export async function softDeleteJob(db: DbOrTx, userId: string, id: string) {
  return db.update(jobDescriptions)...
}
```

- `Database`: 최상위 연결 (트랜잭션 생성 가능)
- `Transaction`: `db.transaction()` 콜백의 `tx` 파라미터
- `DbOrTx`: 두 타입 모두 수용 (조합 가능한 함수용)
- 트랜잭션을 시작하는 함수는 `Database`만 받고, 내부 호출은 `DbOrTx`를 받음

### 연결 관리: 팩토리 패턴 + 듀얼 드라이버

현재 프로덕션(Vercel)은 `@neondatabase/serverless` 드라이버를, 로컬/NestJS는 `pg.Pool`을 사용. 두 환경 모두 지원:

```typescript
// packages/database/src/connection.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// 표준 pg Pool (NestJS, 로컬 개발, Docker)
export function createDb(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

// Neon serverless (Vercel Edge/Serverless)
export function createNeonDb(connectionString: string): Database {
  const sql = neon(connectionString);
  return drizzleNeon(sql, { schema });
}
```

- `apps/web` (Vercel): `createNeonDb` 사용
- `apps/server` (NestJS/Docker): `createDb` 사용 (pool 접근 가능 → graceful shutdown)
- 로컬 개발: `createDb` 사용

### apps/web에서 사용

```typescript
// apps/web/src/db/index.ts (얇은 래퍼)
import { createNeonDb, type Database } from '@intervuddy/database';

let db: Database;

export function getDb(): Database {
  if (!db) {
    db = createNeonDb(process.env.DATABASE_URL!);
  }
  return db;
}
```

Server Action에서:

```typescript
import { getDb } from '@/db';
import { getAllJobs } from '@intervuddy/database';

const jobs = await getAllJobs(getDb(), userId);
```

### apps/server에서 사용 (NestJS DI)

```typescript
// apps/server/src/common/database/database.module.ts
import { createDb, type Database } from '@intervuddy/database';
import { Pool } from 'pg';

@Module({
  providers: [
    {
      provide: 'DATABASE',
      useFactory: () => {
        const { db, pool } = createDb(process.env.DATABASE_URL!);
        return { db, pool };
      },
    },
  ],
  exports: ['DATABASE'],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject('DATABASE') private readonly dbConn: { db: Database; pool: Pool }) {}

  async onModuleDestroy() {
    await this.dbConn.pool.end(); // graceful shutdown 시 커넥션 풀 정리
  }
}
```

### 마이그레이션 파일 위치

- `packages/database/drizzle/` 아래에 통합
- `packages/database/drizzle.config.ts`에서 경로 설정
- 루트에서 `pnpm db:generate`, `pnpm db:migrate` 실행

### 테스트 전략

**테스트 파일 이동:**

- `src/data-access/*.test.ts` → `packages/database/src/data-access/*.test.ts` (DB 테스트)
- `src/test/helpers/db.ts` → `packages/database/src/test-helpers/db.ts` (테스트 헬퍼)
- `apps/web`의 컴포넌트/페이지 테스트는 그대로 유지

**테스트 격리:**

- `packages/database` 자체 테스트: `createDb(TEST_DATABASE_URL)` 사용
- `apps/web` 테스트: `getDb` 래퍼를 모킹하거나, 테스트 DB 직접 사용
- NestJS 테스트: `DatabaseModule`을 테스트 모듈로 오버라이드
- Docker PostgreSQL의 `intervuddy_test` DB 계속 사용 (init-test-db.sh 유지)

### 패키지 의존성 표기

각 앱의 `package.json`에서 workspace 패키지 참조:

```json
{
  "dependencies": {
    "@intervuddy/database": "workspace:*",
    "@intervuddy/shared": "workspace:*"
  }
}
```

---

## 7. 마이그레이션 전략 (점진적)

### Step 1: 모노레포 골격

```
- pnpm-workspace.yaml 생성
- turbo.json 생성
- tsconfig.base.json 생성
- 루트 package.json 생성
- apps/, packages/ 디렉토리 생성
```

**검증**: `pnpm install` 성공

### Step 2: Next.js → apps/web/ 이동

```bash
git mv src/ apps/web/src/
git mv public/ apps/web/public/
git mv next.config.ts apps/web/
git mv tailwind.config.ts apps/web/
git mv postcss.config.mjs apps/web/
git mv components.json apps/web/
git mv tsconfig.json apps/web/          # @/ 경로 유지하되 extends 수정
git mv vitest.config.ts apps/web/
git mv playwright.config.ts apps/web/
# .env.local → apps/web/.env.local (git mv 불필요, gitignored)
```

- 기존 루트 `package.json`의 의존성을 `apps/web/package.json`으로 분리
  - 루트에는 turbo, prettier 등 공통 devDeps만 남김
- `apps/web/tsconfig.json`: `"extends": "../../tsconfig.base.json"` + `@/` 경로 유지
- ESLint 설정: 루트에 유지하되, `apps/server`용 override 추가 (React 플러그인 제외)
- Prettier 설정: 루트에 유지 (공유)

**검증**: `pnpm --filter web dev` + `pnpm --filter web build` 성공
**롤백**: `git reset --hard HEAD~1` (이전 커밋으로 복원)

### Step 3: packages/shared 추출

```bash
# 타입, 상수 이동
git mv apps/web/src/data-access/types.ts packages/shared/src/types.ts
git mv apps/web/src/db/constants.ts packages/shared/src/constants.ts
```

- `@intervuddy/shared` 패키지 생성
- `packages/shared/package.json`: `"name": "@intervuddy/shared"`, `"main": "./src/index.ts"`
- `apps/web`에서 import 경로 변경:
  - `@/data-access/types` → `@intervuddy/shared`
  - `@/db/constants` → `@intervuddy/shared`
- `packages/database`도 `@intervuddy/shared`에 의존 (상수 import)

**검증**: `pnpm build` 성공, 타입 체크 통과
**롤백**: `git reset --hard HEAD~1`

### Step 4: packages/database 추출

```bash
git mv apps/web/src/db/schema.ts packages/database/src/schema.ts
git mv apps/web/src/db/connection.ts packages/database/src/connection.ts
git mv apps/web/src/db/migrate.ts packages/database/src/migrate.ts
git mv apps/web/src/data-access/ packages/database/src/data-access/
git mv drizzle/ packages/database/drizzle/
git mv drizzle.config.ts packages/database/drizzle.config.ts
```

- data-access 함수를 db 파라미터 방식으로 리팩토링
- `apps/web`에 얇은 db 래퍼 생성
- **모든 import 경로 변경** (`@/db`, `@/data-access` → `@intervuddy/database`)

**검증**: `pnpm build` + `pnpm test` + `pnpm db:generate` + `pnpm db:migrate` 모두 성공
**롤백**: `git reset --hard HEAD~1` (import 변경이 대규모이므로 단일 커밋으로 관리)

### Step 5: apps/server NestJS 생성

```bash
# NestJS 프로젝트 생성 (또는 수동 스캐폴딩)
# apps/server/ 아래에 배치
# @intervuddy/database, @intervuddy/shared 의존성 추가
```

- 헬스체크, ConfigModule, JWT 가드 구현
- `DatabaseModule` (Drizzle DI)

**주요 NestJS 의존성:**

- `@nestjs/core`, `@nestjs/common` (v11)
- `@nestjs/platform-fastify`
- `@nestjs/config` (환경변수)
- `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` (인증)
- `@nestjs/event-emitter` (모듈 간 이벤트)

**검증**: `pnpm --filter server dev` + `pnpm --filter server build` + 헬스체크 응답 확인
**롤백**: `rm -rf apps/server` + `pnpm install`

### Step 6: 서비스 JWT 발급 엔드포인트

- `apps/web/src/app/api/auth/service-token/route.ts` 생성
- Auth.js 세션 → 표준 JWT 발급
- NestJS JwtAuthGuard에서 검증 확인

**검증**: Next.js에서 토큰 발급 → NestJS 보호 엔드포인트 호출 성공

### Step 7: Docker + docker-compose

```yaml
# docker-compose.yml (개발용)
services:
  postgres:
    image: postgres:17-alpine
    ports: ['5433:5432']
    environment:
      POSTGRES_DB: intervuddy
      POSTGRES_USER: intervuddy
      POSTGRES_PASSWORD: intervuddy
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init-test-db.sh:/docker-entrypoint-initdb.d/init-test-db.sh
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'intervuddy']

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports: ['4000:4000']
    environment:
      DATABASE_URL: postgresql://intervuddy:intervuddy@postgres:5432/intervuddy
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

- `apps/server/Dockerfile` (멀티스테이지)

**검증**: `docker compose up` → 헬스체크 응답 확인

---

## 8. Dockerfile (apps/server)

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

> **Note**: `pnpm install --prod`를 빌드 후 다시 실행하여 devDependencies를 제거한 node_modules만 프로덕션 이미지에 복사.

---

## 9. 향후 스펙 로드맵

| 스펙                 | 내용                                      | 의존   |
| -------------------- | ----------------------------------------- | ------ |
| **스펙 1** (이 문서) | 모노레포 + NestJS 셋업                    | 없음   |
| **스펙 2**           | JD 스크래핑 + AI 질문 생성                | 스펙 1 |
| **스펙 3**           | WebSocket PartyKit → NestJS 이전          | 스펙 1 |
| **스펙 4**           | AWS 인프라 (ECR, ECS Fargate, ALB, CI/CD) | 스펙 1 |

### 스펙 2 선행 설계 (참고용)

JD 기능을 위해 이미 합의된 사항:

- **DB**: `jd_sources` (공유, URL 기준 1건) + `ai_question_jobs` (AI 생성 추적) + 기존 테이블 확장
- **스크래핑**: fetch + AI 파싱 (1순위), 텍스트 붙여넣기 (2순위)
- **AI**: Anthropic SDK + 추상화 레이어 (provider 교체 가능)
- **비용**: AI 토큰 과금만 (월 수 달러 수준)

---

## 10. 위험 요소 및 대응

| 위험                                      | 심각도 | 대응                                                                      |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `@/` import 경로 대량 변경                | HIGH   | Step 4에서 별도 커밋, 로직 변경 없이 경로만 변경                          |
| Drizzle Kit 경로 깨짐 (pnpm 심링크)       | MEDIUM | Step 4 직후 db:generate, db:migrate 즉시 테스트                           |
| Turborepo + pnpm workspace 설정           | MEDIUM | Step 1-2에서 빌드 검증 철저히                                             |
| Vercel 모노레포 배포 설정                 | MEDIUM | Root Directory를 `apps/web`으로 설정, "Include files from outside" 활성화 |
| data-access 리팩토링 (db 파라미터화) 범위 | MEDIUM | 기계적 변환, 함수 시그니처만 변경                                         |
| NestJS Fastify adapter + WebSocket 호환   | LOW    | 이번 스펙에서는 WebSocket 미포함, 스펙 3에서 검증                         |

---

## 11. 성공 기준

- [ ] `pnpm install` (루트에서) 성공
- [ ] `pnpm build` (turbo, 전체 앱/패키지) 성공
- [ ] `pnpm test` (기존 테스트 전부) 통과
- [ ] `pnpm dev` (Next.js :3000 + NestJS :4000 동시 기동)
- [ ] `pnpm db:generate` + `pnpm db:migrate` 정상 동작
- [ ] NestJS `GET /health` 응답 200
- [ ] 서비스 JWT 발급 → NestJS 보호 엔드포인트 호출 성공
- [ ] `docker compose up` → postgres + server 정상 기동
- [ ] Vercel 배포 (apps/web) 정상 동작
- [ ] 기존 기능(Q&A CRUD, 세션 등) 회귀 없음
