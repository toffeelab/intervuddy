'use client';

import { LogoDot } from '@/components/shared/logo-dot';
import { Button } from '@/components/ui/button';
import { useStudyStore } from '@/stores/study-store';

interface InterviewHeaderProps {
  totalCount: number;
  allItemIds: number[];
}

export function InterviewHeader({ totalCount, allItemIds }: InterviewHeaderProps) {
  const allExpanded = useStudyStore((s) => s.allExpanded);
  const toggleAll = useStudyStore((s) => s.toggleAll);

  return (
    <header className="sticky top-0 z-50 h-[57px] flex items-center justify-between px-5 bg-iv-bg/80 backdrop-blur-md border-b border-iv-border">
      <div className="flex items-center gap-3">
        <LogoDot />
        <h1 className="text-[15px] font-semibold text-iv-text tracking-tight">
          면접 예상 Q&A 가이드
        </h1>
        <span className="font-mono text-[11px] text-iv-text3 hidden sm:inline">
          Intervuddy
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-full bg-iv-jd/12 text-iv-jd border border-iv-jd/25">
          📌 JD 맞춤 질문 포함
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-full bg-iv-accent/12 text-iv-accent border border-iv-accent/25">
          총 {totalCount}문항
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleAll(allItemIds)}
          className="text-[11px] text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 h-7 px-2.5"
        >
          {allExpanded ? '전체 접기' : '전체 펼치기'}
        </Button>
      </div>
    </header>
  );
}
