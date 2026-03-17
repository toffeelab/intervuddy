# CLAUDE.md — Intervuddy 프로젝트 가이드

## 프로젝트 개요

면접 예상 Q&A 관리 웹앱. Next.js 16 App Router + TypeScript + SQLite.

## 기술 스택

- Next.js 16.1.7 (App Router, RSC), React 19, TypeScript 5
- Tailwind CSS v4, shadcn/ui (base-nova 스타일, lucide 아이콘)
- SQLite (better-sqlite3), Zustand (UI 상태)
- pnpm (패키지 매니저 — npm/yarn 사용 금지)

## 디렉토리 구조

```
src/
├── app/              # 페이지 및 레이아웃 (App Router)
├── components/
│   ├── ui/           # shadcn/ui 공통 컴포넌트
│   ├── interview/    # 면접 Q&A 페이지 컴포넌트
│   ├── landing/      # 랜딩 페이지 컴포넌트
│   └── shared/       # 공통 컴포넌트
├── db/               # SQLite 스키마, 연결, 시드
├── data-access/      # DB 접근 추상화 레이어
├── stores/           # Zustand 상태 관리
├── test/             # 테스트 헬퍼 및 setup
└── lib/              # 유틸리티, 상수
```

## 명령어

```bash
pnpm dev              # 개발 서버 (localhost:3000)
pnpm build            # 프로덕션 빌드
pnpm db:seed:sample   # 샘플 데이터 시드
pnpm db:seed          # 개인 데이터 시드 (data/seed.ts 필요)
pnpm test             # 테스트 실행
pnpm test:watch       # 테스트 watch 모드
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

### 스타일링

- Tailwind CSS 유틸리티 클래스 사용
- 커스텀 CSS 변수: `iv-` 접두사 (globals.css 참조)
- shadcn/ui 컴포넌트 추가: `pnpm dlx shadcn@latest add <component>`
- cn() 유틸리티로 클래스 병합 (@/lib/utils)

### 데이터베이스

- better-sqlite3 동기 API 사용
- 파라미터 바인딩 필수 (SQL injection 방지)
- data-access 레이어를 통해 접근 (db 직접 import 금지)

### Import 경로

- 절대 경로 사용: `@/components/...`, `@/lib/...`, `@/stores/...`

### 타입

- `any` 사용 금지 — 구체적 타입 또는 `unknown` 사용
- 인터페이스는 해당 파일 내 정의, 공유 타입은 data-access/types.ts

## 개발 워크플로우 (필수 준수)

### Git Flow

```
main (프로덕션) ← develop (통합) ← feature/<날짜>/<이름> (기능 개발)
```

1. `develop`에서 `feature/<YYYY-MM-DD>/<이름>` 브랜치 생성 (예: `feature/2026-03-17/theme-mode-toggle`)
2. conventional commits 사용 (feat:, fix:, refactor:, chore:)
3. PR은 반드시 `develop` 대상으로 생성
4. Claude 자동 리뷰 통과 후 squash merge
5. 머지 완료된 feature 브랜치는 30일 후 자동 삭제 (GitHub Actions)

### Superpowers 기반 개발

기능 개발 시 superpowers 프로세스 스킬을 활용하여 체계적으로 진행:

- **brainstorming**: 요구사항 분석, 설계 탐색 — 구현 전 반드시 수행
- **writing-plans**: 멀티스텝 작업의 구현 계획 수립
- **test-driven-development**: TDD red-green-refactor (내부에서 tdd-workflows 호출)
- **verification-before-completion**: 완료 선언 전 검증 필수
- **requesting-code-review**: 주요 구현 완료 후 코드 리뷰
- **finishing-a-development-branch**: 브랜치 마무리 (merge/PR 결정)

도메인별 구현 에이전트 (superpowers가 필요 시 활용):
- **frontend-developer**: React 컴포넌트, 레이아웃, 클라이언트 상태
- **simplify**: 리팩토링 및 코드 품질 개선

### 작업 순서

1. **요구사항 분석** → `brainstorming` 스킬로 의도/요구사항/설계 탐색
2. **계획 수립** → `writing-plans`로 구현 계획 작성 (복잡한 작업 시)
3. **TDD 개발** → `test-driven-development`로 red-green-refactor 사이클
4. **검증** → `verification-before-completion` + Playwright E2E (아래 참조)
5. **코드 리뷰** → `requesting-code-review`로 품질 확인
6. **완료** → `finishing-a-development-branch`로 PR 생성 (`--base develop`)

### E2E 검증 (커밋 전 필수)

구현 완료 후, 커밋 전에 Playwright MCP를 통해 실제 동작을 검증:

1. `pnpm dev`로 개발 서버 실행
2. `browser_navigate`로 해당 페이지 접근
3. `browser_take_screenshot`으로 렌더링 결과 캡처
4. `browser_click`, `browser_fill_form`, `browser_type` 등으로 주요 인터랙션 테스트
5. 콘솔 에러 없음 확인 (`browser_console_messages`)

### PR 스크린샷 첨부

E2E 스크린샷을 PR에 첨부할 때는 **feature 브랜치에 임시 커밋** → raw URL 참조:

1. 스크린샷을 `.github/screenshots/`에 저장
2. feature 브랜치에 커밋: `git add .github/screenshots/ && git commit -m "chore: E2E 스크린샷 첨부"`
3. PR 본문에서 raw URL로 참조: `![설명](https://raw.githubusercontent.com/toffeelab/intervuddy/feature/<날짜>/<이름>/.github/screenshots/<파일명>)`
4. squash merge 시 develop에는 스크린샷이 포함되지 않음
5. feature 브랜치 삭제 전까지 PR에서 이미지 확인 가능 (30일 보관)

### 병렬 작업 및 Worktree 관리

독립적인 태스크가 2개 이상일 때 superpowers 스킬로 병렬 처리:

- `using-git-worktrees`: worktree 생성 및 격리 환경 설정
- `dispatching-parallel-agents`: 독립 태스크 병렬 실행
- dev 서버 포트 충돌 방지: `--port 3001`, `--port 3002` 등
- worktree에서 에이전트 실행 시 `node_modules` 심링크 필요: `ln -s <메인>/node_modules ./node_modules`

**Worktree 생명주기:**

1. feature 브랜치 생성 → worktree 생성 (격리 환경)
2. 구현 + 테스트 + 커밋 (worktree 내에서)
3. push + PR 생성
4. **PR push 완료 후 즉시 worktree 정리**: `git worktree remove <path>`
5. 이후 PR 수정이 필요하면 feature 브랜치를 직접 체크아웃하여 작업

### Serena MCP 활용

코드베이스 탐색 및 편집 시 Serena의 심볼릭 도구를 우선 활용:

- **탐색**: `get_symbols_overview` → `find_symbol`(name_path + include_body) 순서로 점진적 탐색
- **편집**: 심볼 단위 수정은 `replace_symbol_body`, 부분 수정은 `replace_content` (정규식 지원)
- **참조 추적**: `find_referencing_symbols`로 변경 영향 범위 파악 후 편집
- **검색**: 심볼명 불확실 시 `search_for_pattern`으로 후보 탐색 → 심볼릭 도구로 진입
- 파일 전체 읽기보다 심볼 단위 읽기를 우선 — 컨텍스트 효율화

## 금지 사항

- main, develop 브랜치에 직접 커밋/push 금지
- data/seed.ts (개인 데이터) 커밋 금지 — .gitignore 확인
- \*.db 파일 커밋 금지
- console.log 남기고 커밋 금지
- npm/yarn 사용 금지 — pnpm만 사용
