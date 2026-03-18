// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TipBox } from './tip-box';

describe('TipBox', () => {
  it('팁 텍스트를 렌더링한다', () => {
    render(<TipBox tip="면접 팁 내용" />);
    expect(screen.getByText('면접 팁 내용')).toBeInTheDocument();
  });

  it('기본 type이 tip이면 💡 면접 팁 라벨을 표시한다', () => {
    render(<TipBox tip="내용" />);
    expect(screen.getByText('💡 면접 팁')).toBeInTheDocument();
  });

  it('type이 jd이면 📌 JD 연결 라벨을 표시한다', () => {
    render(<TipBox tip="JD 내용" type="jd" />);
    expect(screen.getByText('📌 JD 연결')).toBeInTheDocument();
  });
});
