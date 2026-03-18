'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { updateFollowupAction, deleteFollowupAction } from '@/actions/followup-actions';
import { InlineEdit } from '@/components/shared/inline-edit';
import type { FollowupQuestion } from '@/data-access/types';
import { cn } from '@/lib/utils';

interface FollowupItemProps {
  item: FollowupQuestion;
}

export function FollowupItem({ item }: FollowupItemProps) {
  const [isPending, startTransition] = useTransition();

  const handleUpdateQuestion = async (newValue: string) => {
    await updateFollowupAction({ id: item.id, question: newValue });
  };

  const handleUpdateAnswer = async (newValue: string) => {
    await updateFollowupAction({ id: item.id, answer: newValue });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteFollowupAction(item.id);
    });
  };

  return (
    <div className={cn('group/followup space-y-1', isPending && 'opacity-50')}>
      <div className="flex items-start gap-1">
        <span className="mt-0.5 mr-1 shrink-0 text-[12px] text-[#a89ff5]">↳</span>
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={item.question}
            onSave={handleUpdateQuestion}
            multiline={false}
            textClassName="text-[12px] text-[#a89ff5] font-medium"
            placeholder="꼬리 질문을 입력하세요"
            disabled={isPending}
          />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={cn(
            'text-iv-text3 shrink-0 rounded p-0.5 opacity-0 group-hover/followup:opacity-100',
            'transition-all hover:bg-red-400/10 hover:text-red-400',
            isPending && 'cursor-wait'
          )}
          title="꼬리 질문 삭제"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <div className="pl-4">
        <InlineEdit
          value={item.answer}
          onSave={handleUpdateAnswer}
          multiline
          textClassName="text-[12px] text-iv-text3 leading-[1.75] whitespace-pre-line"
          placeholder="답변을 입력하세요"
          disabled={isPending}
        />
      </div>
    </div>
  );
}
