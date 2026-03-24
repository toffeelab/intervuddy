# CLAUDE.md — Intervuddy 프로젝트 가이드

## 프로젝트 개요

면접 예상 Q&A 관리 웹앱. 모노레포 (pnpm workspace + Turborepo) 구조.

## 기술 스택

- **프론트엔드**: Next.js 16.1.7 (App Router, RSC), React 19, TypeScript 5
- **백엔드**: NestJS 11 + Fastify (REST API)
- **실시간**: PartyKit (WebSocket)
- Tailwind CSS v4, shadcn/ui (base-nova 스타일, lucide 아이콘)
- PostgreSQL (Drizzle ORM, Neon 프로덕션 / Docker 로컬), Zustand (UI 상태)
- Auth.js v5 (Google/GitHub OAuth + 매직 링크), JWT 세션 전략
- 서비스 JWT: Next.js → NestJS 인증 (`JWT_SECRET` 환경변수)
- pnpm (패키지 매니저 — npm/yarn 사용 금지), Turborepo (빌드 오케스트레이션)
- ESLint 9 (flat config) + Prettier (코드 품질/포매팅)

## 디렉토리 구조

```
apps/
├── web/              # Next.js 프론트엔드
│   └── src/
│       ├── app/              # 페이지 및 레이아웃 (App Router)
│       ├── components/       # UI 컴포넌트
│       ├── db/               # DB 연결 (getDb)
│       ├── stores/           # Zustand 상태 관리
│       └── lib/              # 유틸리티, 상수
├── server/           # NestJS 백엔드 (Fastify)
│   └── src/
│       ├── auth/             # JWT 인증 가드
│       ├── health/           # 헬스체크 엔드포인트
│       └── database/         # DB 모듈 (DI)
└── partykit/         # PartyKit WebSocket
packages/
├── database/         # Drizzle 스키마, data-access, 마이그레이션
│   └── src/
│       ├── schema.ts         # Drizzle pgTable 정의
│       └── data-access/      # DB 접근 추상화 레이어
└── shared/           # 공통 타입, 상수
```

## 명령어

### Turbo (루트)

```bash
pnpm dev              # turbo로 web + server 동시 실행
pnpm build            # turbo로 전체 빌드
pnpm lint             # ESLint 검사
pnpm lint:fix         # ESLint 자동 수정
pnpm format           # Prettier 포매팅
pnpm format:check     # Prettier 포매팅 검사
```

### 개별 앱/패키지

```bash
pnpm --filter @intervuddy/web dev       # Next.js만 (localhost:3000)
pnpm --filter @intervuddy/server dev    # NestJS만 (localhost:4000)
pnpm --filter @intervuddy/web build     # Next.js 빌드
pnpm --filter @intervuddy/server build  # NestJS 빌드
pnpm --filter @intervuddy/web test      # 프론트엔드 테스트
```

### DB

```bash
pnpm db:generate      # Drizzle 스키마 → 마이그레이션 SQL 생성
pnpm db:migrate       # PostgreSQL 마이그레이션 실행
pnpm db:studio        # Drizzle Studio (DB GUI)
pnpm db:seed:sample   # 샘플 데이터 시드
pnpm db:seed          # 개인 데이터 시드 (data/seed.ts 필요)
```

### 로컬 개발 시작

```bash
docker compose up -d   # PostgreSQL 컨테이너 기동
pnpm db:migrate        # 마이그레이션 실행 (최초 1회 또는 스키마 변경 시)
pnpm db:seed:sample    # 샘플 데이터 시드 (선택)
pnpm dev               # web + server 동시 실행
```

## 코드 컨벤션

### Server / Client 분리

- **Server Component (기본)**: 데이터 fetching, 정적 UI
- **Client Component ('use client')**: 사용자 인터랙션, 상태 의존 UI
- 불필요한 'use client' 지정 금지 — 필요한 컴포넌트에만 사용

### 상태 관리

- **Zustand**: UI 상태만 (카테고리 선택, 검색, 카드 확장)
- **Server Props**: DB 데이터는 Server Component에서 fetch → props 전달
- 전역 상태 남용 금지 — props로 충분하면 props 사용

### 인증 (Auth.js v5)

- `src/auth.ts`: Node.js 전용 — `{ auth, signIn, signOut, handlers }` export
- `src/auth.config.ts`: Edge-safe 설정 (Middleware에서 사용)
- `src/lib/auth.ts`: `getCurrentUserId()` (미인증 시 /login 리다이렉트), `getOptionalUserId()`
- 모든 Server Action에서 `getCurrentUserId()` 호출로 userId 획득 — 직접 세션 접근 금지
- JWT 세션 전략 사용 (DB 세션 없음)
- 필수 환경변수: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`, `JWT_SECRET`
- `JWT_SECRET`: 서비스 JWT 발급/검증 (Next.js ↔ NestJS 간 인증). 양쪽 `.env.local`에 동일 값 설정
- `SYSTEM_USER_ID = 'system'`: 시스템 템플릿 데이터용
- `DEFAULT_USER_ID = 'local-user'`: 로컬 개발 / 테스트용 (실제 OAuth 사용자 ID 아님)

### 데이터베이스

- **Drizzle ORM** + PostgreSQL (비동기 API)
- 프로덕션: Neon PostgreSQL, 로컬: Docker PostgreSQL 17
- 스키마 정의: `packages/database/src/schema.ts` (Drizzle pgTable)
- 마이그레이션: `packages/database/drizzle/migrations/` (Drizzle Kit 생성 + 커스텀 SQL)
- data-access 레이어를 통해 접근 (`@intervuddy/database`에서 import)
- 모든 data-access 함수는 `async` — 호출 시 `await` 필수
- 환경변수: `DATABASE_URL` (.env.local에 설정)
- **시드 업데이트**: DB 스키마 변경 시 `data/seed.sample.ts`와 `src/test/helpers/db.ts`도 동기화 필수
- **테스트**: Docker PG의 `intervuddy_test` DB 사용, TRUNCATE CASCADE로 격리
- **프로덕션 DB**: Neon 연결 문자열은 `.env.production`의 `DATABASE_URL` 사용. Neon 마이그레이션: `npx tsx --env-file=.env.production src/db/migrate.ts`

### Import 경로

- apps/web 내부: 절대 경로 `@/components/...`, `@/lib/...`, `@/stores/...`
- 공유 패키지: `@intervuddy/database` (DB 함수/스키마), `@intervuddy/shared` (타입/상수)
- apps/web에서 DB 접근: `getDb()` from `@/db`
- NestJS에서 DB 접근: `@Inject(DATABASE_TOKEN)` DI

### data-access 패턴

- data-access 함수는 `db` 파라미터를 첫 번째 인자로 받음 (DI 호환)
- NestJS에서는 `DatabaseModule`이 Drizzle 인스턴스를 주입

### 린팅 & 포매팅

- ESLint + Prettier + husky + lint-staged로 pre-commit 자동 검사
- import 순서: builtin → external (react, next) → internal (@/) → relative
- 테스트 파일에서 vi.mock 사용 시 `vi.hoisted()` 패턴 사용 (import 순서 유지)

### 타입

- `any` 사용 금지 — 구체적 타입 또는 `unknown` 사용
- 인터페이스는 해당 파일 내 정의, 공유 타입은 data-access/types.ts

## 개발 워크플로우 (필수 준수)

### Git Flow

```
main (프로덕션) ← develop (통합) ← feature/<날짜>/<이름> (기능 개발)
```

1. `develop`에서 `feature/<YYYY-MM-DD>/<이름>` 브랜치 생성
2. conventional commits 사용 (feat:, fix:, refactor:, chore:)
3. PR은 반드시 `develop` 대상으로 생성
4. Claude 자동 리뷰 통과 후 squash merge
5. workflow 파일 수정 시 → [workflow 수정 가이드](docs/agent_docs/workflow-modification-guide.md) 참조

### Worktree 기반 작업 (필수)

여러 세션이 병렬로 작업하므로, **메인 디렉토리는 항상 develop의 클린 상태를 유지**한다.

| 작업 단계                 | 위치                          | 이유                           |
| ------------------------- | ----------------------------- | ------------------------------ |
| brainstorming / 스펙 작성 | **메인 디렉토리** (develop)   | 다른 세션에서 참조 가능해야 함 |
| 플랜 작성                 | **메인 디렉토리** (develop)   | 구현 세션이 플랜을 읽어야 함   |
| 코드 구현                 | **worktree** (feature 브랜치) | 병렬 격리 필수                 |

**Worktree 규칙:**

- 코드 구현 시작 전에 반드시 worktree 생성 (`using-git-worktrees` 스킬 사용)
- worktree에서 `node_modules` 심링크 필요: `ln -s <메인>/node_modules ./node_modules`
- worktree에서 `pnpm dev`가 필요하면 `pnpm dev --port 300X` (빈 포트 사용, `lsof -i :3000`으로 확인)
- PR push 완료 후 즉시 worktree 정리: `git worktree remove <path>`

### 작업 순서

1. **요구사항 분석** → `brainstorming` 스킬 (메인 디렉토리)
2. **계획 수립** → `writing-plans` (메인 디렉토리)
3. **worktree 생성** → `using-git-worktrees` 스킬
4. **TDD 개발** → `test-driven-development` (worktree에서)
5. **검증** → `verification-before-completion` → [검증 체크리스트](docs/agent_docs/verification-checklist.md) 참조
6. **코드 리뷰** → `requesting-code-review`
7. **완료** → `finishing-a-development-branch`로 PR 생성 (`--base develop`)

### 검증 방법

- **기능 검증**: Playwright E2E 테스트 작성 + `pnpm test` 통과 필수
- **빌드 검증**: `pnpm build` 성공 필수
- **시각적 확인**: 필요 시 MCP (Playwright/Chrome DevTools)로 스크린샷 확인

### Superpowers 스킬

**프로세스 스킬:**
brainstorming, writing-plans, test-driven-development, verification-before-completion, requesting-code-review, finishing-a-development-branch

**도메인 에이전트:**
frontend-design (UI 디자인/컴포넌트 설계 시), frontend-developer (프론트엔드 구현 시), simplify

## 참조 문서

| 문서                 | 경로                                             | 언제 참조                                          |
| -------------------- | ------------------------------------------------ | -------------------------------------------------- |
| 프론트엔드 컨벤션    | `docs/agent_docs/frontend-conventions.md`        | UI 컴포넌트 구현, 스타일링, 반응형 작업 시         |
| 검증 체크리스트      | `docs/agent_docs/verification-checklist.md`      | 구현 완료 → PR 전 (E2E, 스크린샷 캡션 포함)        |
| 병렬 작업 가이드     | `docs/agent_docs/parallel-worktree-guide.md`     | 독립 태스크 2+ 병렬 처리 시                        |
| Serena MCP 가이드    | `docs/agent_docs/serena-mcp-guide.md`            | 코드베이스 심볼릭 탐색/편집 시                     |
| Workflow 수정 가이드 | `docs/agent_docs/workflow-modification-guide.md` | .github/workflows/ 수정 시                         |
| 샘플 시드 데이터     | `data/seed.sample.ts`                            | E2E 검증용 (스키마 변경 시 동기화 필수)            |
| 테스트 헬퍼          | `src/test/helpers/db.ts`                         | 테스트용 DB seed 함수 (스키마 변경 시 동기화 필수) |

## 금지 사항

- main, develop 브랜치에 직접 코드 커밋/push 금지 (docs/ 커밋은 예외)
- 메인 디렉토리에서 코드 구현 금지 — 반드시 worktree에서 작업
- data/seed.ts (개인 데이터) 커밋 금지 — .gitignore 확인
- \*.db 파일 커밋 금지
- .env.local 커밋 금지 (DATABASE_URL 등 민감 정보 포함)
- console.log 남기고 커밋 금지
- npm/yarn 사용 금지 — pnpm만 사용
