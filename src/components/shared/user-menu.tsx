'use client';

import { useState } from 'react';
import { LogOut, Monitor, Moon, Sun, User } from 'lucide-react';
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
import type { ThemeMode } from '@/stores/theme-store';
import { useThemeStore } from '@/stores/theme-store';

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
  const dropdownSide: 'bottom' | 'right' = variant === 'mobile' ? 'bottom' : 'right';
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
        side={dropdownSide}
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
