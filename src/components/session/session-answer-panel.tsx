'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session-store';
import type { ClientMessage } from '@/types/session-messages';

interface Props {
  send: (message: ClientMessage) => void;
}

export function SessionAnswerPanel({ send }: Props) {
  const { questions, currentDisplayOrder } = useSessionStore();
  const [answer, setAnswer] = useState('');
  const [highlightOrder, setHighlightOrder] = useState<number | null>(null);
  const prevDisplayOrderRef = useRef(currentDisplayOrder);

  const currentQuestion = questions.find((q) => q.displayOrder === currentDisplayOrder);
  const hasAnswered = currentQuestion?.answer !== undefined;

  // Highlight animation when new question arrives
  useEffect(() => {
    if (currentDisplayOrder !== prevDisplayOrderRef.current && currentDisplayOrder > 0) {
      setHighlightOrder(currentDisplayOrder);
      const timer = setTimeout(() => setHighlightOrder(null), 1200);
      prevDisplayOrderRef.current = currentDisplayOrder;
      return () => clearTimeout(timer);
    }
    prevDisplayOrderRef.current = currentDisplayOrder;
  }, [currentDisplayOrder]);

  function handleSubmit() {
    if (!answer.trim() || !currentDisplayOrder) return;
    send({
      type: 'answer:send',
      payload: {
        displayOrder: currentDisplayOrder,
        content: answer.trim(),
      },
    });
    setAnswer('');
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-iv-text3 text-sm">질문을 기다리는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Current question */}
      <div
        className={cn(
          'border-iv-border bg-iv-bg2 border-b p-4 transition-colors duration-500',
          highlightOrder === currentDisplayOrder && 'bg-yellow-50 dark:bg-yellow-950/20'
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-iv-text3 text-xs">질문 {currentDisplayOrder}</span>
          {currentQuestion.isFollowUp && (
            <span className="bg-iv-bg3 text-iv-text2 rounded px-1 py-0.5 text-[9px]">꼬리질문</span>
          )}
        </div>
        <p className="text-iv-text mt-1 text-sm leading-relaxed">{currentQuestion.content}</p>
      </div>

      {/* Answer area */}
      <div className="flex flex-1 flex-col p-4">
        {hasAnswered ? (
          <div className="flex flex-1 flex-col">
            <p className="text-iv-text3 mb-2 text-xs">내 답변:</p>
            <div className="bg-iv-bg2 flex-1 rounded-lg p-3">
              <p className="text-iv-text text-sm leading-relaxed whitespace-pre-wrap">
                {currentQuestion.answer?.content}
              </p>
            </div>
            <p className="text-iv-text3 mt-2 text-center text-xs">
              다음 질문을 기다리는 중입니다...
            </p>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="답변을 입력하세요..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="flex-1 resize-none text-sm"
              autoFocus
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={handleSubmit} disabled={!answer.trim()}>
                <Send className="size-4" />
                답변 제출
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Previous questions — newest on top */}
      {questions.length > 1 && (
        <div className="border-iv-border overflow-y-auto border-t p-3" style={{ maxHeight: '40%' }}>
          <p className="text-iv-text3 mb-2 text-xs font-medium">이전 질문</p>
          <div className="space-y-2">
            {questions
              .filter((q) => q.displayOrder !== currentDisplayOrder)
              .sort((a, b) => b.displayOrder - a.displayOrder)
              .map((q) => (
                <div key={q.displayOrder} className="border-iv-border rounded-md border p-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-iv-text3 text-[10px]">Q{q.displayOrder}</p>
                    {q.isFollowUp && (
                      <span className="bg-iv-bg3 text-iv-text2 rounded px-1 py-0.5 text-[9px]">
                        꼬리질문
                      </span>
                    )}
                  </div>
                  <p className="text-iv-text mt-0.5 text-xs leading-relaxed">{q.content}</p>
                  {q.answer && (
                    <div className="bg-iv-bg2 mt-1.5 rounded p-1.5">
                      <p className="text-iv-text3 text-[10px]">내 답변:</p>
                      <p className="text-iv-text2 text-xs leading-relaxed whitespace-pre-wrap">
                        {q.answer.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
