'use client';

import { ChevronsDownUp, ChevronsUpDown, Menu } from 'lucide-react';
import { LogoDot } from '@/components/shared/logo-dot';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { useStudyStore } from '@/stores/study-store';

interface InterviewHeaderProps {
  totalCount: number;
  allItemIds: string[];
  onMenuClick?: () => void;
}

export function InterviewHeader({ totalCount, allItemIds, onMenuClick }: InterviewHeaderProps) {
  const allExpanded = useStudyStore((s) => s.allExpanded);
  const toggleAll = useStudyStore((s) => s.toggleAll);

  return (
    <header className="bg-iv-bg/80 border-iv-border sticky top-0 z-50 flex h-[57px] items-center justify-between border-b px-3 backdrop-blur-md md:px-5">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuClick}
            className="shrink-0 md:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="size-5" />
          </Button>
        )}
        <LogoDot className="hidden md:block" />
        <h1 className="text-iv-text truncate text-sm font-semibold tracking-tight md:text-[15px]">
          면접 Q&A
          <span className="hidden sm:inline"> 가이드</span>
        </h1>
        <span className="text-iv-text3 hidden font-mono text-[11px] md:inline">Intervuddy</span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2.5">
        <span className="bg-iv-accent/12 text-iv-accent border-iv-accent/25 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px] md:px-2.5 md:py-1 md:text-[11px]">
          {totalCount}문항
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleAll(allItemIds)}
          className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 md:hidden"
          aria-label={allExpanded ? '전체 접기' : '전체 펼치기'}
        >
          {allExpanded ? (
            <ChevronsDownUp className="size-4" />
          ) : (
            <ChevronsUpDown className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleAll(allItemIds)}
          className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 hidden h-7 px-2.5 text-[11px] md:inline-flex"
        >
          {allExpanded ? '전체 접기' : '전체 펼치기'}
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
