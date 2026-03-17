import { create } from 'zustand';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setMode: (mode: ThemeMode) => void;
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function persistMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('iv-theme', mode);
  document.cookie = `iv-theme=${mode};path=/;max-age=31536000;SameSite=Lax`;
}

function applyTheme(resolved: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  html.classList.add(resolved);
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'system',
  resolvedTheme: 'dark',
  setMode: (mode) => {
    const resolvedTheme = resolveTheme(mode);
    persistMode(mode);
    applyTheme(resolvedTheme);
    set({ mode, resolvedTheme });
  },
}));
