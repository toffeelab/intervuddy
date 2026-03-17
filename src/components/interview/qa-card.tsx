'use client';

import { useInterviewStore } from '@/stores/interview-store';
import { TAG_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { QAAnswer } from '@/components/interview/qa-answer';
import type { QAItem } from '@/data-access/types';

interface QACardProps {
  item: QAItem;
  index: number;
}

export function QACard({ item, index }: QACardProps) {
  const expandedCards = useInterviewStore((s) => s.expandedCards);
  const toggleCard = useInterviewStore((s) => s.toggleCard);

  const isOpen = expandedCards.has(item.id);
  const tagColor = TAG_COLORS[item.tag];

  const borderColor = isOpen
    ? item.isJD
      ? 'border-iv-jd/25'
      : item.isDeep
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
          {item.isJD && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-iv-jd/10 text-iv-jd border border-iv-jd/20">
              JD
            </span>
          )}
          {item.isDeep && (
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
              {item.tagLabel}
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
