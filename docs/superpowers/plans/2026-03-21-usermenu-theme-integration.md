# UserMenu + ThemeToggle 통합 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 누락된 UserMenu와 ThemeToggle을 사이드바 하단 아바타 드롭다운 하나로 통합하여, 데스크탑(펼침/접힘)/모바일 모든 뷰포트에서 접근 가능하게 한다.

**Architecture:** 기존 `user-menu.tsx`를 `variant` prop 기반으로 리팩토링하고, 테마 segmented control을 드롭다운 내부에 통합. `app-sidebar.tsx`와 `mobile-header.tsx`에 배치 후, 독립 `theme-toggle.tsx`를 삭제.

**Tech Stack:** Next.js 16 App Router, React 19, Auth.js v5 (`useSession`), Zustand (`useThemeStore`), shadcn/ui DropdownMenu (base-ui), Tailwind CSS v4, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-21-usermenu-theme-integration-design.md`

---

## 파일 구조

| 파일                                       | 변경                 | 역할                                                        |
| ------------------------------------------ | -------------------- | ----------------------------------------------------------- |
| `src/components/shared/user-menu.tsx`      | 수정 (전면 리팩토링) | 3가지 variant 트리거 + 통합 드롭다운 (프로필/테마/로그아웃) |
| `src/components/shared/user-menu.test.tsx` | 생성                 | UserMenu 렌더링, 테마 변경, 로그아웃 테스트                 |
| `src/components/nav/app-sidebar.tsx`       | 수정                 | ThemeToggle 제거 → UserMenu 배치                            |
| `src/components/nav/mobile-header.tsx`     | 수정                 | UserMenu 배치 (`'use client'`는 이미 존재)                  |
| `src/components/shared/theme-toggle.tsx`   | 삭제                 | 독립 테마 토글 폐기                                         |

---

### Task 1: UserMenu 테스트 작성

**Files:**

- Create: `src/components/shared/user-menu.test.tsx`

- [ ] **Step 1: 테스트 파일 생성**

```tsx
// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (vi.hoisted 패턴) ---
const mockSession = vi.hoisted(() => ({
  data: {
    user: { name: 'Test User', email: 'test@example.com', image: 'https://example.com/avatar.jpg' },
    expires: '2099-01-01',
  },
  status: 'authenticated' as const,
}));

const mockSignOut = vi.hoisted(() => vi.fn());
const mockSetMode = vi.hoisted(() => vi.fn());

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
  signOut: mockSignOut,
}));

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: (
    selector: (s: { mode: string; resolvedTheme: string; setMode: typeof mockSetMode }) => unknown
  ) => selector({ mode: 'dark', resolvedTheme: 'dark', setMode: mockSetMode }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock DropdownMenu as simple divs for unit testing
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: React.ComponentPropsWithRef<'button'>) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
    ...props
  }: React.ComponentPropsWithRef<'div'> & { onClick?: () => void }) => (
    <div role="menuitem" onClick={onClick} {...props}>
      {children}
    </div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { UserMenu } from './user-menu';

const DEFAULT_SESSION = {
  data: {
    user: { name: 'Test User', email: 'test@example.com', image: 'https://example.com/avatar.jpg' },
    expires: '2099-01-01',
  },
  status: 'authenticated' as const,
};

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.data = { ...DEFAULT_SESSION.data };
    mockSession.status = DEFAULT_SESSION.status;
  });

  it('expanded variant: 아바타, 이름, 이메일 표시', () => {
    render(<UserMenu variant="expanded" />);
    expect(screen.getByAltText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('collapsed variant: 아바타만 표시, 이름/이메일 숨김', () => {
    render(<UserMenu variant="collapsed" />);
    expect(screen.getByAltText('Test User')).toBeInTheDocument();
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('mobile variant: 아바타만 표시', () => {
    render(<UserMenu variant="mobile" />);
    expect(screen.getByLabelText('사용자 메뉴')).toBeInTheDocument();
  });

  it('테마 segmented control 클릭 시 setMode 호출', () => {
    render(<UserMenu variant="expanded" />);
    fireEvent.click(screen.getByText('라이트'));
    expect(mockSetMode).toHaveBeenCalledWith('light');
  });

  it('로그아웃 클릭 시 signOut 호출', () => {
    render(<UserMenu variant="expanded" />);
    fireEvent.click(screen.getByText('로그아웃'));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
  });

  it('세션 없으면 렌더링하지 않음', () => {
    mockSession.data = null as never;
    mockSession.status = 'unauthenticated' as const;
    const { container } = render(<UserMenu variant="expanded" />);
    expect(container.innerHTML).toBe('');
  });

  it('로딩 상태에서 skeleton placeholder 표시', () => {
    mockSession.status = 'loading' as const;
    render(<UserMenu variant="expanded" />);
    expect(screen.getByTestId('user-menu-skeleton')).toBeInTheDocument();
  });

  it('프로필 이미지 로드 실패 시 이니셜 fallback 표시', () => {
    render(<UserMenu variant="expanded" />);
    const img = screen.getByAltText('Test User');
    fireEvent.error(img);
    expect(screen.queryByAltText('Test User')).not.toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm test src/components/shared/user-menu.test.tsx`
Expected: FAIL — `UserMenu`이 `variant` prop을 받지 않고, 테마 segmented control이 없으므로 대부분 실패

---

### Task 2: UserMenu 리팩토링

**Files:**

- Modify: `src/components/shared/user-menu.tsx`

- [ ] **Step 3: user-menu.tsx 전면 리팩토링**

```tsx
'use client';

import { useState } from 'react';
import { LogOut, Moon, Monitor, Sun, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/theme-store';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
];

interface UserMenuProps {
  variant: 'expanded' | 'collapsed' | 'mobile';
}

function UserAvatar({
  src,
  name,
  size,
}: {
  src?: string | null;
  name?: string | null;
  size: 'sm' | 'md';
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === 'sm' ? 'size-7' : 'size-8';
  const initial = name?.charAt(0).toUpperCase();

  if (src && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? '사용자'}
        className={cn(sizeClass, 'rounded-full object-cover')}
        onError={() => setImgError(true)}
      />
    );
  }

  if (initial) {
    return (
      <div
        className={cn(
          sizeClass,
          'bg-iv-accent flex items-center justify-center rounded-full text-xs font-semibold text-white'
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        'text-iv-text2 bg-iv-bg3 flex items-center justify-center rounded-full'
      )}
    >
      <User className="size-3.5" />
    </div>
  );
}

export function UserMenu({ variant }: UserMenuProps) {
  const { data: session, status } = useSession();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  if (status === 'loading') {
    const skeletonSize = variant === 'mobile' ? 'size-7' : 'size-8';
    return (
      <div
        data-testid="user-menu-skeleton"
        className={cn(skeletonSize, 'bg-iv-bg3 animate-pulse rounded-full')}
      />
    );
  }

  if (status === 'unauthenticated' || !session?.user) {
    return null;
  }

  const { user } = session;
  const avatarSize = variant === 'mobile' ? 'sm' : 'md';
  const dropdownSide = variant === 'mobile' ? 'bottom' : 'right';
  const dropdownSideOffset = variant === 'mobile' ? 4 : 8;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2 rounded-lg transition-colors outline-none',
          variant === 'expanded'
            ? 'hover:bg-iv-bg3 w-full p-2'
            : 'hover:bg-iv-bg3 rounded-full p-0.5'
        )}
        aria-label="사용자 메뉴"
      >
        <UserAvatar src={user.image} name={user.name} size={avatarSize} />
        {variant === 'expanded' && (
          <div className="min-w-0 flex-1 text-left">
            {user.name && (
              <div className="text-iv-text truncate text-sm font-medium">{user.name}</div>
            )}
            {user.email && <div className="text-iv-text2 truncate text-xs">{user.email}</div>}
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={dropdownSide as 'bottom' | 'right'}
        align="end"
        sideOffset={dropdownSideOffset}
        className="w-auto min-w-[220px]"
      >
        {/* Profile Section */}
        <div className="px-2 py-1.5">
          <div className="flex flex-col gap-0.5">
            {user.name && <span className="truncate text-sm font-medium">{user.name}</span>}
            {user.email && <span className="text-iv-text2 truncate text-xs">{user.email}</span>}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Theme Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>테마</DropdownMenuLabel>
          <div
            className="bg-iv-bg2 mx-1.5 mb-1 flex gap-0.5 rounded-lg p-0.5"
            role="radiogroup"
            aria-label="테마 선택"
          >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMode(value);
                }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                  mode === value
                    ? 'bg-iv-bg text-iv-text shadow-sm'
                    : 'text-iv-text2 hover:text-iv-text'
                )}
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 size-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm test src/components/shared/user-menu.test.tsx`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/shared/user-menu.tsx src/components/shared/user-menu.test.tsx
git commit -m "feat: UserMenu에 테마 segmented control 통합 + variant prop 추가"
```

---

### Task 3: AppSidebar에 UserMenu 배치 + ThemeToggle 제거

**Files:**

- Modify: `src/components/nav/app-sidebar.tsx`

- [ ] **Step 6: app-sidebar.tsx 수정**

변경 내용:

1. `ThemeToggle` import 제거
2. `UserMenu` import 추가
3. 하단 영역을 `ThemeToggle` → `UserMenu`로 교체

```diff
- import { ThemeToggle } from '@/components/shared/theme-toggle';
+ import { UserMenu } from '@/components/shared/user-menu';
```

하단 섹션 교체 (`{/* Bottom: Settings + Theme */}` 부분):

```tsx
{
  /* Bottom: Settings + User */
}
<div className="border-iv-border border-t p-2">
  <SidebarNavItem item={settingsItem} isCollapsed={isCollapsed} />
  <div className="mt-1">
    <UserMenu variant={isCollapsed ? 'collapsed' : 'expanded'} />
  </div>
</div>;
```

- [ ] **Step 7: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공 (ThemeToggle import 제거로 warning 없음)

- [ ] **Step 8: 커밋**

```bash
git add src/components/nav/app-sidebar.tsx
git commit -m "refactor: AppSidebar ThemeToggle → UserMenu 교체"
```

---

### Task 4: MobileHeader에 UserMenu 배치

**Files:**

- Modify: `src/components/nav/mobile-header.tsx`

- [ ] **Step 9: mobile-header.tsx 수정**

변경 내용:

1. `'use client'` 디렉티브가 이미 있으므로 확인만 (실제 파일에는 이미 있음 — 스펙 리뷰 이슈 8은 실제로는 이미 존재)
2. `UserMenu` import 추가
3. 우측 영역에 `UserMenu variant="mobile"` 배치

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { UserMenu } from '@/components/shared/user-menu';
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
      <div className="flex items-center gap-2">
        {actions}
        <UserMenu variant="mobile" />
      </div>
    </header>
  );
}
```

- [ ] **Step 10: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 11: 커밋**

```bash
git add src/components/nav/mobile-header.tsx
git commit -m "feat: MobileHeader에 UserMenu 아바타 추가"
```

---

### Task 5: theme-toggle.tsx 삭제 + 정리

**Files:**

- Delete: `src/components/shared/theme-toggle.tsx`

- [ ] **Step 12: ThemeToggle import 잔여 확인**

Run: `grep -r "theme-toggle\|ThemeToggle" src/ --include="*.tsx" --include="*.ts"`
Expected: `app-sidebar.tsx`에서 이미 제거됨. 다른 파일에 잔여 없음 확인.

- [ ] **Step 13: theme-toggle.tsx 삭제**

```bash
rm src/components/shared/theme-toggle.tsx
```

- [ ] **Step 14: 전체 테스트 + 빌드 확인**

Run: `pnpm test && pnpm build`
Expected: 전체 테스트 PASS, 빌드 성공

- [ ] **Step 15: 커밋**

```bash
git add src/components/shared/theme-toggle.tsx
git commit -m "chore: 독립 ThemeToggle 컴포넌트 삭제 (UserMenu로 통합)"
```

---

### Task 6: 린트 + 최종 검증

- [ ] **Step 16: 린트 검사**

Run: `pnpm lint`
Expected: 에러 없음. 있으면 `pnpm lint:fix`로 수정.

- [ ] **Step 17: 포매팅 검사**

Run: `pnpm format:check`
Expected: 포매팅 이슈 없음. 있으면 `pnpm format`으로 수정.

- [ ] **Step 18: 최종 빌드 + 전체 테스트**

Run: `pnpm build && pnpm test`
Expected: 빌드 성공, 전체 테스트 PASS

- [ ] **Step 19: 최종 커밋 (린트/포매팅 수정 있는 경우)**

```bash
git add -A
git commit -m "chore: lint/format 수정"
```

---

## 검증 체크리스트

구현 완료 후 `docs/agent_docs/verification-checklist.md` 참조하여:

- [ ] 데스크탑 펼침: 사이드바 하단에 아바타+이름+이메일 카드 → 클릭 시 드롭다운 (프로필/테마/로그아웃)
- [ ] 데스크탑 접힘: 아바타 아이콘만 → 클릭 시 동일 드롭다운
- [ ] 모바일: MobileHeader 우측 아바타 → 클릭 시 동일 드롭다운
- [ ] 테마 변경: segmented control 클릭 시 즉시 테마 전환, 드롭다운 열린 상태 유지
- [ ] 로그아웃: 클릭 시 /login으로 리다이렉트
- [ ] 미인증 상태: UserMenu 미렌더링
- [ ] 프로필 이미지 없음: 이니셜 또는 User 아이콘 표시
