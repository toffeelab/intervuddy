'use client';

import { useState } from 'react';
import { Square } from 'lucide-react';
import { SessionAnswerPanel } from '@/components/session/session-answer-panel';
import { SessionFeedbackPanel } from '@/components/session/session-feedback-panel';
import { SessionQuestionPanel } from '@/components/session/session-question-panel';
import { SessionTimer } from '@/components/session/session-timer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { InterviewQuestion, SessionRole } from '@/data-access/types';
import { useSessionStore } from '@/stores/session-store';
import type { ClientMessage } from '@/types/session-messages';

interface Props {
  myRole: SessionRole;
  send: (message: ClientMessage) => void;
  libraryQuestions: InterviewQuestion[];
}

export function SessionInterviewRoom({ myRole, send, libraryQuestions }: Props) {
  const isInterviewer = myRole === 'interviewer';
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  function handleEndClick() {
    setEndDialogOpen(true);
  }

  function handleConfirmEnd() {
    send({
      type: 'session:end',
      payload: { summary: summaryText.trim() || undefined },
    });
    setEndDialogOpen(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="border-iv-border bg-iv-bg2 flex items-center justify-between gap-2 border-b px-4 py-2">
        <SessionTimer isInterviewer={isInterviewer} send={send} />
        {isInterviewer && (
          <Button size="sm" variant="destructive" onClick={handleEndClick}>
            <Square className="size-3.5" />
            면접 종료
          </Button>
        )}
      </div>

      {/* Layout by role */}
      <div className="flex flex-1 overflow-hidden">
        {myRole === 'interviewer' && (
          <InterviewerLayout send={send} libraryQuestions={libraryQuestions} />
        )}
        {myRole === 'interviewee' && <IntervieweeLayout send={send} />}
        {myRole === 'reviewer' && <ReviewerLayout send={send} />}
      </div>

      {/* End session dialog with summary */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>면접 종료</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-iv-text2 text-sm">
              총평을 남겨주세요. 지원자에게 전달됩니다. (선택)
            </p>
            <Textarea
              placeholder="면접 전체에 대한 피드백이나 조언을 작성하세요..."
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              className="min-h-[120px] resize-none text-sm"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmEnd}>
              면접 종료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InterviewerLayout({
  send,
  libraryQuestions,
}: {
  send: (message: ClientMessage) => void;
  libraryQuestions: InterviewQuestion[];
}) {
  return (
    <>
      {/* Left: Question panel */}
      <div className="border-iv-border flex w-full flex-col border-r md:w-80 lg:w-96">
        <SessionQuestionPanel libraryQuestions={libraryQuestions} send={send} />
      </div>
      {/* Right: Answers + Feedback */}
      <div className="hidden flex-1 flex-col md:flex">
        <SessionFeedbackPanel send={send} myRole="interviewer" />
      </div>
    </>
  );
}

function IntervieweeLayout({ send }: { send: (message: ClientMessage) => void }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <SessionAnswerPanel send={send} />
    </div>
  );
}

function ReviewerLayout({ send }: { send: (message: ClientMessage) => void }) {
  return (
    <>
      {/* Left: Questions & answers view */}
      <div className="border-iv-border flex w-full flex-col border-r md:w-1/2">
        <ReviewerQuestionView />
      </div>
      {/* Right: Feedback panel */}
      <div className="hidden flex-1 flex-col md:flex">
        <SessionFeedbackPanel send={send} myRole="reviewer" />
      </div>
    </>
  );
}

function ReviewerQuestionView() {
  const { questions, currentDisplayOrder } = useSessionStore();

  if (questions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <span className="bg-iv-text3/40 inline-block size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
          <span className="bg-iv-text3/40 inline-block size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
          <span className="bg-iv-text3/40 inline-block size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
        </div>
        <p className="text-iv-text3 text-sm">질문을 기다리는 중</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {[...questions]
          .sort((a, b) => b.displayOrder - a.displayOrder)
          .map((q) => (
            <div
              key={q.displayOrder}
              className={`border-iv-border rounded-lg border p-3 ${
                q.displayOrder === currentDisplayOrder ? 'bg-iv-bg2' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <p className="text-iv-text3 text-xs">Q{q.displayOrder}</p>
                {q.isFollowUp && (
                  <span className="bg-iv-bg3 text-iv-text2 rounded px-1 py-0.5 text-[9px]">
                    꼬리질문
                  </span>
                )}
              </div>
              <p className="text-iv-text mt-1 text-sm">{q.content}</p>
              {q.answer && (
                <div className="mt-2 border-t pt-2">
                  <p className="text-iv-text3 text-[10px]">답변:</p>
                  <p className="text-iv-text2 text-xs leading-relaxed whitespace-pre-wrap">
                    {q.answer.content}
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
