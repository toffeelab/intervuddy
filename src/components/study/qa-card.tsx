'use client';

import { QAAnswer } from '@/components/study/qa-answer';
import type { InterviewQuestion } from '@/data-access/types';
import { TAG_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useStudyStore } from '@/stores/study-store';

interface QACardProps {
  item: InterviewQuestion;
  index: number;
}

export function QACard({ item, index }: QACardProps) {
  const expandedCards = useStudyStore((s) => s.expandedCards);
  const toggleCard = useStudyStore((s) => s.toggleCard);

  const isOpen = expandedCards.has(item.id);
  const tagColor = TAG_COLORS[item.categorySlug];

  const borderColor = isOpen
    ? item.jdId !== null
      ? 'border-iv-jd/25'
      : item.followups.length > 0
        ? 'border-iv-accent2/30'
        : 'border-iv-accent/25'
    : 'border-iv-border';

  return (
    <div className={cn('bg-iv-bg2 rounded-[10px] border transition-colors', borderColor)}>
      <button
        type="button"
        onClick={() => toggleCard(item.id)}
        className="flex w-full flex-col gap-1.5 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-iv-text3 w-7 shrink-0 font-mono text-[11px]">Q{index}</span>
          <span className="text-iv-text flex-1 text-[13px] leading-snug">{item.question}</span>
          <span
            className={cn(
              'shrink-0 text-[11px] transition-transform duration-200',
              isOpen ? 'text-iv-accent rotate-180' : 'text-iv-text3'
            )}
          >
            ▼
          </span>
        </div>
        {(item.jdId !== null || item.followups.length > 0 || tagColor) && (
          <div className="flex flex-wrap items-center gap-1.5 pl-10">
            {item.jdId !== null && (
              <span className="bg-iv-jd/10 text-iv-jd border-iv-jd/20 rounded border px-1.5 py-0.5 font-mono text-[9px]">
                맞춤
              </span>
            )}
            {item.followups.length > 0 && (
              <span className="bg-iv-accent2/10 border-iv-accent2/20 rounded border px-1.5 py-0.5 font-mono text-[9px] text-[#a89ff5]">
                꼬리질문
              </span>
            )}
            {tagColor && (
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-[9px]',
                  tagColor.bg,
                  tagColor.text,
                  tagColor.border
                )}
              >
                {item.categoryDisplayLabel}
              </span>
            )}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="px-4 pt-0 pb-4">
          <div className="border-iv-border ml-10 border-t pt-3">
            <QAAnswer item={item} />
          </div>
        </div>
      )}
    </div>
  );
}
