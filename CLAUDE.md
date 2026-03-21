# CLAUDE.md — Intervuddy 프로젝트 가이드

## 프로젝트 개요

면접 예상 Q&A 관리 웹앱. Next.js 16 App Router + TypeScript + PostgreSQL.

## 기술 스택

- Next.js 16.1.7 (App Router, RSC), React 19, TypeScript 5
- Tailwind CSS v4, shadcn/ui (base-nova 스타일, lucide 아이콘)
- PostgreSQL (Drizzle ORM, Neon 프로덕션 / Docker 로컬), Zustand (UI 상태)
- Auth.js v5 (Google/GitHub OAuth + 매직 링크), JWT 세션 전략
- pnpm (패키지 매니저 — npm/yarn 사용 금지)
- ESLint 9 (flat config) + Prettier (코드 품질/포매팅)

## 디렉토리 구조

```
src/
├── app/              # 페이지 및 레이아웃 (App Router)
├── components/
│   ├── ui/           # shadcn/ui 공통 컴포넌트
│   ├── interview/    # 면접 Q&A 페이지 컴포넌트
│   ├── landing/      # 랜딩 페이지 컴포넌트
│   └── shared/       # 공통 컴포넌트
├── db/               # Drizzle 스키마, DB 연결, 마이그레이션, 시드
├── data-access/      # DB 접근 추상화 레이어
├── stores/           # Zustand 상태 관리
├── test/             # 테스트 헬퍼 및 setup
└── lib/              # 유틸리티, 상수
```

## 명령어

```bash
pnpm dev              # 개발 서버 (localhost:3000)
pnpm build            # 프로덕션 빌드
pnpm db:generate      # Drizzle 스키마 → 마이그레이션 SQL 생성
pnpm db:migrate       # PostgreSQL 마이그레이션 실행
pnpm db:studio        # Drizzle Studio (DB GUI)
pnpm db:seed:sample   # 샘플 데이터 시드
pnpm db:seed          # 개인 데이터 시드 (data/seed.ts 필요)
pnpm test             # 테스트 실행 (Docker PG 필요)
pnpm test:watch       # 테스트 watch 모드
pnpm lint             # ESLint 검사
pnpm lint:fix         # ESLint 자동 수정
pnpm format           # Prettier 포매팅
pnpm format:check     # Prettier 포매팅 검사
```

### 로컬 개발 시작

```bash
docker compose up -d   # PostgreSQL 컨테이너 기동
pnpm db:migrate        # 마이그레이션 실행 (최초 1회 또는 스키마 변경 시)
pnpm db:seed:sample    # 샘플 데이터 시드 (선택)
pnpm dev               # 개발 서버
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
- 필수 환경변수: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`
- `SYSTEM_USER_ID = 'system'`: 시스템 템플릿 데이터용
- `DEFAULT_USER_ID = 'local-user'`: 로컬 개발 / 테스트용 (실제 OAuth 사용자 ID 아님)

### 데이터베이스

- **Drizzle ORM** + PostgreSQL (비동기 API)
- 프로덕션: Neon PostgreSQL, 로컬: Docker PostgreSQL 17
- 스키마 정의: `src/db/schema.ts` (Drizzle pgTable)
- 마이그레이션: `drizzle/migrations/` (Drizzle Kit 생성 + 커스텀 SQL)
- data-access 레이어를 통해 접근 (db 직접 import 금지)
- 모든 data-access 함수는 `async` — 호출 시 `await` 필수
- 환경변수: `DATABASE_URL` (.env.local에 설정)
- **시드 업데이트**: DB 스키마 변경 시 `data/seed.sample.ts`와 `src/test/helpers/db.ts`도 동기화 필수
- **테스트**: Docker PG의 `intervuddy_test` DB 사용, TRUNCATE CASCADE로 격리
- **프로덕션 DB**: Neon 연결 문자열은 `.env.production`의 `DATABASE_URL` 사용. Neon 마이그레이션: `npx tsx --env-file=.env.production src/db/migrate.ts`

### Import 경로

- 절대 경로 사용: `@/components/...`, `@/lib/...`, `@/stores/...`

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

### 작업 순서

1. **요구사항 분석** → `brainstorming` 스킬
2. **계획 수립** → `writing-plans` (복잡한 작업 시)
3. **TDD 개발** → `test-driven-development` (red-green-refactor)
4. **검증** → `verification-before-completion` → [검증 체크리스트](docs/agent_docs/verification-checklist.md) 참조
5. **코드 리뷰** → `requesting-code-review`
6. **완료** → `finishing-a-development-branch`로 PR 생성 (`--base develop`)

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

- main, develop 브랜치에 직접 커밋/push 금지
- data/seed.ts (개인 데이터) 커밋 금지 — .gitignore 확인
- \*.db 파일 커밋 금지
- .env.local 커밋 금지 (DATABASE_URL 등 민감 정보 포함)
- console.log 남기고 커밋 금지
- npm/yarn 사용 금지 — pnpm만 사용
