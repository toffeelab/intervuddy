'use client';

import { Menu } from 'lucide-react';
import { LogoDot } from '@/components/shared/logo-dot';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { useStudyStore } from '@/stores/study-store';

interface InterviewHeaderProps {
  totalCount: number;
  allItemIds: number[];
  onMenuClick?: () => void;
}

export function InterviewHeader({ totalCount, allItemIds, onMenuClick }: InterviewHeaderProps) {
  const allExpanded = useStudyStore((s) => s.allExpanded);
  const toggleAll = useStudyStore((s) => s.toggleAll);

  return (
    <header className="bg-iv-bg/80 border-iv-border sticky top-0 z-50 flex h-[57px] items-center justify-between border-b px-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuClick}
            className="md:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="size-5" />
          </Button>
        )}
        <LogoDot />
        <h1 className="text-iv-text text-[15px] font-semibold tracking-tight">
          면접 예상 Q&A 가이드
        </h1>
        <span className="text-iv-text3 hidden font-mono text-[11px] sm:inline">Intervuddy</span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="bg-iv-jd/12 text-iv-jd border-iv-jd/25 hidden items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] md:inline-flex">
          📌 JD 맞춤 질문 포함
        </span>
        <span className="bg-iv-accent/12 text-iv-accent border-iv-accent/25 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px]">
          총 {totalCount}문항
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleAll(allItemIds)}
          className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 h-7 px-2.5 text-[11px]"
        >
          {allExpanded ? '전체 접기' : '전체 펼치기'}
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
