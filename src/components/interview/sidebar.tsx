'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { StatGrid } from '@/components/interview/stat-grid';
import { KeywordTags } from '@/components/interview/keyword-tags';
import { useInterviewStore } from '@/stores/interview-store';
import { CATEGORY_ALL, CATEGORY_ICON_BG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Category } from '@/data-access/types';

const JD_DISPLAY_NAMES: Record<string, string> = {
  'JD-실시간/통신': '실시간/통신 기술',
  'JD-백오피스/UI': '백오피스/UI 설계',
  'JD-TypeScript/보안': 'TypeScript/보안 인증',
  'JD-Vue/Nuxt': 'Vue3/Nuxt.js',
  'JD-인프라/성능': '인프라/성능 최적화',
  'JD-컬처핏': '컬처핏/영어',
};

interface SidebarProps {
  categories: Category[];
}

export function Sidebar({ categories }: SidebarProps) {
  const activeCategory = useInterviewStore((s) => s.activeCategory);
  const setActiveCategory = useInterviewStore((s) => s.setActiveCategory);

  const commonCategories = categories.filter((c) => !c.isJdGroup);
  const jdCategories = categories.filter((c) => c.isJdGroup);
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  const isActive = (name: string) => activeCategory === name;

  return (
    <aside className="border-r border-iv-border bg-iv-bg2">
      <ScrollArea className="sticky top-[57px] h-[calc(100vh-57px)]">
        <div className="p-3 space-y-1">
          {/* All category */}
          <button
            onClick={() => setActiveCategory(CATEGORY_ALL)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] transition-colors',
              isActive(CATEGORY_ALL)
                ? 'bg-iv-accent/10 text-iv-accent'
                : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded bg-iv-accent/[0.07] text-[11px]">
              📋
            </span>
            <span className="flex-1 text-left font-medium">전체</span>
            <span className="text-[10px] font-mono text-iv-text3">{totalCount}</span>
          </button>

          {/* Divider */}
          <div className="border-t border-iv-border my-2" />

          {/* Common categories section */}
          <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-mono text-iv-text3 uppercase tracking-wider">
            🔵 공통 질문
          </p>
          {commonCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] transition-colors',
                isActive(cat.name)
                  ? 'bg-iv-accent/10 text-iv-accent'
                  : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded text-[11px]',
                  CATEGORY_ICON_BG[cat.name] ?? 'bg-iv-bg3'
                )}
              >
                {cat.icon}
              </span>
              <span className="flex-1 text-left">{cat.name}</span>
              <span className="text-[10px] font-mono text-iv-text3">{cat.count}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-iv-border my-2" />

          {/* JD categories section */}
          <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-mono text-iv-text3 uppercase tracking-wider">
            🟡 JD 맞춤
          </p>
          {jdCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] transition-colors',
                isActive(cat.name)
                  ? 'bg-iv-jd/[0.08] text-iv-jd'
                  : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded text-[11px]',
                  CATEGORY_ICON_BG[cat.name] ?? 'bg-iv-bg3'
                )}
              >
                {cat.icon}
              </span>
              <span className="flex-1 text-left">
                {JD_DISPLAY_NAMES[cat.name] ?? cat.name.replace('JD-', '')}
              </span>
              <span className="text-[10px] font-mono text-iv-text3">{cat.count}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-iv-border my-2" />

          {/* Stats */}
          <StatGrid />

          {/* Divider */}
          <div className="border-t border-iv-border my-2" />

          {/* JD Keywords */}
          <KeywordTags />
        </div>
      </ScrollArea>
    </aside>
  );
}
