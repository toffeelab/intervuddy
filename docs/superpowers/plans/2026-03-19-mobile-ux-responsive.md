# 모바일 UX 및 반응형 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 페이지/컴포넌트에서 모바일(375px~) UX가 원활하게 작동하도록 반응형 개선

**Architecture:** Mobile-First 접근으로 기본 스타일은 모바일, `md:` 접두사로 데스크톱 확장. 사이드바는 Drawer 오버레이, hover 액션은 DropdownMenu, 모달은 DrawerDialog 패턴 적용.

**Tech Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui (Drawer, DropdownMenu, Dialog), Zustand, vaul, @base-ui/react

---

## 파일 구조

### 신규 파일

| 파일                                          | 책임                                                            |
| --------------------------------------------- | --------------------------------------------------------------- |
| `src/lib/hooks/use-media-query.ts`            | SSR-safe `useMediaQuery` 훅                                     |
| `src/components/shared/drawer-dialog.tsx`     | 모바일 Drawer / 데스크톱 Dialog 자동 전환 컴포넌트              |
| `src/components/study/study-client-shell.tsx` | /study 페이지 Client Component 래퍼 (사이드바 Drawer 상태 관리) |

### 수정 파일

| 파일                                             | 변경                                   |
| ------------------------------------------------ | -------------------------------------- |
| `src/app/study/page.tsx`                         | 그리드 반응형, 모바일에서 Sidebar 숨김 |
| `src/components/study/sidebar.tsx`               | MobileSidebar Drawer 래퍼 export       |
| `src/components/study/interview-header.tsx`      | 햄버거 버튼, 배지 숨김, 반응형         |
| `src/components/study/qa-card.tsx`               | 태그 영역 모바일 줄바꿈                |
| `src/app/interviews/layout.tsx`                  | 사이드바 반응형 + 모바일 Drawer        |
| `src/components/interviews/sidebar-nav.tsx`      | Drawer용 props 수신                    |
| `src/components/interviews/question-table.tsx`   | DropdownMenu 전환                      |
| `src/components/interviews/job-card.tsx`         | DropdownMenu 전환                      |
| `src/components/interviews/category-manager.tsx` | 모바일 카드형 전환                     |
| `src/components/interviews/import-modal.tsx`     | DrawerDialog 전환                      |

---

### Task 1: useMediaQuery 훅 생성

**Files:**

- Create: `src/lib/hooks/use-media-query.ts`

- [ ] **Step 1: useMediaQuery 훅 구현**

```ts
'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공 (사용처 없으므로 tree-shake 됨)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/hooks/use-media-query.ts
git commit -m "feat: useMediaQuery 훅 추가"
```

---

### Task 2: DrawerDialog 공통 컴포넌트 생성

**Files:**

- Create: `src/components/shared/drawer-dialog.tsx`
- Reference: `src/components/ui/drawer.tsx`, `src/components/ui/dialog.tsx`

- [ ] **Step 1: DrawerDialog 컴포넌트 구현**

```tsx
'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/lib/hooks/use-media-query';

interface DrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  dialogClassName?: string;
  drawerClassName?: string;
}

export function DrawerDialog({
  open,
  onOpenChange,
  title,
  children,
  dialogClassName,
  drawerClassName,
}: DrawerDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={dialogClassName}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={drawerClassName ?? 'max-h-[85vh]'}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

// Close alias는 별도 export하지 않음 — DrawerDialog 내부에서 처리
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/shared/drawer-dialog.tsx
git commit -m "feat: DrawerDialog 공통 컴포넌트 추가"
```

---

### Task 3: QuestionTable — DropdownMenu 전환

**Files:**

- Modify: `src/components/interviews/question-table.tsx`

- [ ] **Step 1: QuestionRow 내 hover 액션을 DropdownMenu로 교체**

`QuestionRow` 컴포넌트 수정:

- import 추가: `MoreHorizontal` (lucide), `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`
- 기존 hover 액션 div (`opacity-0 group-hover:opacity-100`) 제거
- `MoreHorizontal` 버튼 + DropdownMenu 로 교체:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger
    render={
      <Button variant="ghost" size="icon-sm" title="더보기">
        <MoreHorizontal className="size-3.5" />
      </Button>
    }
  />
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => openDrawer(question.id)}>
      <Pencil className="size-3.5" />
      편집
    </DropdownMenuItem>
    <DropdownMenuItem variant="destructive" onClick={handleDelete}>
      <Trash2 className="size-3.5" />
      삭제
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- `group` 클래스는 외부 div에서 제거 (더 이상 필요 없음)

- [ ] **Step 2: 개발 서버에서 `/interviews/questions` 확인**

Run: `pnpm dev`
확인: ⋯ 버튼 클릭 시 편집/삭제 드롭다운 표시, 각 메뉴 동작 정상

- [ ] **Step 3: 커밋**

```bash
git add src/components/interviews/question-table.tsx
git commit -m "refactor: QuestionTable hover 액션을 DropdownMenu로 전환"
```

---

### Task 4: JobCard — DropdownMenu 전환

**Files:**

- Modify: `src/components/interviews/job-card.tsx`

- [ ] **Step 1: 삭제 버튼을 DropdownMenu로 교체**

- import 추가: `MoreHorizontal`, `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`
- 기존 삭제 Button (`opacity-0 group-hover:opacity-100`) 제거
- DropdownMenu로 교체. ⋯ 버튼에 `e.stopPropagation()` 처리 (카드 클릭 이벤트 전파 방지):

```tsx
<DropdownMenu>
  <DropdownMenuTrigger
    render={
      <Button variant="ghost" size="icon-sm" title="더보기" onClick={(e) => e.stopPropagation()}>
        <MoreHorizontal className="size-3.5" />
      </Button>
    }
  />
  <DropdownMenuContent align="end">
    <DropdownMenuItem variant="destructive" onClick={handleDelete}>
      <Trash2 className="size-3.5" />
      삭제
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- `group` 클래스는 외부 div에서 제거

- [ ] **Step 2: 개발 서버에서 `/interviews` 확인**

확인: 카드 클릭 시 상세 이동, ⋯ 클릭 시 삭제 드롭다운 표시, 삭제 동작 정상

- [ ] **Step 3: 커밋**

```bash
git add src/components/interviews/job-card.tsx
git commit -m "refactor: JobCard hover 액션을 DropdownMenu로 전환"
```

---

### Task 5: `/study` 사이드바 — 모바일 Drawer 전환

**Files:**

- Modify: `src/components/study/sidebar.tsx`
- Modify: `src/components/study/interview-header.tsx`
- Modify: `src/app/study/page.tsx`

- [ ] **Step 1: Sidebar에 MobileSidebar export 추가**

`sidebar.tsx` 하단에 MobileSidebar 컴포넌트 추가:

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

interface MobileSidebarProps extends SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange, ...props }: MobileSidebarProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent className="bg-iv-bg2 w-[280px] p-0">
        <DrawerHeader className="border-iv-border border-b px-3 py-3">
          <DrawerTitle className="text-iv-text text-sm">카테고리</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="h-[calc(100vh-57px)]">
          <div className="space-y-1 p-3">
            {/* Sidebar 내부 콘텐츠를 별도 함수로 추출하여 재사용 */}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
```

실제 구현 시: Sidebar 내부 콘텐츠를 `SidebarContent` 내부 컴포넌트로 추출 → `Sidebar`와 `MobileSidebar` 모두에서 재사용. 카테고리 버튼 클릭 시 `onOpenChange(false)` 호출하여 Drawer 자동 닫기.

- [ ] **Step 2: InterviewHeader에 햄버거 버튼 추가**

`interview-header.tsx` 수정:

- import 추가: `Menu` (lucide)
- props에 `onMenuClick?: () => void` 추가
- 로고 왼쪽에 햄버거 버튼 추가:

```tsx
{
  onMenuClick && (
    <Button variant="ghost" size="icon-sm" onClick={onMenuClick} className="md:hidden">
      <Menu className="size-5" />
    </Button>
  );
}
```

- "JD 맞춤 질문 포함" 배지에 `hidden md:inline-flex` 추가
- "Intervuddy" 텍스트는 이미 `hidden sm:inline`

- [ ] **Step 3: study/page.tsx 레이아웃 반응형 처리**

`page.tsx` 수정:

- 그리드를 반응형으로: `grid-cols-1 md:grid-cols-[230px_1fr]`
- Sidebar를 `hidden md:block`으로 데스크톱만 표시
- MobileSidebar 추가 (useState로 open 관리)
- InterviewHeader에 onMenuClick prop 전달
- 페이지를 Client Component로 전환하지 않기 위해 별도 `StudyClientShell` Client Component 도입:

```tsx
// study/page.tsx (Server Component 유지)
export default async function StudyPage({ searchParams }: StudyPageProps) {
  // ... 기존 데이터 fetch 로직 유지
  return (
    <StudyClientShell items={items} categories={categories} jobs={jobs} allItemIds={allItemIds} />
  );
}
```

`StudyClientShell` 내부:

- `const [sidebarOpen, setSidebarOpen] = useState(false);`
- MobileSidebar, InterviewHeader(onMenuClick), Sidebar(desktop), QAList 등 배치

**주의:** 새 파일 `src/components/study/study-client-shell.tsx` 생성 필요

- [ ] **Step 4: 개발 서버에서 모바일 뷰포트(375px) 확인**

확인 항목:

- 모바일: 사이드바 숨김, 햄버거 버튼 표시, 클릭 시 왼쪽 Drawer
- Drawer 내 카테고리 클릭 시 Drawer 닫힘 + 카테고리 필터 동작
- 데스크톱: 기존 사이드바 레이아웃 유지

- [ ] **Step 5: 커밋**

```bash
git add src/components/study/sidebar.tsx src/components/study/interview-header.tsx src/app/study/page.tsx src/components/study/study-client-shell.tsx
git commit -m "feat: /study 사이드바 모바일 Drawer 전환 + 헤더 반응형"
```

---

### Task 6: `/interviews` 레이아웃 — 모바일 Drawer 전환

**Files:**

- Modify: `src/app/interviews/layout.tsx`
- Modify: `src/components/interviews/sidebar-nav.tsx`

- [ ] **Step 1: layout.tsx를 Client Component로 전환하고 모바일 Drawer 추가**

`layout.tsx` 수정:

- `'use client'` 추가
- `useState`로 Drawer open 관리
- 헤더에 햄버거 버튼 추가 (`md:hidden`)
- `SidebarNav`를 `hidden md:flex`로
- 모바일용 Drawer (direction: `left`) 추가:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu } from 'lucide-react';
import { SidebarNav } from '@/components/interviews/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-iv-bg flex min-h-screen flex-col">
      <header className="border-iv-border bg-iv-bg2 flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden"
        >
          <Menu className="size-5" />
        </Button>
        <Link
          href="/study"
          className="text-iv-text2 hover:text-iv-text flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">스터디로 돌아가기</span>
        </Link>
        <div className="bg-iv-border h-4 w-px" />
        <h1 className="text-iv-text text-sm font-medium">면접 관리</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <SidebarNav className="hidden md:flex" />

        {/* Mobile Sidebar Drawer */}
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
          <DrawerContent className="bg-iv-bg2 w-[240px] p-0">
            <DrawerHeader className="border-iv-border border-b px-3 py-3">
              <DrawerTitle className="text-iv-text text-sm">메뉴</DrawerTitle>
            </DrawerHeader>
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </DrawerContent>
        </Drawer>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: SidebarNav에 className, onNavigate props 추가**

`sidebar-nav.tsx` 수정:

- `className` prop 추가 (외부에서 `hidden md:flex` 전달)
- `onNavigate` prop 추가 (Drawer 내에서 링크 클릭 시 Drawer 닫기)
- 기존 `w-52 shrink-0` → className prop 기반으로 병합

```tsx
interface SidebarNavProps {
  className?: string;
  onNavigate?: () => void;
}

export function SidebarNav({ className, onNavigate }: SidebarNavProps) {
  // ...
  return (
    <nav className={cn('border-iv-border bg-iv-bg2 flex w-52 shrink-0 flex-col gap-1 border-r p-3', className)}>
      <Link onClick={onNavigate} ... />
      <Link onClick={onNavigate} ... />
    </nav>
  );
}
```

- [ ] **Step 3: 개발 서버에서 모바일 뷰포트 확인**

확인: 햄버거 → Drawer, 메뉴 클릭 시 Drawer 닫힘 + 페이지 이동, 데스크톱 기존 레이아웃 유지

- [ ] **Step 4: 커밋**

```bash
git add src/app/interviews/layout.tsx src/components/interviews/sidebar-nav.tsx
git commit -m "feat: /interviews 사이드바 모바일 Drawer 전환"
```

---

### Task 7: CategoryManager — 모바일 카드형 전환

**Files:**

- Modify: `src/components/interviews/category-manager.tsx`

- [ ] **Step 1: 컬럼 헤더 모바일 숨김 + CategoryRow 반응형**

변경 사항:

1. 컬럼 헤더 div에 `hidden md:flex` 추가
2. `CategoryRow` 일반 모드:
   - 모바일: 세로 스택
     - 첫 줄: 아이콘 + 표시 이름 + DropdownMenu(편집/삭제)
     - 둘째 줄: 슬러그 + 질문수 (작은 텍스트)
   - `md:` 이상: 기존 가로 레이아웃 유지
   - hover 액션도 DropdownMenu로 전환 (Task 3/4와 일관)
3. `CategoryRow` 편집 모드:
   - 모바일: Input들을 `flex flex-col` 세로 스택
   - `md:` 이상: `flex flex-row` 기존 가로 배치
4. `AddCategoryForm`:
   - 모바일: Input들을 `flex flex-col gap-2`
   - `md:` 이상: `md:flex-row` 가로 배치

- [ ] **Step 2: 개발 서버에서 모바일 뷰포트 확인**

확인: 카테고리 목록 모바일 카드형, 편집 모드 세로 스택, 추가 폼 세로 스택

- [ ] **Step 3: 커밋**

```bash
git add src/components/interviews/category-manager.tsx
git commit -m "refactor: CategoryManager 모바일 카드형 레이아웃 전환"
```

---

### Task 8: ImportModal → DrawerDialog 전환

**Files:**

- Modify: `src/components/interviews/import-modal.tsx`
- Reference: `src/components/shared/drawer-dialog.tsx`

- [ ] **Step 1: Dialog를 DrawerDialog로 교체**

변경 사항:

1. import 변경: `Dialog` 관련 → `DrawerDialog` from `@/components/shared/drawer-dialog`
2. `Dialog` + `DialogContent` → `DrawerDialog` 컴포넌트로 교체
3. `DialogTrigger`는 별도 Button으로 변경 (DrawerDialog가 open/onOpenChange 기반)
4. 기존 `DialogHeader`, `DialogTitle` 제거 (DrawerDialog에 title prop으로 전달)
5. 내부 콘텐츠는 그대로 유지 (카테고리 필터, 질문 목록, 푸터)

```tsx
<>
  <Button
    variant="outline"
    size="sm"
    className="border-iv-border text-iv-text2"
    onClick={() => setOpen(true)}
  >
    <Download className="size-4" />
    질문 가져오기
  </Button>
  <DrawerDialog
    open={open}
    onOpenChange={setOpen}
    title="공통 라이브러리에서 질문 가져오기"
    dialogClassName="bg-iv-bg border-iv-border flex max-h-[80vh] max-w-2xl flex-col overflow-hidden"
    drawerClassName="bg-iv-bg max-h-[85vh]"
  >
    {/* 카테고리 필터 */}
    {/* 질문 목록 */}
    {/* 푸터 */}
  </DrawerDialog>
</>
```

- [ ] **Step 2: 개발 서버에서 모바일/데스크톱 확인**

확인:

- 모바일: 하단에서 올라오는 Drawer, 스크롤+체크 동작
- 데스크톱: 기존 Dialog 동작 유지

- [ ] **Step 3: 커밋**

```bash
git add src/components/interviews/import-modal.tsx
git commit -m "refactor: ImportModal을 DrawerDialog 패턴으로 전환"
```

---

### Task 9: QACard — 태그 영역 반응형

**Files:**

- Modify: `src/components/study/qa-card.tsx`

- [ ] **Step 1: 버튼 내부 구조를 모바일 반응형으로 변경**

변경 사항:

1. 카드 버튼 내부를 `flex flex-col md:flex-row md:items-center`:
   - 모바일: 질문 텍스트가 전체 폭, 태그는 아래 줄
   - 데스크톱: 기존 한 줄 레이아웃
2. 태그 영역에서 `shrink-0` 제거, `flex-wrap` 추가
3. 질문 번호(`Q{index}`)는 모바일에서 질문 왼쪽 유지

```tsx
<button
  type="button"
  onClick={() => toggleCard(item.id)}
  className="flex w-full flex-col gap-2 px-4 py-3 text-left md:flex-row md:items-center md:gap-3"
>
  <div className="flex items-center gap-3 md:flex-1">
    <span className="text-iv-text3 w-7 shrink-0 font-mono text-[11px]">Q{index}</span>
    <span className="text-iv-text flex-1 text-[13px] leading-snug">{item.question}</span>
  </div>
  <div className="flex flex-wrap items-center gap-1.5 pl-10 md:shrink-0 md:pl-0">
    {/* 기존 태그들 + ▼ 아이콘 */}
  </div>
</button>
```

- [ ] **Step 2: 개발 서버에서 모바일 뷰포트(375px) 확인**

확인: 질문 텍스트가 충분한 폭 확보, 태그가 아래 줄로 이동, 데스크톱 기존 레이아웃 유지

- [ ] **Step 3: 커밋**

```bash
git add src/components/study/qa-card.tsx
git commit -m "refactor: QACard 태그 영역 모바일 반응형 줄바꿈"
```

---

### Task 10: 전체 빌드 검증 + 모바일 확인

**Files:** 전체

- [ ] **Step 1: lint + 빌드 확인**

```bash
pnpm lint
pnpm build
```

Expected: 에러 없이 성공

- [ ] **Step 2: 모바일 뷰포트(375px) 전체 페이지 확인**

각 페이지별 확인 항목:

- `/study`: 사이드바 Drawer, 헤더 반응형, QACard 태그 줄바꿈
- `/interviews`: 사이드바 Drawer, JD 카드 DropdownMenu
- `/interviews/questions`: QuestionTable DropdownMenu, CategoryManager 카드형
- `/interviews/jobs/[id]`: ImportModal DrawerDialog
- `/interviews/jobs/new`: JobForm 레이아웃 (이미 `max-w-lg`으로 양호)

- [ ] **Step 3: 데스크톱 뷰포트 기존 동작 확인**

모든 페이지에서 데스크톱 기존 레이아웃/동작이 깨지지 않았는지 확인

- [ ] **Step 4: 최종 커밋 (필요 시)**

lint:fix로 수정된 사항이 있으면 커밋:

```bash
pnpm lint:fix
pnpm format
# 변경된 파일을 개별 지정하여 add
git add src/
git commit -m "chore: lint/format 정리"
```
