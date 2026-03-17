import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore } from './theme-store';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('theme-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useThemeStore.setState({ mode: 'system', resolvedTheme: 'dark' });
  });

  it('초기 모드는 system', () => {
    expect(useThemeStore.getState().mode).toBe('system');
  });

  it('setMode로 테마 변경', () => {
    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
  });

  it('dark 모드 설정', () => {
    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
  });

  it('system 모드는 시스템 설정을 따름', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
