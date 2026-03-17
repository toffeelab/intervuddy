'use client';

import { useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useInterviewStore } from '@/stores/interview-store';

export function SearchInput() {
  const setSearchQuery = useInterviewStore((s) => s.setSearchQuery);
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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-iv-text3 text-sm pointer-events-none">
        🔍
      </span>
      <Input
        type="text"
        placeholder="질문 또는 키워드 검색..."
        onChange={handleChange}
        className="pl-9 bg-iv-bg2 border-iv-border text-iv-text placeholder:text-iv-text3 text-[13px] h-9 rounded-lg focus-visible:ring-iv-accent/30"
      />
    </div>
  );
}
