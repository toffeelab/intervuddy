'use client';

import { useState, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TrashItem {
  id: string;
  type: 'job' | 'question';
  title: string;
  subtitle?: string;
  deletedAt: string;
}

interface TrashSectionProps {
  label: string;
  icon: React.ReactNode;
  items: TrashItem[];
  onRestore: (id: string) => Promise<void>;
  retentionDays: number;
}

function getRemainingDays(deletedAt: string, retentionDays: number): number {
  // SQLite datetime('now')는 UTC이지만 'Z' 접미사가 없으므로 추가
  const deletedMs = new Date(deletedAt + 'Z').getTime();
  const nowMs = Date.now();
  const elapsed = Math.floor((nowMs - deletedMs) / (1000 * 60 * 60 * 24));
  return Math.max(0, retentionDays - elapsed);
}

function TrashItemRow({
  item,
  onRestore,
  retentionDays,
}: {
  item: TrashItem;
  onRestore: (id: string) => Promise<void>;
  retentionDays: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const remaining = getRemainingDays(item.deletedAt, retentionDays);

  function handleRestore() {
    startTransition(async () => {
      try {
        await onRestore(item.id);
      } catch {
        setError('복구에 실패했습니다');
      }
    });
  }

  return (
    <div
      className={cn(
        'border-iv-border flex items-center gap-3 rounded-lg border px-4 py-3',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-iv-text truncate text-sm">{item.title}</p>
        {item.subtitle && <p className="text-iv-text3 mt-0.5 truncate text-xs">{item.subtitle}</p>}
        <p className="text-iv-text3 mt-1 text-[10px]">
          {remaining > 0 ? (
            <span className="text-iv-amber">{remaining}일 후 영구 삭제</span>
          ) : (
            <span className="text-iv-red">곧 영구 삭제됨</span>
          )}
        </p>
        {error && <p className="text-iv-red mt-1 text-xs">{error}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestore}
        disabled={isPending}
        className="border-iv-border text-iv-text2 shrink-0"
      >
        <RotateCcw className="size-3.5" />
        {isPending ? '복구 중...' : '복구'}
      </Button>
    </div>
  );
}

export function TrashSection({ label, icon, items, onRestore, retentionDays }: TrashSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-iv-text text-sm font-medium">{label}</h3>
        <span className="text-iv-text3 text-xs">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <TrashItemRow
            key={`${item.type}-${item.id}`}
            item={item}
            onRestore={onRestore}
            retentionDays={retentionDays}
          />
        ))}
      </div>
    </div>
  );
}
