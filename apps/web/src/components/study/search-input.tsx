'use client';

import { useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useStudyStore } from '@/stores/study-store';

export function SearchInput() {
  const setSearchQuery = useStudyStore((s) => s.setSearchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [setSearchQuery]
  );

  return (
    <div className="relative mb-5 max-w-md">
      <span className="text-iv-text3 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
        🔍
      </span>
      <Input
        type="text"
        placeholder="질문 또는 키워드 검색..."
        onChange={handleChange}
        className="bg-iv-bg2 border-iv-border text-iv-text placeholder:text-iv-text3 focus-visible:ring-iv-accent/30 h-9 rounded-lg pl-9 text-[13px]"
      />
    </div>
  );
}
