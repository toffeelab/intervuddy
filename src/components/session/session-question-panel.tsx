'use client';

import { useState } from 'react';
import { Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { InterviewQuestion } from '@/data-access/types';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session-store';
import type { ClientMessage } from '@/types/session-messages';

interface Props {
  libraryQuestions: InterviewQuestion[];
  send: (message: ClientMessage) => void;
}

export function SessionQuestionPanel({ libraryQuestions, send }: Props) {
  const { questions } = useSessionStore();
  const [search, setSearch] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');

  const filteredQuestions = search.trim()
    ? libraryQuestions.filter(
        (q) =>
          q.question.toLowerCase().includes(search.toLowerCase()) ||
          q.categoryDisplayLabel.toLowerCase().includes(search.toLowerCase())
      )
    : libraryQuestions;

  const nextDisplayOrder = questions.length + 1;

  function handleSendLibraryQuestion(q: InterviewQuestion) {
    send({
      type: 'question:send',
      payload: {
        questionId: q.id,
        content: q.question,
        displayOrder: nextDisplayOrder,
      },
    });
  }

  function handleSendCustomQuestion() {
    if (!customQuestion.trim()) return;
    send({
      type: 'question:send',
      payload: {
        content: customQuestion.trim(),
        displayOrder: nextDisplayOrder,
      },
    });
    setCustomQuestion('');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-iv-border border-b p-3">
        <h4 className="text-iv-text mb-2 text-sm font-medium">질문 출제</h4>

        {/* Custom question input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="직접 질문을 입력하세요..."
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendCustomQuestion();
              }
            }}
          />
          <Button
            size="sm"
            className="shrink-0 self-end"
            onClick={handleSendCustomQuestion}
            disabled={!customQuestion.trim()}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Library search */}
      <div className="border-iv-border border-b p-3">
        <div className="relative">
          <Search className="text-iv-text3 absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="라이브러리에서 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredQuestions.length === 0 ? (
          <p className="text-iv-text3 py-4 text-center text-xs">질문이 없습니다.</p>
        ) : (
          <div className="space-y-1">
            {filteredQuestions.map((q) => {
              const alreadySent = questions.some((sq) => sq.questionId === q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={alreadySent}
                  onClick={() => handleSendLibraryQuestion(q)}
                  className={cn(
                    'w-full rounded-md p-2 text-left transition-colors',
                    alreadySent ? 'cursor-not-allowed opacity-40' : 'hover:bg-iv-bg3'
                  )}
                >
                  <p className="text-iv-text text-xs leading-relaxed">{q.question}</p>
                  <span className="text-iv-text3 mt-0.5 text-[10px]">{q.categoryDisplayLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
