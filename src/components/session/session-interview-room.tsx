'use client';

import { Square } from 'lucide-react';
import { SessionAnswerPanel } from '@/components/session/session-answer-panel';
import { SessionFeedbackPanel } from '@/components/session/session-feedback-panel';
import { SessionQuestionPanel } from '@/components/session/session-question-panel';
import { SessionTimer } from '@/components/session/session-timer';
import { Button } from '@/components/ui/button';
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

  function handleEndSession() {
    send({ type: 'session:end' });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="border-iv-border bg-iv-bg2 flex items-center justify-between gap-2 border-b px-4 py-2">
        <SessionTimer isInterviewer={isInterviewer} send={send} />
        {isInterviewer && (
          <Button size="sm" variant="destructive" onClick={handleEndSession}>
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
    <div className="flex w-full flex-1 flex-col">
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
      <div className="flex flex-1 items-center justify-center">
        <p className="text-iv-text3 text-sm">질문을 기다리는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.displayOrder}
            className={`border-iv-border rounded-lg border p-3 ${
              q.displayOrder === currentDisplayOrder ? 'bg-iv-bg2' : ''
            }`}
          >
            <p className="text-iv-text3 text-xs">Q{q.displayOrder}</p>
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
