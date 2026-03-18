'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createQuestionAction } from '@/actions/question-actions';
import { createFollowupAction } from '@/actions/followup-actions';

interface QuickAddFormProps {
  categoryId: number;
  jdId?: number | null;
  /** If provided, adds a followup to this question instead of a top-level question */
  questionId?: number;
  onAdded?: () => void;
}

export function QuickAddForm({ categoryId, jdId, questionId, onAdded }: QuickAddFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isFollowupMode = questionId !== undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQ = question.trim();
    const trimmedA = answer.trim();
    if (!trimmedQ || !trimmedA) return;

    startTransition(async () => {
      try {
        if (isFollowupMode) {
          await createFollowupAction({ questionId: questionId!, question: trimmedQ, answer: trimmedA });
        } else {
          await createQuestionAction({ categoryId, jdId: jdId ?? null, question: trimmedQ, answer: trimmedA });
        }
        setQuestion('');
        setAnswer('');
        setError(null);
        setIsOpen(false);
        onAdded?.();
      } catch {
        setError('추가에 실패했습니다. 다시 시도해주세요.');
      }
    });
  };

  const handleCancel = () => {
    setQuestion('');
    setAnswer('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]',
          'text-iv-text3 border border-dashed border-iv-border',
          'hover:text-iv-text hover:border-iv-accent/40 hover:bg-iv-accent/[0.04]',
          'transition-colors'
        )}
      >
        <Plus size={13} />
        <span>{isFollowupMode ? '꼬리 질문 추가' : '질문 추가'}</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-iv-border rounded-lg p-3 bg-iv-bg2 space-y-2"
    >
      <p className="text-[11px] font-mono text-iv-text3 mb-1">
        {isFollowupMode ? '꼬리 질문 추가' : '질문 추가'}
      </p>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={isFollowupMode ? '꼬리 질문을 입력하세요' : '질문을 입력하세요'}
        disabled={isPending}
        autoFocus
        className={cn(
          'w-full px-2.5 py-1.5 rounded-md text-[12px]',
          'bg-iv-bg border border-iv-border text-iv-text',
          'placeholder:text-iv-text3',
          'focus:outline-none focus:ring-1 focus:ring-iv-accent/40',
          'disabled:opacity-50'
        )}
      />
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="답변을 입력하세요"
        rows={3}
        disabled={isPending}
        className={cn(
          'w-full px-2.5 py-1.5 rounded-md text-[12px] resize-none',
          'bg-iv-bg border border-iv-border text-iv-text',
          'placeholder:text-iv-text3',
          'focus:outline-none focus:ring-1 focus:ring-iv-accent/40',
          'disabled:opacity-50'
        )}
      />
      {error && <p className="text-xs text-iv-red">{error}</p>}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="px-2.5 py-1 text-[11px] text-iv-text3 hover:text-iv-text rounded transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending || !question.trim() || !answer.trim()}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium',
            'bg-iv-accent/10 text-iv-accent border border-iv-accent/20',
            'hover:bg-iv-accent/20 transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Plus size={11} />
          {isPending ? '추가 중...' : '추가'}
        </button>
      </div>
    </form>
  );
}
