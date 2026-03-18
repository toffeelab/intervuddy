'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { InlineEdit } from '@/components/shared/inline-edit';
import { updateFollowupAction, deleteFollowupAction } from '@/actions/followup-actions';
import { cn } from '@/lib/utils';
import type { FollowupQuestion } from '@/data-access/types';

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
    <div className={cn('space-y-1 group/followup', isPending && 'opacity-50')}>
      <div className="flex items-start gap-1">
        <span className="text-[12px] text-[#a89ff5] mr-1 mt-0.5 shrink-0">↳</span>
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={item.question}
            onSave={handleUpdateQuestion}
            multiline={false}
            textClassName="text-[12px] text-[#a89ff5] font-medium"
            placeholder="꼬리 질문을 입력하세요"
          />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={cn(
            'shrink-0 p-0.5 rounded text-iv-text3 opacity-0 group-hover/followup:opacity-100',
            'hover:text-red-400 hover:bg-red-400/10 transition-all',
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
        />
      </div>
    </div>
  );
}
