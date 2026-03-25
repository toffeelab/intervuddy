# Intervuddy

면접 예상 Q&A를 체계적으로 관리하고 준비할 수 있는 웹 애플리케이션입니다.

카테고리별 질문 분류, 꼬리질문 대비, 키워드 가이드, 면접 팁 등을 제공하며, JD(직무기술서) 맞춤 질문도 별도로 관리할 수 있습니다.

## 기술 스택

- **모노레포**: pnpm workspace + Turborepo
- **프론트엔드**: Next.js 16 (App Router, React 19), TypeScript
- **백엔드**: NestJS 11 + Fastify
- **실시간**: PartyKit (WebSocket)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: Zustand (UI 상태 전용)
- **Database**: PostgreSQL (Drizzle ORM) — Neon (프로덕션) / Docker (로컬)
- **Auth**: Auth.js v5 (Google/GitHub OAuth + 매직 링크)
- **Font**: Noto Sans KR + JetBrains Mono
- **Code Quality**: ESLint 9 + Prettier

## 프로젝트 구조

```
apps/
├── web/                # Next.js 프론트엔드 (localhost:3000)
│   └── src/
│       ├── app/                # 페이지 및 레이아웃 (App Router)
│       ├── actions/            # Server Actions
│       ├── components/         # UI 컴포넌트
│       ├── db/                 # DB 연결 (getDb)
│       ├── stores/             # Zustand 상태 관리
│       └── lib/                # 유틸리티, 상수
├── server/             # NestJS 백엔드 (localhost:4000)
│   └── src/
│       ├── auth/               # JWT 인증 가드
│       ├── health/             # 헬스체크 엔드포인트
│       └── database/           # DB 모듈 (DI)
└── partykit/           # PartyKit WebSocket

packages/
├── database/           # 공유 DB 레이어 (Drizzle 스키마, data-access, 마이그레이션)
└── shared/             # 공유 타입, 상수
```

## 시작하기

### 사전 요구사항

- Node.js 22+
- pnpm
- Docker (PostgreSQL 컨테이너)

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# PostgreSQL 컨테이너 기동
docker compose up -d

# 데이터베이스 마이그레이션 (최초 1회 또는 스키마 변경 시)
pnpm db:migrate

# 샘플 데이터 시드 (선택, 아래 둘 중 택 1)
pnpm db:seed:sample   # 샘플 데이터로 시작 (처음 사용자 권장)
pnpm db:seed           # 개인 데이터 시드 (data/seed.ts 필요)

# 개발 서버 실행 (web + server 동시)
pnpm dev
```

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:4000

### 나만의 면접 데이터 추가하기

1. `data/seed.sample.ts`를 복사해 `data/seed.ts`를 만듭니다.
2. 카테고리와 Q&A 항목을 본인의 면접 내용으로 수정합니다.
3. `pnpm db:seed`를 실행하면 개인 데이터가 DB에 반영됩니다.

> `data/seed.ts`는 `.gitignore`에 포함되어 있어 개인 데이터가 커밋되지 않습니다.

### 주요 명령어

```bash
# Turbo (루트)
pnpm dev              # web + server 동시 실행
pnpm build            # 전체 빌드
pnpm lint             # ESLint 검사
pnpm format           # Prettier 포매팅

# 개별 앱
pnpm --filter @intervuddy/web dev       # Next.js만
pnpm --filter @intervuddy/server dev    # NestJS만

# DB
pnpm db:generate      # 마이그레이션 SQL 생성
pnpm db:migrate       # 마이그레이션 실행
pnpm db:studio        # Drizzle Studio (DB GUI)
```

### 빌드

```bash
pnpm build
```

## 주요 기능

- **카테고리별 Q&A**: 자기소개/커리어, 기술역량, 리더십/팀, 프로젝트 심화, 커리어 방향성, 조직/문화핏
- **JD 맞춤 질문**: 직무기술서 기반 맞춤 질문 (실시간/통신, 백오피스/UI, TypeScript/보안 등)
- **꼬리질문 대비**: 면접관의 심화 질문과 답변 가이드
- **키워드 가이드**: 답변에 포함해야 할 핵심 키워드
- **면접 팁**: 실전 면접 노하우
- **검색 & 필터**: 질문, 답변, 키워드 기반 검색
- **인라인 편집**: /study 페이지에서 답변/팁/꼬리질문을 클릭하여 바로 수정
- **질문 관리**: /interviews에서 질문 테이블, 편집 드로어, 카테고리 관리
- **다크/라이트 테마**: 시스템 설정 연동 + 수동 토글

## 아키텍처

### Server / Client 분리

- **Server Component**: 데이터 fetching, 정적 UI (통계, 키워드 태그)
- **Client Component**: 사용자 인터랙션 (카테고리 선택, 검색, 카드 펼치기/접기)

### 데이터 접근

`packages/database`의 data-access 모듈이 DB 접근을 추상화합니다. 모든 data-access 함수는 `db` 파라미터를 첫 번째 인자로 받아 DI 호환됩니다.

- **Next.js (web)**: `getDb()`로 Drizzle 인스턴스 획득 → data-access 함수 호출
- **NestJS (server)**: `DatabaseModule`이 Drizzle 인스턴스를 DI로 주입

### 인증

- **프론트엔드**: Auth.js v5 (Google/GitHub OAuth + 매직 링크), JWT 세션 전략
- **서비스 간 통신**: 전용 `JWT_SECRET`으로 Next.js → NestJS 인증

## Git Flow

### 브랜치 전략

| 브랜치      | 용도            | 머지 대상          |
| ----------- | --------------- | ------------------ |
| `main`      | 프로덕션 릴리스 | -                  |
| `develop`   | 통합 브랜치     | `main`             |
| `feature/*` | 신규 기능       | `develop`          |
| `hotfix/*`  | 긴급 수정       | `main` + `develop` |

### Feature 작업 흐름

```bash
# 1. develop에서 feature 브랜치 생성
git checkout develop && git pull
git checkout -b feature/my-feature

# 2. 작업 및 커밋 (conventional commits)
git add <files>
git commit -m "feat: add something"

# 3. push 및 PR 생성
git push -u origin feature/my-feature
gh pr create --base develop

# 4. Claude 자동 코드리뷰 → 피드백 반영 → merge
gh pr merge --squash --delete-branch
```

## Claude 자동 PR 리뷰

`apps/` 또는 `packages/` 하위 코드 변경 시 Claude Haiku가 자동으로 코드리뷰를 수행합니다.

### 설정

1. **Claude Code GitHub App 설치**: https://github.com/apps/claude
2. **OAuth 토큰 생성 및 등록**:
   ```bash
   claude setup-token
   gh secret set CLAUDE_CODE_OAUTH_TOKEN
   ```
3. **토큰 만료 시 갱신** (1년 주기): 위 명령어 재실행

### 동작 방식

- 코드 변경 PR → 자동 전체 리뷰
- 리뷰 반영 후 push → 자동 증분 리뷰 (이전 이슈 해결 여부 확인)
- **Draft PR에서는 리뷰 스킵** → Draft → Ready 전환 시 리뷰 트리거
- PR 코멘트에 `@claude` → 수동 리뷰/질문
- 리뷰는 한국어로 작성되며, 토큰 사용량이 하단에 표시됨
- **자동 판정**: Claude 리뷰 결과를 후처리 step이 파싱하여 `gh pr review`로 Approve/Request Changes 게시
- **파일 제외**: `apps/web/src/components/ui/*`(shadcn 보일러플레이트), `.github/screenshots/*`, lock 파일 등은 리뷰에서 자동 제외

### Workflow 파일 수정 시 주의사항

Claude Code Action은 **default branch(main)의 workflow 파일**과 PR 브랜치의 workflow가 동일한지 검증한다.
따라서 `.github/workflows/` 파일은 일반 코드의 git flow(feature → develop → main)와 다르게 취급해야 한다.

```bash
# 1. main에서 직접 workflow 수정 브랜치 생성
git checkout main && git pull
git checkout -b chore/workflow-update

# 2. workflow 수정 후 main 대상 PR 생성 → 머지
gh pr create --base main

# 3. main을 develop에 동기화
git checkout develop && git merge main && git push

# 4. 진행 중인 feature 브랜치가 있다면 develop merge
git checkout feature/xxx && git merge develop && git push
```

> **주의:** workflow를 develop이나 feature에서만 수정하면 main과 불일치가 발생하여 Claude 리뷰 Action이 실패한다.
