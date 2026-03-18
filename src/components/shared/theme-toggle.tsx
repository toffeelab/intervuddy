'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThemeStore } from '@/stores/theme-store';

const THEME_OPTIONS = [
  { value: 'light' as const, label: '라이트', icon: Sun },
  { value: 'dark' as const, label: '다크', icon: Moon },
  { value: 'system' as const, label: '시스템', icon: Monitor },
];

export function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useThemeStore();
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="sr-only">테마 변경</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setMode(value)}
            className={mode === value ? 'bg-accent' : ''}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
