// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InlineEdit } from './inline-edit';

vi.mock('@/components/ui/textarea', () => ({
  Textarea: vi.fn((props: React.ComponentPropsWithRef<'textarea'>) => <textarea {...props} />),
}));

vi.mock('@/components/ui/input', () => ({
  Input: vi.fn((props: React.ComponentPropsWithRef<'input'>) => <input {...props} />),
}));

// cn() uses clsx + tailwind-merge. A lightweight stub is sufficient for tests.
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayButton() {
  return screen.getByRole('button');
}

function getTextarea() {
  return screen.getByRole('textbox') as HTMLTextAreaElement;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('InlineEdit', () => {
  let onSave: (newValue: string) => Promise<void>;

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // 1. Display mode
  // -------------------------------------------------------------------------
  describe('display mode', () => {
    it('value 텍스트를 렌더링한다', () => {
      render(<InlineEdit value="초기 텍스트" onSave={onSave} />);
      expect(screen.getByText('초기 텍스트')).toBeInTheDocument();
    });

    it('value가 비어 있으면 placeholder를 표시한다', () => {
      render(<InlineEdit value="" onSave={onSave} placeholder="내용을 입력하세요" />);
      expect(screen.getByText('내용을 입력하세요')).toBeInTheDocument();
    });

    it('placeholder 기본값은 "클릭하여 편집..."이다', () => {
      render(<InlineEdit value="" onSave={onSave} />);
      expect(screen.getByText('클릭하여 편집...')).toBeInTheDocument();
    });

    it('편집 중에는 입력 요소가 보이고 display button은 사라진다', async () => {
      render(<InlineEdit value="텍스트" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(getTextarea()).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Click to edit
  // -------------------------------------------------------------------------
  describe('클릭하여 편집 진입', () => {
    it('클릭하면 편집 모드로 전환된다', async () => {
      render(<InlineEdit value="텍스트" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      expect(getTextarea()).toBeInTheDocument();
    });

    it('편집 모드 진입 시 textarea에 현재 value가 채워진다', async () => {
      render(<InlineEdit value="기존 내용" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      expect(getTextarea().value).toBe('기존 내용');
    });

    it('multiline=false이면 input 요소로 전환된다', async () => {
      render(<InlineEdit value="한 줄" onSave={onSave} multiline={false} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      expect(getTextarea()).toBeInTheDocument(); // input도 role="textbox"
    });
  });

  // -------------------------------------------------------------------------
  // 3. Disabled
  // -------------------------------------------------------------------------
  describe('disabled 상태', () => {
    it('disabled일 때 클릭해도 편집 모드로 진입하지 않는다', async () => {
      render(<InlineEdit value="텍스트" onSave={onSave} disabled />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('disabled일 때 Enter 키를 눌러도 편집 모드로 진입하지 않는다', async () => {
      render(<InlineEdit value="텍스트" onSave={onSave} disabled />);
      await act(async () => {
        fireEvent.keyDown(getDisplayButton(), { key: 'Enter' });
      });
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Save on blur / Ctrl+Enter
  // -------------------------------------------------------------------------
  describe('저장 — blur / Ctrl+Enter', () => {
    it('blur 시 onSave가 trimmed 값으로 호출된다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '  수정된 내용  ' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('수정된 내용');
      });
    });

    it('Ctrl+Enter로 저장하면 onSave가 호출된다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '새 값' } });
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      });
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('새 값');
      });
    });

    it('Meta+Enter로 저장하면 onSave가 호출된다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '새 값' } });
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
      });
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('새 값');
      });
    });

    it('저장 성공 후 편집 모드가 종료된다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '변경값' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // 5. Cancel on Escape
  // -------------------------------------------------------------------------
  describe('Escape로 취소', () => {
    it('Escape 키를 누르면 편집 모드가 종료된다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '수정 중' } });
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Escape' });
      });
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('Escape 취소 후 onSave는 호출되지 않는다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '수정 중' } });
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Escape' });
      });
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 6. No-op save (value unchanged)
  // -------------------------------------------------------------------------
  describe('값이 변경되지 않은 경우', () => {
    it('값이 동일하면 onSave가 호출되지 않고 편집 모드가 종료된다', async () => {
      render(<InlineEdit value="동일한 값" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      // value를 그대로 두고 blur
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('공백만 추가한 경우(trim 후 동일)에도 onSave가 호출되지 않는다', async () => {
      render(<InlineEdit value="동일한 값" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '  동일한 값  ' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 7. Empty value save
  // -------------------------------------------------------------------------
  describe('빈 값으로 저장 시도', () => {
    it('값을 비우면 onSave가 호출되지 않고 원본으로 복원된다', async () => {
      render(<InlineEdit value="원본 텍스트" onSave={onSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '   ' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
      expect(onSave).not.toHaveBeenCalled();
      // display 모드로 돌아온 뒤 원본 텍스트가 표시돼야 한다
      expect(screen.getByText('원본 텍스트')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 8. Error handling
  // -------------------------------------------------------------------------
  describe('오류 처리', () => {
    it('onSave가 throw하면 편집 모드가 유지된다', async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error('서버 오류'));
      render(<InlineEdit value="원본" onSave={failingSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '실패할 값' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('onSave가 throw하면 오류 메시지 "저장에 실패했습니다"가 표시된다', async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error('서버 오류'));
      render(<InlineEdit value="원본" onSave={failingSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '실패할 값' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(screen.getByText('저장에 실패했습니다')).toBeInTheDocument();
      });
    });

    it('오류 후 Escape로 취소하면 편집 모드가 종료된다', async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error('오류'));
      render(<InlineEdit value="원본" onSave={failingSave} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '실패할 값' } });
      await act(async () => {
        fireEvent.blur(textarea);
      });
      await waitFor(() => {
        expect(screen.getByText('저장에 실패했습니다')).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
      });
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 9. Single-line Enter
  // -------------------------------------------------------------------------
  describe('single-line 모드에서 Enter로 저장', () => {
    it('multiline=false일 때 Enter 키가 onSave를 호출한다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} multiline={false} />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const input = getTextarea(); // input[type=text]도 role="textbox"
      fireEvent.change(input, { target: { value: '새 값' } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('새 값');
      });
    });

    it('multiline=true(기본값)일 때 Enter 단독은 onSave를 호출하지 않는다', async () => {
      render(<InlineEdit value="원본" onSave={onSave} multiline />);
      await act(async () => {
        fireEvent.click(getDisplayButton());
      });
      const textarea = getTextarea();
      fireEvent.change(textarea, { target: { value: '새 값' } });
      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter' });
      });
      // 짧게 대기해도 onSave가 호출되지 않아야 한다
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 10. Keyboard accessibility on display button
  // -------------------------------------------------------------------------
  describe('display button 키보드 접근성', () => {
    it('Enter 키로 편집 모드에 진입한다', async () => {
      render(<InlineEdit value="텍스트" onSave={onSave} />);
      await act(async () => {
        fireEvent.keyDown(getDisplayButton(), { key: 'Enter' });
      });
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('Space 키로 편집 모드에 진입한다', async () => {
      render(<InlineEdit value="텍스트" onSave={onSave} />);
      await act(async () => {
        fireEvent.keyDown(getDisplayButton(), { key: ' ' });
      });
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('display button의 tabIndex는 0이다 (포커스 가능)', () => {
      render(<InlineEdit value="텍스트" onSave={onSave} />);
      expect(getDisplayButton()).toHaveAttribute('tabindex', '0');
    });

    it('disabled일 때 tabIndex는 -1이다 (포커스 불가)', () => {
      render(<InlineEdit value="텍스트" onSave={onSave} disabled />);
      expect(getDisplayButton()).toHaveAttribute('tabindex', '-1');
    });
  });
});
