'use client';

import { useTransition } from 'react';
import type { InterviewQuestion } from '@intervuddy/shared';
import { Trash2 } from 'lucide-react';
import { updateQuestionAction, deleteQuestionAction } from '@/actions/question-actions';
import { InlineEdit } from '@/components/shared/inline-edit';
import { FollowupItem } from '@/components/study/followup-item';
import { KeywordBox } from '@/components/study/keyword-box';
import { QuickAddForm } from '@/components/study/quick-add-form';
import { cn } from '@/lib/utils';

interface QAAnswerProps {
  item: InterviewQuestion;
}

export function QAAnswer({ item }: QAAnswerProps) {
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleUpdateAnswer = async (newValue: string) => {
    await updateQuestionAction({ id: item.id, answer: newValue });
  };

  const handleUpdateTip = async (newValue: string) => {
    await updateQuestionAction({ id: item.id, tip: newValue });
  };

  const handleDelete = () => {
    if (!confirm('이 질문을 삭제할까요?')) return;
    startDeleteTransition(async () => {
      await deleteQuestionAction(item.id);
    });
  };

  return (
    <div className={cn('space-y-3', isDeleting && 'pointer-events-none opacity-50')}>
      {/* Answer with inline edit */}
      <InlineEdit
        value={item.answer}
        onSave={handleUpdateAnswer}
        multiline
        textClassName="whitespace-pre-line text-[13px] text-iv-text2 leading-[1.85]"
        placeholder="답변을 입력하세요"
        disabled={isDeleting}
      />

      {item.keywords.length > 0 && <KeywordBox keywords={item.keywords} />}

      {/* Tip with inline edit */}
      {item.tip !== null && (
        <div className="bg-iv-amber/[0.07] border-iv-amber rounded-lg border-l-2 px-3.5 py-2.5">
          <p className="text-iv-amber mb-1.5 text-[11px] font-semibold">💡 면접 팁</p>
          <InlineEdit
            value={item.tip}
            onSave={handleUpdateTip}
            multiline
            textClassName="text-[12px] leading-[1.75] whitespace-pre-line text-iv-amber/80"
            placeholder="팁을 입력하세요"
            disabled={isDeleting}
          />
        </div>
      )}

      {/* Followup questions */}
      <div className="bg-iv-accent2/[0.06] border-iv-accent2/15 rounded-lg border p-3.5">
        <p className="mb-2.5 text-[11px] font-semibold text-[#a89ff5]">꼬리 질문 &amp; 기술 심화</p>
        {item.followups.length > 0 && (
          <div className="mb-3 space-y-3">
            {item.followups.map((fq) => (
              <FollowupItem key={fq.id} item={fq} />
            ))}
          </div>
        )}
        <QuickAddForm questionId={item.id} categoryId={item.categoryId} jdId={item.jdId} />
      </div>

      {/* Delete question button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-[11px]',
            'text-iv-text3 hover:bg-red-400/10 hover:text-red-400',
            'transition-colors',
            isDeleting && 'cursor-wait opacity-50'
          )}
          title="질문 삭제"
        >
          <Trash2 size={11} />
          <span>삭제</span>
        </button>
      </div>
    </div>
  );
}
