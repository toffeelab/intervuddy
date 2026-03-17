'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setMode = useThemeStore((s) => s.setMode);

  useEffect(() => {
    const saved = localStorage.getItem('iv-theme') as 'dark' | 'light' | 'system' | null;
    if (saved) {
      setMode(saved);
    } else {
      setMode('system');
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (useThemeStore.getState().mode === 'system') {
        setMode('system');
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [setMode]);

  return <>{children}</>;
}
