'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { createFollowupAction } from '@/actions/followup-actions';
import { createQuestionAction } from '@/actions/question-actions';
import { cn } from '@/lib/utils';

interface QuickAddFormProps {
  categoryId: number;
  jdId?: string | null;
  /** If provided, adds a followup to this question instead of a top-level question */
  questionId?: string;
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
          await createFollowupAction({
            questionId: questionId!,
            question: trimmedQ,
            answer: trimmedA,
          });
        } else {
          await createQuestionAction({
            categoryId,
            jdId: jdId ?? null,
            question: trimmedQ,
            answer: trimmedA,
          });
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
    setError(null);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px]',
          'text-iv-text3 border-iv-border border border-dashed',
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
      className="border-iv-border bg-iv-bg2 space-y-2 rounded-lg border p-3"
    >
      <p className="text-iv-text3 mb-1 font-mono text-[11px]">
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
          'w-full rounded-md px-2.5 py-1.5 text-[12px]',
          'bg-iv-bg border-iv-border text-iv-text border',
          'placeholder:text-iv-text3',
          'focus:ring-iv-accent/40 focus:ring-1 focus:outline-none',
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
          'w-full resize-none rounded-md px-2.5 py-1.5 text-[12px]',
          'bg-iv-bg border-iv-border text-iv-text border',
          'placeholder:text-iv-text3',
          'focus:ring-iv-accent/40 focus:ring-1 focus:outline-none',
          'disabled:opacity-50'
        )}
      />
      {error && <p className="text-iv-red text-xs">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="text-iv-text3 hover:text-iv-text rounded px-2.5 py-1 text-[11px] transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending || !question.trim() || !answer.trim()}
          className={cn(
            'flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium',
            'bg-iv-accent/10 text-iv-accent border-iv-accent/20 border',
            'hover:bg-iv-accent/20 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          <Plus size={11} />
          {isPending ? '추가 중...' : '추가'}
        </button>
      </div>
    </form>
  );
}
