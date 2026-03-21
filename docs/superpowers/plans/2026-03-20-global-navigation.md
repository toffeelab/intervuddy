# 글로벌 네비게이션 & 앱 레이아웃 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 통합 사이드바 네비게이션 + 모바일 하단 탭 바를 갖춘 앱 셸 레이아웃 구현

**Architecture:** (app) Route Group으로 랜딩/앱 분리. 데스크톱은 접기/펼치기 가능한 사이드바, 모바일은 하단 탭 + "더보기" 드로어. 기존 study/interviews 내부 사이드바는 메인 콘텐츠 영역 안에서 유지.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui (Drawer, Tooltip), Zustand, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-19-global-navigation-design.md`

---

## File Structure

### 새로 생성

| 파일                                        | 역할                                        |
| ------------------------------------------- | ------------------------------------------- |
| `src/components/nav/nav-config.ts`          | 메뉴 정의 (라벨, 아이콘, 경로, 그룹)        |
| `src/stores/sidebar-store.ts`               | 사이드바 접힘 상태 (Zustand + localStorage) |
| `src/components/nav/sidebar-nav-item.tsx`   | 개별 메뉴 아이템 (활성 상태, 툴팁)          |
| `src/components/nav/sidebar-nav-group.tsx`  | 그룹 헤더 (라벨 or 구분선)                  |
| `src/components/nav/app-sidebar.tsx`        | 데스크톱 사이드바 통합                      |
| `src/components/nav/bottom-tab-bar.tsx`     | 모바일 하단 탭                              |
| `src/components/nav/mobile-menu-drawer.tsx` | 모바일 "더보기" 드로어                      |
| `src/components/nav/mobile-header.tsx`      | 모바일 상단 헤더                            |
| `src/components/nav/page-header.tsx`        | 범용 페이지 헤더                            |
| `src/app/(app)/layout.tsx`                  | 앱 셸 레이아웃                              |

### 이동 (Route Group 적용)

| 원본                  | 이동 후                     |
| --------------------- | --------------------------- |
| `src/app/study/`      | `src/app/(app)/study/`      |
| `src/app/interviews/` | `src/app/(app)/interviews/` |

### 수정

| 파일                                  | 변경 내용                                                            |
| ------------------------------------- | -------------------------------------------------------------------- |
| `src/app/(app)/study/page.tsx`        | InterviewHeader 제거, PageHeader 사용, grid에서 글로벌 사이드바 제외 |
| `src/app/(app)/interviews/layout.tsx` | 인라인 헤더 제거, SidebarNav + children만 유지                       |
| `src/components/study/sidebar.tsx`    | sticky top 값 조정 (57px → 0, 글로벌 헤더 없으므로)                  |

### 유지 (변경 없음)

| 파일                                        | 이유                                    |
| ------------------------------------------- | --------------------------------------- |
| `src/app/layout.tsx`                        | 루트 레이아웃 — ThemeProvider, 폰트만   |
| `src/app/page.tsx`                          | 랜딩 — (app) 밖, 글로벌 네비 적용 안 됨 |
| `src/components/interviews/sidebar-nav.tsx` | interviews 내부 서브 네비               |

---

## Task 1: shadcn Tooltip 설치

**Files:**

- Create: `src/components/ui/tooltip.tsx` (shadcn CLI가 생성)

- [ ] **Step 1: Tooltip 컴포넌트 설치**

```bash
pnpm dlx shadcn@latest add tooltip
```

- [ ] **Step 2: 설치 확인**

```bash
ls src/components/ui/tooltip.tsx
```

Expected: 파일 존재 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/ui/tooltip.tsx
git commit -m "chore: add shadcn tooltip component"
```

---

## Task 2: 네비게이션 설정 + 사이드바 스토어

**Files:**

- Create: `src/components/nav/nav-config.ts`
- Create: `src/stores/sidebar-store.ts`

- [ ] **Step 1: nav-config.ts 작성**

```typescript
// src/components/nav/nav-config.ts
import type { LucideIcon } from 'lucide-react';
import {
  FileUser,
  Briefcase,
  Sparkles,
  BookOpen,
  Mic,
  BarChart3,
  Building2,
  Calendar,
  Settings,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: 'prepare' | 'study' | 'manage';
  disabled?: boolean;
}

export interface NavGroup {
  key: 'prepare' | 'study' | 'manage';
  label: string;
}

export const navGroups: NavGroup[] = [
  { key: 'prepare', label: '준비' },
  { key: 'study', label: '학습' },
  { key: 'manage', label: '관리' },
];

export const navItems: NavItem[] = [
  { label: '이력서/포폴', href: '/resume', icon: FileUser, group: 'prepare', disabled: true },
  { label: '채용공고 관리', href: '/interviews', icon: Briefcase, group: 'prepare' },
  { label: '질문 생성', href: '/generate', icon: Sparkles, group: 'prepare', disabled: true },
  { label: 'Q&A 학습', href: '/study', icon: BookOpen, group: 'study' },
  { label: '모의면접', href: '/mock-interview', icon: Mic, group: 'study', disabled: true },
  { label: '대시보드', href: '/dashboard', icon: BarChart3, group: 'study', disabled: true },
  { label: '기업 리서치', href: '/companies', icon: Building2, group: 'manage', disabled: true },
  { label: '일정 관리', href: '/schedule', icon: Calendar, group: 'manage', disabled: true },
];

export const settingsItem: NavItem = {
  label: '설정',
  href: '/settings',
  icon: Settings,
  group: 'manage',
  disabled: true,
};

export const bottomTabItems: NavItem[] = [
  navItems.find((i) => i.href === '/resume')!,
  navItems.find((i) => i.href === '/study')!,
  navItems.find((i) => i.href === '/interviews')!,
  navItems.find((i) => i.href === '/mock-interview')!,
];
```

- [ ] **Step 2: sidebar-store.ts 작성**

```typescript
// src/stores/sidebar-store.ts
import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed:
    typeof window !== 'undefined' ? localStorage.getItem('iv-sidebar-collapsed') === 'true' : false,

  toggleCollapsed: () =>
    set((state) => {
      const next = !state.isCollapsed;
      localStorage.setItem('iv-sidebar-collapsed', String(next));
      return { isCollapsed: next };
    }),

  setCollapsed: (collapsed) => {
    localStorage.setItem('iv-sidebar-collapsed', String(collapsed));
    set({ isCollapsed: collapsed });
  },
}));
```

- [ ] **Step 3: 린트 확인**

```bash
pnpm lint --no-error-on-unmatched-pattern
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/nav/nav-config.ts src/stores/sidebar-store.ts
git commit -m "feat: add navigation config and sidebar store"
```

---

## Task 3: SidebarNavItem + SidebarNavGroup 컴포넌트

**Files:**

- Create: `src/components/nav/sidebar-nav-item.tsx`
- Create: `src/components/nav/sidebar-nav-group.tsx`

- [ ] **Step 1: sidebar-nav-item.tsx 작성**

아이콘 + 라벨 + 활성 상태 + 접힘 시 툴팁을 처리하는 단일 메뉴 아이템.

```typescript
// src/components/nav/sidebar-nav-item.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NavItem } from './nav-config';

interface SidebarNavItemProps {
  item: NavItem;
  isCollapsed: boolean;
}

export function SidebarNavItem({ item, isCollapsed }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  const content = (
    <Link
      href={item.disabled ? '#' : item.href}
      aria-disabled={item.disabled}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
        isCollapsed && 'justify-center px-0',
        isActive
          ? 'bg-iv-accent/10 text-iv-accent font-medium'
          : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text',
        item.disabled && 'pointer-events-none opacity-40'
      )}
      onClick={item.disabled ? (e) => e.preventDefault() : undefined}
    >
      <Icon className="size-[18px] shrink-0" />
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
```

- [ ] **Step 2: sidebar-nav-group.tsx 작성**

펼친 상태에서는 그룹 라벨, 접힌 상태에서는 구분선을 보여줌.

```typescript
// src/components/nav/sidebar-nav-group.tsx
import { cn } from '@/lib/utils';
import type { NavGroup } from './nav-config';

interface SidebarNavGroupProps {
  group: NavGroup;
  isCollapsed: boolean;
  isFirst?: boolean;
}

export function SidebarNavGroup({ group, isCollapsed, isFirst }: SidebarNavGroupProps) {
  if (isCollapsed) {
    if (isFirst) return null;
    return <div className="border-iv-border mx-2 my-2 border-t" />;
  }

  return (
    <p
      className={cn(
        'text-iv-text3 px-2.5 pb-1.5 font-mono text-[10px] tracking-wider uppercase',
        isFirst ? 'pt-0' : 'pt-3'
      )}
    >
      {group.label}
    </p>
  );
}
```

- [ ] **Step 3: 린트 확인**

```bash
pnpm lint --no-error-on-unmatched-pattern
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/nav/sidebar-nav-item.tsx src/components/nav/sidebar-nav-group.tsx
git commit -m "feat: add SidebarNavItem and SidebarNavGroup components"
```

---

## Task 4: AppSidebar 컴포넌트

**Files:**

- Create: `src/components/nav/app-sidebar.tsx`

- [ ] **Step 1: app-sidebar.tsx 작성**

데스크톱 사이드바. 접기/펼치기, 그룹별 메뉴, 하단 설정. 모바일에서 숨김(`hidden md:flex`).

```typescript
// src/components/nav/app-sidebar.tsx
'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';
import { navGroups, navItems, settingsItem } from './nav-config';
import { SidebarNavGroup } from './sidebar-nav-group';
import { SidebarNavItem } from './sidebar-nav-item';

export function AppSidebar() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'border-iv-border bg-iv-bg2 hidden flex-col border-r transition-[width] duration-200 md:flex',
          isCollapsed ? 'w-[60px]' : 'w-[240px]'
        )}
      >
        {/* Logo + Toggle */}
        <div
          className={cn(
            'border-iv-border flex items-center border-b px-3 py-3',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-iv-accent flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white">
                IV
              </div>
              <span className="text-iv-text text-sm font-semibold">Intervuddy</span>
            </div>
          )}
          {isCollapsed && (
            <div className="bg-iv-accent flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white">
              IV
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 rounded-md p-1 transition-colors',
              isCollapsed && 'mt-2'
            )}
            aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navGroups.map((group, groupIdx) => {
            const groupItems = navItems.filter((item) => item.group === group.key);
            return (
              <div key={group.key}>
                <SidebarNavGroup
                  group={group}
                  isCollapsed={isCollapsed}
                  isFirst={groupIdx === 0}
                />
                {groupItems.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Bottom: Settings + Theme */}
        <div className="border-iv-border border-t p-2">
          <SidebarNavItem item={settingsItem} isCollapsed={isCollapsed} />
          {!isCollapsed && (
            <div className="mt-1 px-2.5">
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: 린트 확인**

```bash
pnpm lint --no-error-on-unmatched-pattern
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/nav/app-sidebar.tsx
git commit -m "feat: add AppSidebar with collapsible navigation"
```

---

## Task 5: 모바일 네비게이션 (BottomTabBar + MobileMenuDrawer + MobileHeader)

**Files:**

- Create: `src/components/nav/bottom-tab-bar.tsx`
- Create: `src/components/nav/mobile-menu-drawer.tsx`
- Create: `src/components/nav/mobile-header.tsx`

- [ ] **Step 1: bottom-tab-bar.tsx 작성**

```typescript
// src/components/nav/bottom-tab-bar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { bottomTabItems } from './nav-config';
import { MobileMenuDrawer } from './mobile-menu-drawer';

export function BottomTabBar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="border-iv-border bg-iv-bg fixed inset-x-0 bottom-0 z-50 flex border-t md:hidden">
        {bottomTabItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              aria-disabled={item.disabled}
              onClick={item.disabled ? (e) => e.preventDefault() : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
                isActive ? 'text-iv-accent' : 'text-iv-text3',
                item.disabled && 'opacity-40'
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* 더보기 버튼 */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-iv-text3 flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]"
        >
          <Menu className="size-5" />
          <span>더보기</span>
        </button>
      </nav>

      <MobileMenuDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
```

- [ ] **Step 2: mobile-menu-drawer.tsx 작성**

```typescript
// src/components/nav/mobile-menu-drawer.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { navGroups, navItems, settingsItem } from './nav-config';

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuDrawer({ open, onOpenChange }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const allItems = [...navItems, settingsItem];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>전체 메뉴</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          {navGroups.map((group) => {
            const groupItems = allItems.filter((item) => item.group === group.key);
            return (
              <div key={group.key} className="mb-4">
                <p className="text-iv-text3 mb-2 font-mono text-[10px] tracking-wider uppercase">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {groupItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + '/');
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.disabled ? '#' : item.href}
                        aria-disabled={item.disabled}
                        onClick={(e) => {
                          if (item.disabled) {
                            e.preventDefault();
                            return;
                          }
                          onOpenChange(false);
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-lg p-3 text-sm transition-colors',
                          isActive
                            ? 'bg-iv-accent/10 text-iv-accent font-medium'
                            : 'bg-iv-bg2 text-iv-text2',
                          item.disabled && 'pointer-events-none opacity-40'
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 3: mobile-header.tsx 작성**

```typescript
// src/components/nav/mobile-header.tsx
'use client';

import { usePathname } from 'next/navigation';
import { navItems, settingsItem } from './nav-config';

function getPageTitle(pathname: string): string {
  const allItems = [...navItems, settingsItem];
  const match = allItems.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  return match?.label ?? 'Intervuddy';
}

interface MobileHeaderProps {
  actions?: React.ReactNode;
}

export function MobileHeader({ actions }: MobileHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="border-iv-border bg-iv-bg/80 sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <div className="bg-iv-accent flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold text-white">
          IV
        </div>
        <h1 className="text-iv-text text-sm font-semibold">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
```

- [ ] **Step 4: 린트 확인**

```bash
pnpm lint --no-error-on-unmatched-pattern
```

- [ ] **Step 5: 커밋**

```bash
git add src/components/nav/bottom-tab-bar.tsx src/components/nav/mobile-menu-drawer.tsx src/components/nav/mobile-header.tsx
git commit -m "feat: add mobile navigation (BottomTabBar, MobileMenuDrawer, MobileHeader)"
```

---

## Task 6: PageHeader 컴포넌트

**Files:**

- Create: `src/components/nav/page-header.tsx`

- [ ] **Step 1: page-header.tsx 작성**

InterviewHeader를 대체하는 범용 페이지 헤더. 데스크톱에서만 표시(`hidden md:flex`).

```typescript
// src/components/nav/page-header.tsx
import { cn } from '@/lib/utils';

interface PageHeaderBadge {
  label: string;
  variant?: 'default' | 'accent' | 'muted';
}

interface PageHeaderProps {
  title: string;
  badges?: PageHeaderBadge[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const badgeStyles: Record<string, string> = {
  default: 'bg-iv-bg3 text-iv-text2',
  accent: 'bg-iv-accent/12 text-iv-accent border-iv-accent/25 border',
  muted: 'bg-iv-jd/12 text-iv-jd border-iv-jd/25 border',
};

export function PageHeader({ title, badges, actions, children }: PageHeaderProps) {
  return (
    <header className="border-iv-border bg-iv-bg/80 sticky top-0 z-30 hidden border-b px-6 py-3 backdrop-blur-md md:block">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-iv-text text-base font-semibold">{title}</h1>
          {badges?.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px]',
                badgeStyles[badge.variant ?? 'default']
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
```

- [ ] **Step 2: 린트 확인**

```bash
pnpm lint --no-error-on-unmatched-pattern
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/nav/page-header.tsx
git commit -m "feat: add PageHeader component"
```

---

## Task 7: Route Group 이동 + (app)/layout.tsx 생성

이 태스크는 파일 이동과 앱 셸 레이아웃 생성을 한번에 처리합니다. 중간 상태에서 빌드가 깨지지 않도록 한 커밋으로.

**Files:**

- Move: `src/app/study/` → `src/app/(app)/study/`
- Move: `src/app/interviews/` → `src/app/(app)/interviews/`
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: (app) 디렉토리 생성 및 파일 이동**

```bash
mkdir -p src/app/\(app\)
mv src/app/study src/app/\(app\)/study
mv src/app/interviews src/app/\(app\)/interviews
```

- [ ] **Step 2: (app)/layout.tsx 작성**

```typescript
// src/app/(app)/layout.tsx
import { AppSidebar } from '@/components/nav/app-sidebar';
import { BottomTabBar } from '@/components/nav/bottom-tab-bar';
import { MobileHeader } from '@/components/nav/mobile-header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-iv-bg text-iv-text flex min-h-screen">
      {/* Desktop Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col pb-14 md:pb-0">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile Bottom Tab */}
      <BottomTabBar />
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공. /study, /interviews 라우팅이 정상 동작.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: create (app) route group with AppLayout shell"
```

---

## Task 8: study 페이지 통합 — InterviewHeader 제거, PageHeader 적용

**Files:**

- Modify: `src/app/(app)/study/page.tsx`
- Modify: `src/components/study/sidebar.tsx`

- [ ] **Step 1: study/page.tsx 수정**

InterviewHeader를 제거하고, PageHeader + study 전용 액션(전체 펼치기/접기)을 적용. 기존 grid 레이아웃에서 글로벌 사이드바가 빠졌으므로 독립적인 내부 레이아웃으로 변경.

수정 후 전체 파일:

```typescript
// src/app/(app)/study/page.tsx
import { StudyPageHeader } from '@/components/study/study-page-header';
import { QAList } from '@/components/study/qa-list';
import { SearchInput } from '@/components/study/search-input';
import { Sidebar } from '@/components/study/sidebar';
import { getLibraryQuestions, getGlobalCategories, getAllJobs } from '@/data-access';
import { getCategoriesByJdId } from '@/data-access/categories';
import { getQuestionsByJdId } from '@/data-access/questions';

interface StudyPageProps {
  searchParams: Promise<{ jdId?: string }>;
}

export default async function StudyPage({ searchParams }: StudyPageProps) {
  const { jdId } = await searchParams;
  const jdIdNum = jdId ? Number(jdId) : null;

  const items =
    jdIdNum !== null && !Number.isNaN(jdIdNum)
      ? getQuestionsByJdId(jdIdNum)
      : getLibraryQuestions();

  const categories =
    jdIdNum !== null && !Number.isNaN(jdIdNum)
      ? getCategoriesByJdId(jdIdNum)
      : getGlobalCategories();

  const jobs = getAllJobs();
  const allItemIds = items.map((item) => item.id);

  return (
    <>
      <StudyPageHeader totalCount={items.length} allItemIds={allItemIds} />
      <div className="flex min-h-[calc(100vh-57px)] md:min-h-0 md:flex-1">
        <div className="hidden md:block">
          <Sidebar categories={categories} jobs={jobs} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <SearchInput />
          <QAList items={items} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: StudyPageHeader 컴포넌트 생성**

InterviewHeader의 기능(배지, 전체 펼치기)을 PageHeader를 감싸는 래퍼로 구현.

```typescript
// src/components/study/study-page-header.tsx
'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/nav/page-header';
import { useStudyStore } from '@/stores/study-store';

interface StudyPageHeaderProps {
  totalCount: number;
  allItemIds: number[];
}

export function StudyPageHeader({ totalCount, allItemIds }: StudyPageHeaderProps) {
  const allExpanded = useStudyStore((s) => s.allExpanded);
  const toggleAll = useStudyStore((s) => s.toggleAll);

  return (
    <PageHeader
      title="Q&A 학습"
      badges={[
        { label: '📌 JD 맞춤 질문 포함', variant: 'muted' },
        { label: `총 ${totalCount}문항`, variant: 'accent' },
      ]}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleAll(allItemIds)}
          className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 h-7 px-2.5 text-[11px]"
        >
          {allExpanded ? '전체 접기' : '전체 펼치기'}
        </Button>
      }
    />
  );
}
```

- [ ] **Step 3: study sidebar.tsx sticky 값 조정**

글로벌 사이드바와 별개로 동작하므로 sticky top 값 조정이 필요. `top-[57px]`을 `top-0`으로, `h-[calc(100vh-57px)]`을 `h-screen`으로 변경 (PageHeader가 sticky이므로 그 아래에서 작동).

`src/components/study/sidebar.tsx` 63번째 줄 수정:

```
// 변경 전:
<ScrollArea className="sticky top-[57px] h-[calc(100vh-57px)]">

// 변경 후:
<ScrollArea className="h-full">
```

aside도 height 지정 필요:

```
// 변경 전:
<aside className="border-iv-border bg-iv-bg2 border-r">

// 변경 후:
<aside className="border-iv-border bg-iv-bg2 sticky top-0 h-[calc(100vh-57px)] border-r">
```

참고: 57px은 PageHeader의 높이. 모바일에서는 `hidden md:block`으로 안 보이므로 문제 없음.

- [ ] **Step 4: 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add src/app/\(app\)/study/page.tsx src/components/study/study-page-header.tsx src/components/study/sidebar.tsx
git commit -m "refactor: replace InterviewHeader with PageHeader in study page"
```

---

## Task 9: interviews 레이아웃 통합 — 인라인 헤더 제거

**Files:**

- Modify: `src/app/(app)/interviews/layout.tsx`

- [ ] **Step 1: interviews/layout.tsx 수정**

인라인 헤더(뒤로가기 + "면접 관리" 제목)를 제거. 앱 셸 사이드바가 네비게이션을 담당하므로 SidebarNav + children 구조만 유지.

수정 후 전체 파일:

```typescript
// src/app/(app)/interviews/layout.tsx
import { SidebarNav } from '@/components/interviews/sidebar-nav';

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Desktop Sub-Nav */}
      <div className="hidden md:block">
        <SidebarNav />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

참고: SidebarNav는 데스크톱에서만 보이고 (`hidden md:block`), 모바일에서는 숨김. 모바일에서 interviews 내 서브 페이지 이동은 각 페이지의 링크/탭으로 처리.

- [ ] **Step 2: 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add src/app/\(app\)/interviews/layout.tsx
git commit -m "refactor: remove inline header from interviews layout"
```

---

## Task 10: study layout 정리 + 사용하지 않는 코드 제거

**Files:**

- Modify: `src/app/(app)/study/layout.tsx` — 패스스루 유지 확인
- Delete (검토): `src/components/study/interview-header.tsx` — 더 이상 사용 안 됨

- [ ] **Step 1: InterviewHeader 사용처 검색**

```bash
pnpm exec grep -r "InterviewHeader\|interview-header" src/ --include="*.tsx" --include="*.ts"
```

Expected: study-page-header.tsx나 다른 파일에서 import가 없어야 함. 만약 있으면 먼저 제거.

- [ ] **Step 2: interview-header.tsx 제거**

```bash
rm src/components/study/interview-header.tsx
```

- [ ] **Step 3: 빌드 확인**

```bash
pnpm build
```

Expected: 빌드 성공 (InterviewHeader가 어디서도 import되지 않음)

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "refactor: remove unused InterviewHeader component"
```

---

## Task 11: 모바일 반응형 점검 + 하단 탭 여백

**Files:**

- 점검: `src/app/(app)/layout.tsx`의 `pb-14` (하단 탭 높이만큼 패딩)
- 점검: 모바일에서 study 카테고리 사이드바 접근 방식

- [ ] **Step 1: dev 서버 실행 및 모바일 뷰포트 점검**

```bash
pnpm dev
```

브라우저에서 확인할 항목:

1. **375px 모바일**: 하단 탭 바 표시, 콘텐츠가 탭에 가려지지 않는지
2. **768px 태블릿**: 사이드바 접힌 상태(60px)로 표시, 하단 탭 숨김
3. **1024px+ 데스크톱**: 사이드바 펼치기/접기 토글 동작, 하단 탭 숨김
4. **/ (랜딩)**: 사이드바/탭 바 없이 기존처럼 표시
5. **/study**: Q&A 카드, 카테고리 사이드바 정상
6. **/interviews**: 서브 네비 + 목록 정상

- [ ] **Step 2: 발견된 이슈 수정**

발견된 이슈가 있으면 수정. 없으면 스킵.

- [ ] **Step 3: 커밋 (수정사항이 있는 경우)**

```bash
git add -A
git commit -m "fix: mobile responsive adjustments for global navigation"
```

---

## Task 12: 최종 린트 + 빌드 검증

- [ ] **Step 1: 린트 검사**

```bash
pnpm lint
```

Expected: 에러 없음

- [ ] **Step 2: 포매팅 검사**

```bash
pnpm format:check
```

에러 발생 시:

```bash
pnpm format
```

- [ ] **Step 3: 전체 빌드**

```bash
pnpm build
```

Expected: 빌드 성공

- [ ] **Step 4: 최종 커밋 (포매팅 수정 시)**

```bash
git add -A
git commit -m "chore: lint and format fixes"
```
