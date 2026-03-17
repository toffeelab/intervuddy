'use client';

import { useMemo } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { CATEGORY_ALL } from '@/lib/constants';
import { QACard } from '@/components/interview/qa-card';
import { EmptyState } from '@/components/interview/empty-state';
import type { QAItem } from '@/data-access/types';

interface QAListProps {
  items: QAItem[];
}

export function QAList({ items }: QAListProps) {
  const activeCategory = useInterviewStore((s) => s.activeCategory);
  const searchQuery = useInterviewStore((s) => s.searchQuery);

  const filtered = useMemo(() => {
    let result = items;

    if (activeCategory !== CATEGORY_ALL) {
      result = result.filter((item) => item.categoryName === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    }

    return result;
  }, [items, activeCategory, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, QAItem[]>();
    for (const item of filtered) {
      const group = map.get(item.categoryName) ?? [];
      group.push(item);
      map.set(item.categoryName, group);
    }
    return map;
  }, [filtered]);

  if (filtered.length === 0) {
    return <EmptyState />;
  }

  const showHeaders = activeCategory === CATEGORY_ALL;
  let globalIndex = 0;

  return (
    <div className="space-y-2">
      {(searchQuery.trim() || activeCategory !== CATEGORY_ALL) && (
        <p className="text-[12px] font-mono text-iv-text3 mb-3">
          검색 결과: {filtered.length}문항
        </p>
      )}

      {Array.from(grouped.entries()).map(([categoryName, groupItems]) => {
        const isJD = groupItems[0]?.isJD ?? false;

        return (
          <div key={categoryName} className="space-y-2">
            {showHeaders && (
              <h2 className="text-[13px] font-semibold text-iv-text2 mt-6 mb-2 first:mt-0">
                {isJD
                  ? `🟡 JD 맞춤 — ${categoryName.replace('JD-', '')}`
                  : `🔵 ${categoryName}`}
              </h2>
            )}
            {groupItems.map((item) => {
              globalIndex += 1;
              return <QACard key={item.id} item={item} index={globalIndex} />;
            })}
          </div>
        );
      })}
    </div>
  );
}
