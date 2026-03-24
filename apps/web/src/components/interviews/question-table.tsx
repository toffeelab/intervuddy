'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Lightbulb, MoreHorizontal } from 'lucide-react';
import { deleteQuestionAction } from '@/actions/question-actions';
import { useConfirmDialog } from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { InterviewQuestion } from '@/data-access/types';
import { cn } from '@/lib/utils';
import { useEditStore } from '@/stores/edit-store';

interface Props {
  questions: InterviewQuestion[];
}

interface GroupedQuestions {
  categoryId: number;
  categoryName: string;
  categoryDisplayLabel: string;
  icon?: string;
  questions: InterviewQuestion[];
}

function groupByCategory(questions: InterviewQuestion[]): GroupedQuestions[] {
  const map = new Map<number, GroupedQuestions>();
  for (const q of questions) {
    if (!map.has(q.categoryId)) {
      map.set(q.categoryId, {
        categoryId: q.categoryId,
        categoryName: q.categoryName,
        categoryDisplayLabel: q.categoryDisplayLabel,
        questions: [],
      });
    }
    map.get(q.categoryId)!.questions.push(q);
  }
  return Array.from(map.values());
}

function QuestionRow({ question }: { question: InterviewQuestion }) {
  const { openDrawer } = useEditStore();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  function handleDelete() {
    confirm({
      title: '질문 삭제',
      description: `"${question.question.slice(0, 40)}..." 질문을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteQuestionAction(question.id);
          } catch {
            setError('삭제에 실패했습니다');
          }
        });
      },
    });
  }

  return (
    <div className="border-iv-border hover:bg-iv-bg3 flex flex-col border-b transition-colors last:border-b-0">
      {error && <p className="text-iv-red px-4 pt-2 text-xs">{error}</p>}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-iv-text line-clamp-2 text-sm leading-relaxed">{question.question}</p>
          {question.answer && (
            <p className="text-iv-text3 mt-1 line-clamp-1 text-xs">{question.answer}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {question.keywords.map((kw) => (
              <span
                key={kw}
                className="bg-iv-bg3 text-iv-text2 border-iv-border rounded border px-1.5 py-0.5 text-xs"
              >
                {kw}
              </span>
            ))}
            {question.tip && (
              <span className="text-iv-amber flex items-center gap-1 text-xs">
                <Lightbulb className="size-3" />팁 있음
              </span>
            )}
            {question.followups.length > 0 && (
              <span className="text-iv-text3 text-xs">꼬리 {question.followups.length}개</span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" title="더보기">
                <MoreHorizontal className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDrawer(question.id)}>
              <Pencil className="size-3.5" />
              편집
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-3.5" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {dialog}
    </div>
  );
}

function CategorySection({ group }: { group: GroupedQuestions }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-iv-border mb-3 overflow-hidden rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-iv-bg2 hover:bg-iv-bg3 flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors"
      >
        {expanded ? (
          <ChevronDown className="text-iv-text3 size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-iv-text3 size-4 shrink-0" />
        )}
        <span className="text-iv-text text-sm font-medium">{group.categoryDisplayLabel}</span>
        <Badge variant="secondary" className="ml-auto h-5 text-xs">
          {group.questions.length}
        </Badge>
      </button>
      {expanded && (
        <div className="bg-iv-bg">
          {group.questions.map((q) => (
            <QuestionRow key={q.id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}

export function QuestionTable({ questions }: Props) {
  const groups = groupByCategory(questions);

  if (groups.length === 0) {
    return (
      <div className="text-iv-text3 flex flex-col items-center justify-center py-16">
        <p className="text-sm">등록된 질문이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1')}>
      {groups.map((group) => (
        <CategorySection key={group.categoryId} group={group} />
      ))}
    </div>
  );
}
