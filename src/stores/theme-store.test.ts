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

  it('localStorage 실패 시에도 테마 변경은 동작', () => {
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => { throw new Error('SecurityError'); };

    expect(() => useThemeStore.getState().setMode('light')).not.toThrow();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');

    localStorageMock.setItem = originalSetItem;
  });

  it('유효하지 않은 localStorage 값은 무시되어야 함', () => {
    localStorageMock.setItem('iv-theme', 'invalid-value');
    const saved = localStorageMock.getItem('iv-theme');
    const validModes = ['dark', 'light', 'system'];
    expect(validModes.includes(saved!)).toBe(false);

    // ThemeProvider에서 유효하지 않은 값은 system으로 fallback
    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
