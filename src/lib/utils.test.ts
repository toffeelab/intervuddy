import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('여러 클래스를 병합한다', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('충돌하는 Tailwind 클래스를 병합한다', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('falsy 값을 무시한다', () => {
    expect(cn('px-2', false && 'py-1', undefined, null, 'mt-2')).toBe('px-2 mt-2');
  });
});
