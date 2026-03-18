// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TipBox } from './tip-box';

describe('TipBox', () => {
  it('팁 텍스트를 렌더링한다', () => {
    render(<TipBox tip="면접 팁 내용" />);
    expect(screen.getByText('면접 팁 내용')).toBeInTheDocument();
  });

  it('💡 면접 팁 라벨을 표시한다', () => {
    render(<TipBox tip="내용" />);
    expect(screen.getByText('💡 면접 팁')).toBeInTheDocument();
  });
});
