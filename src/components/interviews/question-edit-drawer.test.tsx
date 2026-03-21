// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createFollowupAction,
  updateFollowupAction,
  deleteFollowupAction,
} from '@/actions/followup-actions';
import { updateQuestionAction, updateQuestionKeywordsAction } from '@/actions/question-actions';
import type { InterviewQuestion, InterviewCategory } from '@/data-access/types';
import { useEditStore } from '@/stores/edit-store';
import { QuestionEditDrawer } from './question-edit-drawer';

// Mock all server actions
vi.mock('@/actions/question-actions', () => ({
  updateQuestionAction: vi.fn(),
  updateQuestionKeywordsAction: vi.fn(),
}));
vi.mock('@/actions/followup-actions', () => ({
  createFollowupAction: vi.fn(),
  updateFollowupAction: vi.fn(),
  deleteFollowupAction: vi.fn(),
}));

// Mock the Zustand store
vi.mock('@/stores/edit-store', () => ({
  useEditStore: vi.fn(),
}));

// Mock shadcn drawer components
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock shadcn UI components
vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, ...props }: React.ComponentPropsWithRef<'button'>) => (
    <button {...props}>{children}</button>
  )),
}));
vi.mock('@/components/ui/input', () => ({
  Input: vi.fn((props: React.ComponentPropsWithRef<'input'>) => <input {...props} />),
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: vi.fn((props: React.ComponentPropsWithRef<'textarea'>) => <textarea {...props} />),
}));

// ────────────────────────────────────────────────────────────────────────────
// Test data
// ────────────────────────────────────────────────────────────────────────────

const mockQuestion: InterviewQuestion = {
  id: 'question-uuid-1',
  categoryId: 1,
  categoryName: '자기소개',
  categorySlug: 'self-intro',
  categoryDisplayLabel: '자기소개',
  jdId: null,
  originQuestionId: null,
  question: '자기소개를 해주세요',
  answer: '저는 5년차 개발자입니다',
  tip: '구체적 수치를 포함하세요',
  displayOrder: 1,
  keywords: ['자기소개', '경력'],
  followups: [
    {
      id: 'followup-uuid-1',
      questionId: 'question-uuid-1',
      question: '가장 어려웠던 프로젝트는?',
      answer: '실시간 통신 시스템 구축',
      displayOrder: 1,
      deletedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ],
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCategories: InterviewCategory[] = [
  {
    id: 1,
    jdId: null,
    name: '자기소개',
    slug: 'self-intro',
    displayLabel: '자기소개',
    icon: '👤',
    displayOrder: 1,
    questionCount: 1,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    jdId: null,
    name: '기술',
    slug: 'tech',
    displayLabel: '기술',
    icon: '⚙️',
    displayOrder: 2,
    questionCount: 0,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const mockCloseDrawer = vi.fn();

function setupStore(overrides: { drawerTargetId?: string | null } = {}) {
  (useEditStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    drawerOpen: true,
    drawerTargetId:
      overrides.drawerTargetId !== undefined ? overrides.drawerTargetId : 'question-uuid-1',
    closeDrawer: mockCloseDrawer,
  });
}

/** Resolve all pending microtasks and state updates. */
async function flushAsync() {
  await waitFor(() => {}, { timeout: 100 });
}

function renderDrawer(questions: InterviewQuestion[] = [mockQuestion]) {
  return render(<QuestionEditDrawer questions={questions} categories={mockCategories} />);
}

/** Return the main question/answer/tip textareas by placeholder. */
function getQuestionTextarea() {
  return screen.getByPlaceholderText('면접 질문을 입력하세요');
}
function getAnswerTextarea() {
  return screen.getByPlaceholderText('답변을 입력하세요');
}

function getSaveButton() {
  return screen.getByRole('button', { name: /저장/ });
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('QuestionEditDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();

    // Default: server actions resolve successfully
    (updateQuestionAction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (updateQuestionKeywordsAction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (createFollowupAction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (updateFollowupAction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (deleteFollowupAction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  // ── 1. Empty question validation ─────────────────────────────────────────
  describe('질문 필드가 비어있을 때', () => {
    it('저장 시 에러 메시지를 표시하고 updateQuestionAction을 호출하지 않는다', async () => {
      renderDrawer();

      fireEvent.change(getQuestionTextarea(), { target: { value: '' } });

      fireEvent.click(getSaveButton());
      await flushAsync();

      expect(screen.getByText('질문과 답변은 필수 입력입니다')).toBeInTheDocument();
      expect(updateQuestionAction).not.toHaveBeenCalled();
    });

    it('공백만 입력된 질문도 빈 값으로 처리한다', async () => {
      renderDrawer();

      fireEvent.change(getQuestionTextarea(), { target: { value: '   ' } });

      fireEvent.click(getSaveButton());
      await flushAsync();

      expect(screen.getByText('질문과 답변은 필수 입력입니다')).toBeInTheDocument();
      expect(updateQuestionAction).not.toHaveBeenCalled();
    });
  });

  // ── 2. Empty answer validation ───────────────────────────────────────────
  describe('답변 필드가 비어있을 때', () => {
    it('저장 시 에러 메시지를 표시하고 updateQuestionAction을 호출하지 않는다', async () => {
      renderDrawer();

      fireEvent.change(getAnswerTextarea(), { target: { value: '' } });

      fireEvent.click(getSaveButton());
      await flushAsync();

      expect(screen.getByText('질문과 답변은 필수 입력입니다')).toBeInTheDocument();
      expect(updateQuestionAction).not.toHaveBeenCalled();
    });

    it('공백만 입력된 답변도 빈 값으로 처리한다', async () => {
      renderDrawer();

      fireEvent.change(getAnswerTextarea(), { target: { value: '  ' } });

      fireEvent.click(getSaveButton());
      await flushAsync();

      expect(screen.getByText('질문과 답변은 필수 입력입니다')).toBeInTheDocument();
      expect(updateQuestionAction).not.toHaveBeenCalled();
    });
  });

  // ── 3. Successful save ───────────────────────────────────────────────────
  describe('유효한 데이터로 저장할 때', () => {
    it('updateQuestionAction을 trim된 값으로 호출한다', async () => {
      renderDrawer();

      // Add trailing space to question to verify trimming
      fireEvent.change(getQuestionTextarea(), { target: { value: '  수정된 질문  ' } });
      fireEvent.change(getAnswerTextarea(), { target: { value: '  수정된 답변  ' } });

      fireEvent.click(getSaveButton());

      await waitFor(() => {
        expect(updateQuestionAction).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockQuestion.id,
            question: '수정된 질문',
            answer: '수정된 답변',
          })
        );
      });
    });

    it('저장 성공 후 closeDrawer를 호출한다', async () => {
      renderDrawer();

      fireEvent.click(getSaveButton());

      await waitFor(() => {
        expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
      });
    });

    it('저장 성공 후 에러 메시지가 없다', async () => {
      renderDrawer();

      fireEvent.click(getSaveButton());

      await waitFor(() => {
        expect(screen.queryByText('질문과 답변은 필수 입력입니다')).not.toBeInTheDocument();
        expect(
          screen.queryByText('저장에 실패했습니다. 다시 시도해주세요.')
        ).not.toBeInTheDocument();
      });
    });
  });

  // ── 4. Empty followups filtered ──────────────────────────────────────────
  describe('빈 꼬리 질문 필터링', () => {
    it('질문 또는 답변이 빈 꼬리 질문은 createFollowupAction에 전달되지 않는다', async () => {
      // Question with no pre-existing followups so we can test fresh adds
      const questionWithoutFollowups: InterviewQuestion = {
        ...mockQuestion,
        followups: [],
      };
      renderDrawer([questionWithoutFollowups]);

      // Click "꼬리 질문 추가" to add an empty followup slot
      const addButton = screen.getByRole('button', { name: /꼬리 질문 추가/ });
      fireEvent.click(addButton);

      // Leave the newly added followup blank and save
      fireEvent.click(getSaveButton());

      await waitFor(() => {
        expect(updateQuestionAction).toHaveBeenCalled();
      });

      expect(createFollowupAction).not.toHaveBeenCalled();
    });

    it('질문과 답변이 모두 채워진 꼬리 질문만 createFollowupAction에 전달된다', async () => {
      const questionWithoutFollowups: InterviewQuestion = {
        ...mockQuestion,
        followups: [],
      };
      renderDrawer([questionWithoutFollowups]);

      // Add a followup slot
      fireEvent.click(screen.getByRole('button', { name: /꼬리 질문 추가/ }));

      // Target followup textareas by their placeholder text
      const followupQuestionTextarea = screen.getByPlaceholderText('꼬리 질문');
      const followupAnswerTextarea = screen.getByPlaceholderText('답변');
      fireEvent.change(followupQuestionTextarea, { target: { value: '꼬리 질문 내용' } });
      fireEvent.change(followupAnswerTextarea, { target: { value: '꼬리 답변 내용' } });

      fireEvent.click(getSaveButton());

      await waitFor(() => {
        expect(createFollowupAction).toHaveBeenCalledWith(
          expect.objectContaining({
            questionId: mockQuestion.id,
            question: '꼬리 질문 내용',
            answer: '꼬리 답변 내용',
          })
        );
      });
    });
  });

  // ── 5. Error on save failure ─────────────────────────────────────────────
  describe('저장 실패 시', () => {
    it('updateQuestionAction이 throw하면 에러 메시지를 표시한다', async () => {
      (updateQuestionAction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network Error')
      );

      renderDrawer();

      fireEvent.click(getSaveButton());

      await waitFor(() => {
        expect(screen.getByText('저장에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument();
      });
    });

    it('저장 실패 시 closeDrawer를 호출하지 않는다', async () => {
      (updateQuestionAction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Server Error')
      );

      renderDrawer();

      fireEvent.click(getSaveButton());

      await waitFor(() => {
        expect(screen.getByText('저장에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument();
      });

      expect(mockCloseDrawer).not.toHaveBeenCalled();
    });
  });

  // ── 6. Does not render when no matching question ──────────────────────────
  describe('drawerTargetId가 질문 목록과 일치하지 않을 때', () => {
    it('컴포넌트를 렌더링하지 않는다', () => {
      setupStore({ drawerTargetId: 'nonexistent-id' });

      const { container } = renderDrawer();

      // Component returns null, so the container is empty
      expect(container).toBeEmptyDOMElement();
    });

    it('drawerTargetId가 null이면 컴포넌트를 렌더링하지 않는다', () => {
      setupStore({ drawerTargetId: null });

      const { container } = renderDrawer();

      expect(container).toBeEmptyDOMElement();
    });
  });
});
