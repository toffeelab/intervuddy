'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Send, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

const TIMER_OPTIONS = [
  { label: '없음', value: 0 },
  { label: '1분', value: 60 },
  { label: '2분', value: 120 },
  { label: '3분', value: 180 },
  { label: '5분', value: 300 },
];

export function SessionQuestionPanel({ libraryQuestions, send }: Props) {
  const { questions } = useSessionStore();
  const [search, setSearch] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTimer, setSelectedTimer] = useState(120); // default 2분

  const filteredQuestions = search.trim()
    ? libraryQuestions.filter(
        (q) =>
          q.question.toLowerCase().includes(search.toLowerCase()) ||
          q.categoryDisplayLabel.toLowerCase().includes(search.toLowerCase())
      )
    : libraryQuestions;

  const nextDisplayOrder = questions.length + 1;

  function sendWithTimer(questionMsg: ClientMessage) {
    send(questionMsg);
    if (selectedTimer > 0) {
      send({ type: 'timer:start', payload: { duration: selectedTimer } });
    }
  }

  function handleSendLibraryQuestion(q: InterviewQuestion) {
    sendWithTimer({
      type: 'question:send',
      payload: {
        questionId: q.id,
        content: q.question,
        displayOrder: nextDisplayOrder,
      },
    });
  }

  function handleSendFollowUp(parentQuestion: InterviewQuestion, followUpText: string) {
    sendWithTimer({
      type: 'question:send',
      payload: {
        questionId: parentQuestion.id,
        content: followUpText,
        displayOrder: nextDisplayOrder,
        isFollowUp: true,
      },
    });
  }

  function handleSendCustomQuestion() {
    if (!customQuestion.trim()) return;
    sendWithTimer({
      type: 'question:send',
      payload: {
        content: customQuestion.trim(),
        displayOrder: nextDisplayOrder,
      },
    });
    setCustomQuestion('');
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-iv-border border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-iv-text text-sm font-medium">질문 출제</h4>
          <div className="flex items-center gap-1">
            <Timer className="text-iv-text3 size-3.5" />
            {TIMER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedTimer(opt.value)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                  selectedTimer === opt.value
                    ? 'bg-iv-accent text-white'
                    : 'text-iv-text3 hover:bg-iv-bg3'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

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
              const alreadySent = questions.some((sq) => sq.questionId === q.id && !sq.isFollowUp);
              const isExpanded = expandedId === q.id;
              const hasFollowups = q.followups.length > 0;

              return (
                <div key={q.id}>
                  <div className="flex items-start gap-1">
                    {/* Expand toggle for followups */}
                    {hasFollowups ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(q.id)}
                        className="text-iv-text3 hover:text-iv-text mt-2 shrink-0 rounded p-0.5 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="mt-2 w-[18px] shrink-0" />
                    )}

                    {/* Main question button */}
                    <button
                      type="button"
                      disabled={alreadySent}
                      onClick={() => handleSendLibraryQuestion(q)}
                      className={cn(
                        'w-full rounded-md p-2 text-left transition-colors',
                        alreadySent ? 'cursor-not-allowed opacity-40' : 'hover:bg-iv-bg3'
                      )}
                    >
                      <p className="text-iv-text text-xs leading-relaxed">{q.question}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-iv-text3 text-[10px]">{q.categoryDisplayLabel}</span>
                        {hasFollowups && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px]">
                            꼬리질문 {q.followups.length}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Follow-up questions */}
                  {isExpanded && hasFollowups && (
                    <div className="border-iv-border mt-0.5 ml-[18px] space-y-0.5 border-l pl-2">
                      {q.followups.map((fu) => {
                        const fuAlreadySent = questions.some(
                          (sq) =>
                            sq.isFollowUp && sq.questionId === q.id && sq.content === fu.question
                        );
                        return (
                          <button
                            key={fu.id}
                            type="button"
                            disabled={fuAlreadySent}
                            onClick={() => handleSendFollowUp(q, fu.question)}
                            className={cn(
                              'w-full rounded-md p-1.5 text-left transition-colors',
                              fuAlreadySent ? 'cursor-not-allowed opacity-40' : 'hover:bg-iv-bg3'
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px]">
                                꼬리질문
                              </Badge>
                              <p className="text-iv-text2 text-xs leading-relaxed">{fu.question}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
