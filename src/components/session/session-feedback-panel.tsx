'use client';

import { useState } from 'react';
import { MessageSquare, Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { SessionRole } from '@/data-access/types';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session-store';
import type { ClientMessage } from '@/types/session-messages';

interface Props {
  send: (message: ClientMessage) => void;
  myRole: SessionRole;
}

export function SessionFeedbackPanel({ send, myRole }: Props) {
  const { questions, currentDisplayOrder, feedbacks, suggestions } = useSessionStore();
  const [feedbackContent, setFeedbackContent] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [suggestionContent, setSuggestionContent] = useState('');

  const currentQuestion = questions.find((q) => q.displayOrder === currentDisplayOrder);
  const currentFeedbacks = feedbacks.filter((f) => f.displayOrder === currentDisplayOrder);

  function handleSendFeedback() {
    if (!currentDisplayOrder) return;
    send({
      type: 'feedback:send',
      payload: {
        displayOrder: currentDisplayOrder,
        content: feedbackContent.trim(),
        ...(score !== null ? { score } : {}),
      },
    });
    setFeedbackContent('');
    setScore(null);
  }

  function handleSendSuggestion() {
    if (!suggestionContent.trim()) return;
    send({
      type: 'question:suggest',
      payload: { content: suggestionContent.trim() },
    });
    setSuggestionContent('');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Current Q&A */}
      <div className="border-iv-border border-b p-4">
        {currentQuestion ? (
          <>
            <p className="text-iv-text3 text-xs">현재 질문 (Q{currentDisplayOrder})</p>
            <p className="text-iv-text mt-1 text-sm">{currentQuestion.content}</p>
            {currentQuestion.answer && (
              <div className="bg-iv-bg2 mt-2 rounded-md p-2">
                <p className="text-iv-text3 text-[10px]">답변:</p>
                <p className="text-iv-text2 text-xs leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.answer.content}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-iv-text3 text-sm">질문을 기다리는 중...</p>
        )}
      </div>

      {/* Feedback form */}
      <div className="border-iv-border border-b p-3">
        <h4 className="text-iv-text mb-2 text-sm font-medium">피드백</h4>

        {/* Score buttons */}
        <div className="mb-2 flex items-center gap-1">
          <span className="text-iv-text3 mr-1 text-xs">점수:</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScore(score === s ? null : s)}
              className="rounded p-0.5 transition-colors"
            >
              <Star
                className={cn(
                  'size-4',
                  score !== null && s <= score ? 'fill-yellow-400 text-yellow-400' : 'text-iv-text3'
                )}
              />
            </button>
          ))}
          {score !== null && <span className="text-iv-text3 ml-1 text-xs">{score}/5</span>}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="피드백을 입력하세요..."
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            className="min-h-[50px] resize-none text-sm"
          />
          <Button
            size="sm"
            className="shrink-0 self-end"
            onClick={handleSendFeedback}
            disabled={!feedbackContent.trim() && score === null}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Reviewer: question suggestion */}
      {myRole === 'reviewer' && (
        <div className="border-iv-border border-b p-3">
          <h4 className="text-iv-text mb-2 text-sm font-medium">질문 제안</h4>
          <div className="flex gap-2">
            <Textarea
              placeholder="면접관에게 질문을 제안하세요..."
              value={suggestionContent}
              onChange={(e) => setSuggestionContent(e.target.value)}
              className="min-h-[40px] resize-none text-sm"
            />
            <Button
              size="sm"
              className="shrink-0 self-end"
              onClick={handleSendSuggestion}
              disabled={!suggestionContent.trim()}
            >
              <MessageSquare className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Display feedbacks */}
      <div className="flex-1 overflow-y-auto p-3">
        {currentFeedbacks.length > 0 && (
          <>
            <h5 className="text-iv-text3 mb-2 text-xs font-medium">받은 피드백</h5>
            <div className="space-y-2">
              {currentFeedbacks.map((f, i) => (
                <div key={i} className="bg-iv-bg2 rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-iv-text3 text-[10px]">{f.sender}</span>
                    {f.score !== undefined && f.score !== null && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Star className="size-3 fill-yellow-400 text-yellow-400" />
                        {f.score}/5
                      </span>
                    )}
                  </div>
                  {f.content && (
                    <p className="text-iv-text2 mt-1 text-xs leading-relaxed">{f.content}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Display suggestions (for interviewer) */}
        {myRole === 'interviewer' && suggestions.length > 0 && (
          <div className="mt-3">
            <h5 className="text-iv-text3 mb-2 text-xs font-medium">질문 제안</h5>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="bg-iv-bg2 rounded-md p-2">
                  <span className="text-iv-text3 text-[10px]">{s.sender}</span>
                  <p className="text-iv-text2 mt-0.5 text-xs">{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
