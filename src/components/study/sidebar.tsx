'use client';

import { KeywordTags } from '@/components/study/keyword-tags';
import { StatGrid } from '@/components/study/stat-grid';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InterviewCategory } from '@/data-access/types';
import { CATEGORY_ALL, CATEGORY_ICON_BG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useStudyStore } from '@/stores/study-store';

const JD_DISPLAY_NAMES: Record<string, string> = {
  'JD-실시간/통신': '실시간/통신 기술',
  'JD-백오피스/UI': '백오피스/UI 설계',
  'JD-TypeScript/보안': 'TypeScript/보안 인증',
  'JD-Vue/Nuxt': 'Vue3/Nuxt.js',
  'JD-인프라/성능': '인프라/성능 최적화',
  'JD-컬처핏': '컬처핏/영어',
};

interface SidebarProps {
  categories: InterviewCategory[];
}

export function Sidebar({ categories }: SidebarProps) {
  const activeCategory = useStudyStore((s) => s.activeCategory);
  const setActiveCategory = useStudyStore((s) => s.setActiveCategory);

  const commonCategories = categories.filter((c) => c.jdId === null);
  const jdCategories = categories.filter((c) => c.jdId !== null);
  const totalCount = categories.reduce((sum, c) => sum + c.questionCount, 0);

  const isActive = (name: string) => activeCategory === name;

  return (
    <aside className="border-iv-border bg-iv-bg2 border-r">
      <ScrollArea className="sticky top-[57px] h-[calc(100vh-57px)]">
        <div className="space-y-1 p-3">
          {/* All category */}
          <button
            onClick={() => setActiveCategory(CATEGORY_ALL)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
              isActive(CATEGORY_ALL)
                ? 'bg-iv-accent/10 text-iv-accent'
                : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
            )}
          >
            <span className="bg-iv-accent/[0.07] flex h-5 w-5 items-center justify-center rounded text-[11px]">
              📋
            </span>
            <span className="flex-1 text-left font-medium">전체</span>
            <span className="text-iv-text3 font-mono text-[10px]">{totalCount}</span>
          </button>

          {/* Divider */}
          <div className="border-iv-border my-2 border-t" />

          {/* Common categories section */}
          <p className="text-iv-text3 px-2.5 pt-1 pb-1.5 font-mono text-[10px] tracking-wider uppercase">
            🔵 공통 질문
          </p>
          {commonCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                isActive(cat.name)
                  ? 'bg-iv-accent/10 text-iv-accent'
                  : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded text-[11px]',
                  CATEGORY_ICON_BG[cat.name] ?? 'bg-iv-bg3'
                )}
              >
                {cat.icon}
              </span>
              <span className="flex-1 text-left">{cat.name}</span>
              <span className="text-iv-text3 font-mono text-[10px]">{cat.questionCount}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="border-iv-border my-2 border-t" />

          {/* JD categories section */}
          <p className="text-iv-text3 px-2.5 pt-1 pb-1.5 font-mono text-[10px] tracking-wider uppercase">
            🟡 JD 맞춤
          </p>
          {jdCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                isActive(cat.name)
                  ? 'bg-iv-jd/[0.08] text-iv-jd'
                  : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded text-[11px]',
                  CATEGORY_ICON_BG[cat.name] ?? 'bg-iv-bg3'
                )}
              >
                {cat.icon}
              </span>
              <span className="flex-1 text-left">
                {JD_DISPLAY_NAMES[cat.name] ?? cat.name.replace('JD-', '')}
              </span>
              <span className="text-iv-text3 font-mono text-[10px]">{cat.questionCount}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="border-iv-border my-2 border-t" />

          {/* Stats */}
          <StatGrid />

          {/* Divider */}
          <div className="border-iv-border my-2 border-t" />

          {/* JD Keywords */}
          <KeywordTags />
        </div>
      </ScrollArea>
    </aside>
  );
}
