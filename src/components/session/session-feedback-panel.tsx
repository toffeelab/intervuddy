'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Star, StarHalf } from 'lucide-react';
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

/**
 * Half-star scoring component.
 * Click cycles: empty -> full -> half -> empty
 */
function HalfStarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (val: number | null) => void;
}) {
  function handleClick(starIndex: number) {
    const fullValue = starIndex + 1;
    const halfValue = starIndex + 0.5;

    if (value === fullValue) {
      // full -> half
      onChange(halfValue);
    } else if (value === halfValue) {
      // half -> empty (if first star, set null; otherwise set to previous full)
      onChange(starIndex === 0 ? null : null);
    } else {
      // empty -> full
      onChange(fullValue);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-iv-text3 mr-1 text-xs">점수:</span>
      {[0, 1, 2, 3, 4].map((idx) => {
        const fullValue = idx + 1;
        const halfValue = idx + 0.5;
        const isFull = value !== null && value >= fullValue;
        const isHalf = value !== null && value === halfValue;

        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(idx)}
            className="relative rounded p-0.5 transition-colors"
          >
            {isHalf ? (
              <span className="relative inline-block">
                <Star className="text-iv-text3 size-4" />
                <StarHalf className="absolute inset-0 size-4 fill-yellow-400 text-yellow-400" />
              </span>
            ) : (
              <Star
                className={cn(
                  'size-4',
                  isFull ? 'fill-yellow-400 text-yellow-400' : 'text-iv-text3'
                )}
              />
            )}
          </button>
        );
      })}
      {value !== null && <span className="text-iv-text3 ml-1 text-xs">{value}/5</span>}
    </div>
  );
}

export function SessionFeedbackPanel({ send, myRole }: Props) {
  const { questions, currentDisplayOrder, feedbacks, suggestions, participants } =
    useSessionStore();
  const [feedbackContent, setFeedbackContent] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [suggestionContent, setSuggestionContent] = useState('');
  const [highlightOrder, setHighlightOrder] = useState<number | null>(null);
  const prevAnswerCountRef = useRef(0);

  const currentQuestion = questions.find((q) => q.displayOrder === currentDisplayOrder);
  const currentFeedbacks = feedbacks.filter((f) => f.displayOrder === currentDisplayOrder);
  const previousQuestions = questions
    .filter((q) => q.displayOrder !== currentDisplayOrder)
    .sort((a, b) => b.displayOrder - a.displayOrder);

  // Count answered questions for highlight detection
  const answeredCount = questions.filter((q) => q.answer).length;

  // Highlight when new answer arrives
  useEffect(() => {
    if (answeredCount > prevAnswerCountRef.current && answeredCount > 0) {
      const latestAnswered = questions
        .filter((q) => q.answer)
        .sort((a, b) => (b.answer?.timestamp ?? 0) - (a.answer?.timestamp ?? 0))[0];
      if (latestAnswered) {
        setHighlightOrder(latestAnswered.displayOrder);
        const timer = setTimeout(() => setHighlightOrder(null), 1200);
        prevAnswerCountRef.current = answeredCount;
        return () => clearTimeout(timer);
      }
    }
    prevAnswerCountRef.current = answeredCount;
  }, [answeredCount, questions]);

  function resolveDisplayName(userId: string): string {
    return participants.find((p) => p.userId === userId)?.displayName || userId;
  }

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

  const feedbackDisabled = !currentQuestion;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Current Q&A */}
      <div
        className={cn(
          'border-iv-border border-b p-4 transition-colors duration-500',
          highlightOrder === currentDisplayOrder && 'bg-yellow-50 dark:bg-yellow-950/20'
        )}
      >
        {currentQuestion ? (
          <>
            <div className="flex items-center gap-1.5">
              <p className="text-iv-text3 text-xs">현재 질문 (Q{currentDisplayOrder})</p>
              {currentQuestion.isFollowUp && (
                <span className="bg-iv-bg3 text-iv-text2 rounded px-1 py-0.5 text-[9px]">
                  꼬리질문
                </span>
              )}
            </div>
            <p className="text-iv-text mt-1 text-sm">{currentQuestion.content}</p>
            {currentQuestion.answer && (
              <div
                className={cn(
                  'bg-iv-bg2 mt-2 rounded-md p-2 transition-opacity duration-300',
                  highlightOrder === currentDisplayOrder ? 'opacity-100' : 'opacity-100'
                )}
              >
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

        {feedbackDisabled ? (
          <p className="text-iv-text3 text-xs">질문이 출제되면 피드백을 남길 수 있습니다.</p>
        ) : (
          <>
            {/* Half-star score */}
            <div className="mb-2">
              <HalfStarRating value={score} onChange={setScore} />
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
          </>
        )}
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

      {/* Display feedbacks + Q&A history */}
      <div className="flex-1 overflow-y-auto p-3">
        {currentFeedbacks.length > 0 && (
          <>
            <h5 className="text-iv-text3 mb-2 text-xs font-medium">받은 피드백</h5>
            <div className="space-y-2">
              {currentFeedbacks.map((f, i) => (
                <div key={i} className="bg-iv-bg2 rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-iv-text3 text-[10px]">
                      {resolveDisplayName(f.sender)}
                    </span>
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
                  <span className="text-iv-text3 text-[10px]">{resolveDisplayName(s.sender)}</span>
                  <p className="text-iv-text2 mt-0.5 text-xs">{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A history — newest on top */}
        {previousQuestions.length > 0 && (
          <div className="mt-3">
            <h5 className="text-iv-text3 mb-2 text-xs font-medium">이전 Q&A</h5>
            <div className="space-y-2">
              {previousQuestions.map((q) => {
                const qFeedbacks = feedbacks.filter((f) => f.displayOrder === q.displayOrder);
                return (
                  <div key={q.displayOrder} className="border-iv-border rounded-md border p-2.5">
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
                        <p className="text-iv-text3 text-[10px]">답변:</p>
                        <p className="text-iv-text2 text-xs leading-relaxed whitespace-pre-wrap">
                          {q.answer.content}
                        </p>
                      </div>
                    )}
                    {qFeedbacks.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {qFeedbacks.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-iv-text3 text-[10px]">
                              {resolveDisplayName(f.sender)}:
                            </span>
                            {f.score !== undefined && f.score !== null && (
                              <span className="flex items-center gap-0.5 text-[10px]">
                                <Star className="size-2.5 fill-yellow-400 text-yellow-400" />
                                {f.score}
                              </span>
                            )}
                            {f.content && (
                              <span className="text-iv-text2 truncate text-[10px]">
                                {f.content}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
