# 모바일 UX 및 반응형 개선 설계

## 개요

Intervuddy 전체 페이지/컴포넌트의 모바일 UX를 개선한다.
현재 대부분의 레이아웃이 데스크톱 기준으로 설계되어 있어, 모바일(375px~)에서 사이드바 압축, hover 의존 액션, 고정 폭 레이아웃 등의 문제가 있다.

## 설계 결정 요약

| 항목                                | 패턴                  | 근거                                                                 |
| ----------------------------------- | --------------------- | -------------------------------------------------------------------- |
| 사이드바 (study, interviews)        | Sheet/Drawer 오버레이 | Drawer 컴포넌트 이미 존재, 사이드바 콘텐츠가 많아 상단 탭으로 부적합 |
| hover 액션 (QuestionTable, JobCard) | DropdownMenu (⋯)      | 깔끔한 UI, 향후 액션 확장 용이                                       |
| ImportModal                         | DrawerDialog 패턴     | 모바일에서 하단 Drawer가 스크롤+체크에 자연스러움                    |

## 대상 컴포넌트 및 변경 사항

### 1. `/study` 페이지 사이드바

**파일:** `src/app/study/page.tsx`, `src/components/study/sidebar.tsx`

**현재 문제:**

- `grid-cols-[230px_1fr]` 고정 그리드로 모바일에서 사이드바가 콘텐츠를 압축

**변경:**

- `study/page.tsx`: 모바일에서 1열 레이아웃, `md:` 이상에서 기존 그리드
  - `grid-cols-1 md:grid-cols-[230px_1fr]`
  - 모바일에서 `<Sidebar>`를 직접 렌더링하지 않음
- `sidebar.tsx`: 모바일용 Drawer 래퍼 추가
  - 새 컴포넌트 `MobileSidebar` (또는 Sidebar 내부 분기)
  - Drawer direction: `left`
  - 열기/닫기 상태를 Zustand store 또는 props로 관리
- `InterviewHeader`에 햄버거 버튼 추가 (`md:hidden`)

### 2. `/interviews` 레이아웃 사이드바

**파일:** `src/app/interviews/layout.tsx`, `src/components/interviews/sidebar-nav.tsx`

**현재 문제:**

- `SidebarNav`가 `w-52` 고정, 모바일에서 숨김/접기 없음

**변경:**

- `layout.tsx`: 사이드바를 `hidden md:flex`로 데스크톱만 표시
- 모바일용 Drawer 추가 (헤더에 햄버거 버튼)
- 항목이 2개뿐이라 Drawer 내용은 간결
- 헤더 영역에 `Menu` 아이콘 버튼 추가 (`md:hidden`)

### 3. `InterviewHeader` 반응형

**파일:** `src/components/study/interview-header.tsx`

**현재 문제:**

- 배지, 버튼이 가로 나열만 되어 모바일에서 넘침 가능

**변경:**

- 사이드바 토글(햄버거) 버튼 추가 (`md:hidden`)
- "JD 맞춤 질문 포함" 배지: `hidden md:inline-flex`로 모바일에서 숨김
- "총 N문항" 배지, 전체 펼치기/접기, 테마 토글은 유지
- 앱 제목 `text-[15px]` → 모바일에서 `text-sm`으로 축소 가능

### 4. `QuestionTable` 액션 → DropdownMenu

**파일:** `src/components/interviews/question-table.tsx`

**현재 문제:**

- 편집/삭제 버튼이 `opacity-0 group-hover:opacity-100`으로 터치 디바이스에서 접근 불가

**변경:**

- `QuestionRow` 내 편집/삭제 버튼을 `DropdownMenu`로 교체
- ⋯ (`MoreHorizontal`) 아이콘 버튼 → 드롭다운에 편집, 삭제 메뉴 아이템
- 데스크톱/모바일 동일 패턴 (hover 의존 제거)
- `DropdownMenu` 컴포넌트는 이미 `src/components/ui/dropdown-menu.tsx`에 설치됨

### 5. `JobCard` 액션 → DropdownMenu

**파일:** `src/components/interviews/job-card.tsx`

**현재 문제:**

- 삭제 버튼이 hover 의존

**변경:**

- 삭제 버튼을 `DropdownMenu`로 교체
- ⋯ 아이콘 → 드롭다운에 삭제 메뉴 아이템
- 카드 클릭 시 상세 페이지 이동은 유지, ⋯ 클릭 시 `e.stopPropagation()`

### 6. `CategoryManager` 테이블 → 모바일 카드형

**파일:** `src/components/interviews/category-manager.tsx`

**현재 문제:**

- 테이블형 레이아웃(아이콘/이름/슬러그/질문수/액션)이 좁은 화면에서 깨짐

**변경:**

- 컬럼 헤더: `hidden md:flex`
- `CategoryRow` 일반 모드:
  - 모바일: 세로 스택 — 첫 줄(아이콘 + 표시 이름 + ⋯ 드롭다운), 둘째 줄(슬러그 + 질문수)
  - `md:` 이상: 기존 가로 레이아웃 유지
- `CategoryRow` 편집 모드:
  - 모바일: Input들을 세로 스택
  - `md:` 이상: 기존 가로 배치
- `AddCategoryForm`:
  - 모바일: Input들을 세로 스택
  - `md:` 이상: 기존 가로 배치

### 7. `ImportModal` → DrawerDialog

**파일:** `src/components/interviews/import-modal.tsx`

**현재 문제:**

- `Dialog` + `max-w-2xl` 고정, 모바일 화면 활용 부족

**변경:**

- 새 공통 컴포넌트: `src/components/shared/drawer-dialog.tsx`
  - `useMediaQuery('(min-width: 768px)')` 훅으로 분기
  - `md` 이상: `Dialog` 렌더링
  - `md` 미만: `Drawer` (direction: `bottom`) 렌더링
  - 동일한 children props 전달
- `useMediaQuery` 훅: `src/lib/hooks/use-media-query.ts`
  - `window.matchMedia` 기반, SSR 안전
- `ImportModal`에서 `Dialog` → `DrawerDialog`로 교체
- Drawer 모드에서 높이: `max-h-[85vh]`

### 8. `QACard` 태그 영역 반응형

**파일:** `src/components/study/qa-card.tsx`

**현재 문제:**

- 태그들이 `shrink-0`으로 한 줄 강제, 모바일에서 질문 텍스트 압축

**변경:**

- 모바일: 버튼 내부를 flex-wrap 또는 세로 구조로 변경
  - 질문 텍스트: 전체 폭
  - 태그 영역: 질문 아래 별도 줄로 이동
- `md:` 이상: 기존 한 줄 레이아웃 유지
- 구현: `flex flex-col md:flex-row` 패턴

## 신규 파일

| 파일                                      | 용도                       |
| ----------------------------------------- | -------------------------- |
| `src/components/shared/drawer-dialog.tsx` | DrawerDialog 공통 컴포넌트 |
| `src/lib/hooks/use-media-query.ts`        | useMediaQuery 훅           |

## 수정 파일 목록

| 파일                                             | 변경 범위                     |
| ------------------------------------------------ | ----------------------------- |
| `src/app/study/page.tsx`                         | 그리드 반응형 처리            |
| `src/app/interviews/layout.tsx`                  | 사이드바 반응형 + Drawer 추가 |
| `src/components/study/sidebar.tsx`               | 모바일 Drawer 래퍼            |
| `src/components/study/interview-header.tsx`      | 햄버거 버튼, 배지 숨김        |
| `src/components/study/qa-card.tsx`               | 태그 줄바꿈                   |
| `src/components/interviews/sidebar-nav.tsx`      | 모바일 Drawer 지원            |
| `src/components/interviews/question-table.tsx`   | DropdownMenu 전환             |
| `src/components/interviews/job-card.tsx`         | DropdownMenu 전환             |
| `src/components/interviews/category-manager.tsx` | 모바일 카드형 전환            |
| `src/components/interviews/import-modal.tsx`     | DrawerDialog 전환             |

## 브레이크포인트 기준

CLAUDE.md 컨벤션 준수: Mobile-First 접근

| 접두사 | 최소 너비 | 역할                                |
| ------ | --------- | ----------------------------------- |
| (없음) | 0px       | 모바일 기본                         |
| `md:`  | 768px     | 사이드바 표시, 테이블 레이아웃 전환 |

주로 `md:` 브레이크포인트 하나로 모바일/데스크톱을 분기한다.
`sm:`(640px)은 필요한 경우에만 사용 (예: 2열 그리드 등).

## 제외 사항

- 랜딩 페이지 (`/`): 이미 반응형이 양호 (`sm:`, `md:` 접두사 사용 중)
- 기능 추가 없음: 순수 반응형/UX 개선만 수행
- 디자인 변경 없음: 기존 색상, 폰트, 간격 체계 유지
