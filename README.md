# Intervuddy

면접 예상 Q&A를 체계적으로 관리하고 준비할 수 있는 웹 애플리케이션입니다.

카테고리별 질문 분류, 꼬리질문 대비, 키워드 가이드, 면접 팁 등을 제공하며, JD(직무기술서) 맞춤 질문도 별도로 관리할 수 있습니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: Zustand (UI 상태 전용)
- **Database**: SQLite (better-sqlite3) — 서버 재시작 후에도 데이터 유지
- **Font**: Noto Sans KR + JetBrains Mono
- **Code Quality**: ESLint 9 + Prettier

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 랜딩 페이지 (브랜딩/기능 소개)
│   ├── globals.css           # 다크/라이트 테마 + Tailwind 설정
│   ├── study/                # 학습 페이지 (Q&A 카드 뷰 + 간편편집)
│   └── interviews/           # 관리 페이지 (질문 CRUD, JD 관리)
├── actions/                  # Next.js Server Actions (질문/꼬리질문/카테고리)
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── shared/               # 공통 컴포넌트 (테마 토글, 인라인 편집 등)
│   ├── landing/              # 랜딩 페이지 컴포넌트
│   ├── study/                # 학습 페이지 컴포넌트
│   └── interviews/           # 관리 페이지 컴포넌트
├── db/                       # SQLite 연결 및 스키마
├── data-access/              # 데이터 접근 추상화 레이어
├── stores/                   # Zustand 상태 관리
└── lib/                      # 유틸리티 및 상수
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- pnpm

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 데이터베이스 시드 (최초 1회, 아래 둘 중 택 1)
pnpm db:seed:sample   # 샘플 데이터로 시작 (처음 사용자 권장)
pnpm db:seed           # 개인 데이터 시드 (data/seed.ts 필요)

# 개발 서버 실행
pnpm dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### 나만의 면접 데이터 추가하기

1. `data/seed.sample.ts`를 복사해 `data/seed.ts`를 만듭니다.
2. 카테고리와 Q&A 항목을 본인의 면접 내용으로 수정합니다.
3. `pnpm db:seed`를 실행하면 개인 데이터가 DB에 반영됩니다.

> `data/seed.ts`는 `.gitignore`에 포함되어 있어 개인 데이터가 커밋되지 않습니다.

### 빌드

```bash
pnpm build
pnpm start
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
- **데이터 영속성**: SQLite 기반으로 서버 재시작 후에도 데이터 보존

## 아키텍처 설계 원칙

### Server / Client 분리

- **Server Component**: 데이터 fetching, 정적 UI (통계, 키워드 태그)
- **Client Component**: 사용자 인터랙션 (카테고리 선택, 검색, 카드 펼치기/접기)

### 상태 관리 전략

- **Zustand**: UI 상태 (activeCategory, searchQuery, expandedCards) — 여러 컴포넌트에서 동시 소비
- **Server Props**: QA 데이터 — Server Component에서 fetch 후 props로 전달
- **추후 확장**: API Route + React Query로 전환 시 data-access 레이어만 교체

### 데이터 접근 추상화

`src/data-access/`의 모듈별 함수(`questions.ts`, `categories.ts`, `followups.ts`, `jobs.ts`)가 SQLite를 직접 호출합니다. Server Actions(`src/actions/`)가 이를 래핑하여 `revalidatePath`를 호출합니다.

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

### 병렬 작업 (Worktree)

```bash
git worktree add ../intervuddy-wt-taskB feature/taskB
cd ../intervuddy-wt-taskB && pnpm install
pnpm dev --port 3001

# 완료 후 정리
git worktree remove ../intervuddy-wt-taskB
```

## Claude 자동 PR 리뷰

`src/` 하위 코드 변경 시 Claude Haiku가 자동으로 코드리뷰를 수행합니다.

### 설정

1. **Claude Code GitHub App 설치**: https://github.com/apps/claude
2. **OAuth 토큰 생성 및 등록**:
   ```bash
   claude setup-token
   gh secret set CLAUDE_CODE_OAUTH_TOKEN
   ```
3. **토큰 만료 시 갱신** (1년 주기): 위 명령어 재실행

### 동작 방식

- `src/**` 파일 변경 PR → 자동 전체 리뷰
- 리뷰 반영 후 push → 자동 증분 리뷰 (이전 이슈 해결 여부 확인)
- **Draft PR에서는 리뷰 스킵** → Draft → Ready 전환 시 리뷰 트리거
- PR 코멘트에 `@claude` → 수동 리뷰/질문
- 리뷰는 한국어로 작성되며, 토큰 사용량이 하단에 표시됨
- **자동 판정**: Claude 리뷰 결과를 후처리 step이 파싱하여 `gh pr review`로 Approve/Request Changes 게시
- **파일 제외**: `src/components/ui/*`(shadcn 보일러플레이트), `.github/screenshots/*`, lock 파일 등은 리뷰에서 자동 제외

### Draft PR 활용

리뷰 피드백 반영 중 중간 저장이 필요할 때 (장소 이동 등):

```bash
gh pr ready --undo <PR번호>   # draft 전환 → 이후 push에 리뷰 안 돌아감
# ... 중간 작업 commit & push ...
gh pr ready <PR번호>           # ready 전환 → 리뷰 트리거
```

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
