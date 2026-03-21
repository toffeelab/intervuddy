// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (vi.hoisted 패턴) ---
const mockSession = vi.hoisted(() => ({
  data: {
    user: {
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
    },
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
    user: {
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
    },
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
    // 트리거에 이름/이메일이 포함됨 (드롭다운 content에도 있으므로 getAllBy 사용)
    expect(screen.getAllByText('Test User').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('collapsed variant: 트리거에는 아바타만 표시, 이름/이메일 없음', () => {
    render(<UserMenu variant="collapsed" />);
    expect(screen.getByAltText('Test User')).toBeInTheDocument();
    // 트리거에는 이름/이메일이 없지만, 드롭다운 content에는 있음
    const trigger = screen.getByLabelText('사용자 메뉴');
    expect(trigger.querySelector('.text-iv-text')).toBeNull();
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
