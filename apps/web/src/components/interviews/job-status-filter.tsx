'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const FILTERS = [
  { value: null, label: '전체' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'archived', label: '보관' },
] as const;

interface Props {
  currentStatus: string | null;
}

export function JobStatusFilter({ currentStatus }: Props) {
  const router = useRouter();

  return (
    <div className="mb-4 flex gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.value ?? 'all'}
          onClick={() => router.push(f.value ? `/interviews?status=${f.value}` : '/interviews')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs transition-colors',
            currentStatus === f.value
              ? 'bg-iv-accent/10 text-iv-accent'
              : 'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
