'use client';

import { ChevronsDownUp, ChevronsUpDown, Menu } from 'lucide-react';
import { PageHeader } from '@/components/nav/page-header';
import { Button } from '@/components/ui/button';
import { useStudyStore } from '@/stores/study-store';

interface StudyPageHeaderProps {
  totalCount: number;
  allItemIds: string[];
  onMenuClick?: () => void;
}

export function StudyPageHeader({ totalCount, allItemIds, onMenuClick }: StudyPageHeaderProps) {
  const allExpanded = useStudyStore((s) => s.allExpanded);
  const toggleAll = useStudyStore((s) => s.toggleAll);

  return (
    <>
      {/* Mobile header */}
      <header className="border-iv-border bg-iv-bg/80 sticky top-0 z-30 flex items-center justify-between border-b px-3 py-2 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onMenuClick}
              aria-label="카테고리 메뉴 열기"
            >
              <Menu className="size-5" />
            </Button>
          )}
          <span className="text-iv-text text-sm font-semibold">Q&A 학습</span>
          <span className="bg-iv-accent/12 text-iv-accent border-iv-accent/25 rounded-full border px-1.5 py-0.5 font-mono text-[10px]">
            {totalCount}문항
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleAll(allItemIds)}
          className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3"
          aria-label={allExpanded ? '전체 접기' : '전체 펼치기'}
        >
          {allExpanded ? (
            <ChevronsDownUp className="size-4" />
          ) : (
            <ChevronsUpDown className="size-4" />
          )}
        </Button>
      </header>

      {/* Desktop header */}
      <PageHeader
        title="Q&A 학습"
        badges={[{ label: `총 ${totalCount}문항`, variant: 'accent' }]}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleAll(allItemIds)}
            className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 h-7 px-2.5 text-[11px]"
          >
            {allExpanded ? '전체 접기' : '전체 펼치기'}
          </Button>
        }
      />
    </>
  );
}
