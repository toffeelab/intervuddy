'use client';

import { useStudyStore } from '@/stores/study-store';
import { TAG_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { QAAnswer } from '@/components/study/qa-answer';
import type { InterviewQuestion } from '@/data-access/types';

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
    <div
      className={cn(
        'bg-iv-bg2 border rounded-[10px] transition-colors',
        borderColor
      )}
    >
      <button
        type="button"
        onClick={() => toggleCard(item.id)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="font-mono text-[11px] text-iv-text3 shrink-0 w-7">
          Q{index}
        </span>
        <span className="flex-1 text-[13px] text-iv-text leading-snug">
          {item.question}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.jdId !== null && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-iv-jd/10 text-iv-jd border border-iv-jd/20">
              JD
            </span>
          )}
          {item.followups.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-iv-accent2/10 text-[#a89ff5] border border-iv-accent2/20">
              꼬리질문
            </span>
          )}
          {tagColor && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-[9px] font-mono rounded border',
                tagColor.bg,
                tagColor.text,
                tagColor.border
              )}
            >
              {item.categoryDisplayLabel}
            </span>
          )}
          <span
            className={cn(
              'text-[11px] transition-transform duration-200',
              isOpen ? 'rotate-180 text-iv-accent' : 'text-iv-text3'
            )}
          >
            ▼
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-iv-border pt-3 ml-10">
            <QAAnswer item={item} />
          </div>
        </div>
      )}
    </div>
  );
}
