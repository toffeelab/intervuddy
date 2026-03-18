'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEditStore } from '@/stores/edit-store';
import { deleteQuestionAction } from '@/actions/question-actions';
import type { InterviewQuestion } from '@/data-access/types';

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
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`"${question.question.slice(0, 40)}..." 질문을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      await deleteQuestionAction(question.id);
    });
  }

  return (
    <div className="group flex items-start gap-3 px-4 py-3 border-b border-iv-border last:border-b-0 hover:bg-iv-bg3 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-iv-text leading-relaxed line-clamp-2">{question.question}</p>
        {question.answer && (
          <p className="text-xs text-iv-text3 mt-1 line-clamp-1">{question.answer}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {question.keywords.map((kw) => (
            <span
              key={kw}
              className="text-xs px-1.5 py-0.5 rounded bg-iv-bg3 text-iv-text2 border border-iv-border"
            >
              {kw}
            </span>
          ))}
          {question.tip && (
            <span className="flex items-center gap-1 text-xs text-iv-amber">
              <Lightbulb className="size-3" />
              팁 있음
            </span>
          )}
          {question.followups.length > 0 && (
            <span className="text-xs text-iv-text3">꼬리 {question.followups.length}개</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openDrawer(question.id)}
          title="편집"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          title="삭제"
          className="hover:text-iv-red hover:bg-iv-red/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function CategorySection({ group }: { group: GroupedQuestions }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-iv-border rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-iv-bg2 hover:bg-iv-bg3 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-iv-text3 shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-iv-text3 shrink-0" />
        )}
        <span className="text-sm font-medium text-iv-text">{group.categoryDisplayLabel}</span>
        <Badge variant="secondary" className="ml-auto text-xs h-5">
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
      <div className="flex flex-col items-center justify-center py-16 text-iv-text3">
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
