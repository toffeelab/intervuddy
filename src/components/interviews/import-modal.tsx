'use client';

import { useState, useTransition } from 'react';
import { Download, Check } from 'lucide-react';
import { importQuestionsAction } from '@/actions/import-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { InterviewQuestion, InterviewCategory } from '@/data-access/types';
import { cn } from '@/lib/utils';

interface Props {
  jdId: number;
  libraryQuestions: InterviewQuestion[];
  categories: InterviewCategory[];
  importedOriginIds: number[];
}

export function ImportModal({
  jdId,
  libraryQuestions,
  categories,
  importedOriginIds: importedOriginIdsArray,
}: Props) {
  const importedOriginIds = new Set(importedOriginIdsArray);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = filterCategoryId
    ? libraryQuestions.filter((q) => q.categoryId === filterCategoryId)
    : libraryQuestions;

  function toggleQuestion(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const availableItems = filtered.filter((q) => !importedOriginIds.has(q.id));
    const availableIds = new Set(availableItems.map((q) => q.id));
    const allSelected =
      availableItems.length > 0 && availableItems.every((q) => selectedIds.has(q.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of availableIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...availableIds]));
    }
  }

  function handleImport() {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      try {
        await importQuestionsAction({
          jdId,
          questionIds: Array.from(selectedIds),
        });
        setSelectedIds(new Set());
        setError(null);
        setOpen(false);
      } catch {
        setError('가져오기에 실패했습니다. 다시 시도해주세요.');
      }
    });
  }

  const available = filtered.filter((q) => !importedOriginIds.has(q.id));
  const allSelected = available.length > 0 && available.every((q) => selectedIds.has(q.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="border-iv-border text-iv-text2">
            <Download className="size-4" />
            질문 가져오기
          </Button>
        }
      />
      <DialogContent className="bg-iv-bg border-iv-border flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-iv-text">공통 라이브러리에서 질문 가져오기</DialogTitle>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 py-2">
          <button
            onClick={() => setFilterCategoryId(null)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs transition-colors',
              filterCategoryId === null
                ? 'bg-iv-accent/10 text-iv-accent'
                : 'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3'
            )}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategoryId(cat.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs transition-colors',
                filterCategoryId === cat.id
                  ? 'bg-iv-accent/10 text-iv-accent'
                  : 'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3'
              )}
            >
              {cat.icon} {cat.displayLabel}
            </button>
          ))}
        </div>

        {/* Question list */}
        <div className="border-iv-border flex-1 space-y-1 overflow-y-auto border-t pt-3">
          {filtered.map((q) => {
            const isImported = importedOriginIds.has(q.id);
            return (
              <label
                key={q.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5',
                  isImported ? 'cursor-default opacity-50' : 'hover:bg-iv-bg3'
                )}
              >
                <Checkbox
                  checked={isImported || selectedIds.has(q.id)}
                  onCheckedChange={() => {
                    if (!isImported) toggleQuestion(q.id);
                  }}
                  disabled={isImported}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-iv-text text-sm leading-relaxed">{q.question}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {q.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-iv-text3 bg-iv-bg3 border-iv-border rounded border px-1.5 py-0.5 text-[10px]"
                      >
                        {kw}
                      </span>
                    ))}
                    {isImported && (
                      <Badge
                        variant="outline"
                        className="border-iv-green/20 text-iv-green text-[10px]"
                      >
                        <Check className="mr-0.5 size-2.5" />
                        가져옴
                      </Badge>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        {error && <p className="text-iv-red text-xs">{error}</p>}
        <div className="border-iv-border flex items-center justify-between border-t pt-3">
          <button
            onClick={toggleAll}
            className="text-iv-text3 hover:text-iv-text text-xs transition-colors"
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
          <Button size="sm" onClick={handleImport} disabled={isPending || selectedIds.size === 0}>
            {isPending ? '가져오는 중...' : `${selectedIds.size}개 가져오기`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
