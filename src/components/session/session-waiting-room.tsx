'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Link2, Loader2, Play } from 'lucide-react';
import { createInvitationAction } from '@/actions/session-actions';
import { SessionInterviewRoom } from '@/components/session/session-interview-room';
import { SessionParticipantsBar } from '@/components/session/session-participants-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InterviewQuestion, SessionRole } from '@/data-access/types';
import { useWebSocket } from '@/lib/hooks/use-websocket';
import { useSessionStore } from '@/stores/session-store';
import type { ServerMessage } from '@/types/session-messages';

interface Props {
  sessionId: string;
  userId: string;
  myRole: SessionRole;
  displayName: string;
  initialTitle: string;
  libraryQuestions: InterviewQuestion[];
}

export function SessionWaitingRoom({
  sessionId,
  userId,
  myRole,
  displayName,
  initialTitle,
  libraryQuestions,
}: Props) {
  const router = useRouter();
  const { status, participants, setSession, handleServerMessage, reset } = useSessionStore();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<SessionRole>('interviewee');
  const [copied, setCopied] = useState(false);
  const [invitePending, setInvitePending] = useState(false);

  useEffect(() => {
    setSession(sessionId, myRole);
    return () => reset();
  }, [sessionId, myRole, setSession, reset]);

  // Auto-redirect on session completion
  useEffect(() => {
    if (status !== 'completed') return;
    const timer = setTimeout(() => {
      router.push(`/interviews/sessions/${sessionId}/result`);
    }, 2000);
    return () => clearTimeout(timer);
  }, [status, sessionId, router]);

  const onMessage = useCallback(
    (message: ServerMessage) => {
      handleServerMessage(message);
    },
    [handleServerMessage]
  );

  const { send, connectionStatus } = useWebSocket({
    sessionId,
    userId,
    role: myRole,
    displayName,
    onMessage,
    enabled: true,
  });

  const hasInterviewee = participants.some((p) => p.role === 'interviewee');
  const canStart = myRole === 'interviewer' && hasInterviewee && status === 'waiting';

  function handleStartSession() {
    send({ type: 'session:start' });
  }

  async function handleCreateInvite() {
    setInvitePending(true);
    try {
      const result = await createInvitationAction(sessionId, inviteRole);
      setInviteCode(result.inviteCode);
    } catch {
      // error handled silently
    } finally {
      setInvitePending(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteCode) return;
    const url = `${window.location.origin}/interviews/sessions/join/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // When session starts, render interview room
  if (status === 'in_progress') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <SessionParticipantsBar participants={participants} />
        <SessionInterviewRoom myRole={myRole} send={send} libraryQuestions={libraryQuestions} />
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="text-iv-text3 size-6 animate-spin" />
        <p className="text-iv-text text-sm">면접이 종료되었습니다. 결과 페이지로 이동합니다...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SessionParticipantsBar participants={participants} />

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h3 className="text-iv-text text-lg font-medium">{initialTitle}</h3>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="outline">대기 중</Badge>
              <span className="text-iv-text3 text-xs">
                {connectionStatus === 'connected'
                  ? '연결됨'
                  : connectionStatus === 'connecting'
                    ? '연결 중...'
                    : connectionStatus === 'reconnecting'
                      ? '재연결 중...'
                      : '연결 끊김'}
              </span>
            </div>
          </div>

          {/* Invite section */}
          <div className="border-iv-border bg-iv-bg2 space-y-3 rounded-lg border p-4">
            <h4 className="text-iv-text text-sm font-medium">참가자 초대</h4>
            <div className="flex items-center gap-2">
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as SessionRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectItem value="interviewee">지원자</SelectItem>
                  <SelectItem value="interviewer">면접관</SelectItem>
                  <SelectItem value="reviewer">리뷰어</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCreateInvite} disabled={invitePending}>
                <Link2 className="size-4" />
                초대 생성
              </Button>
            </div>
            {inviteCode && (
              <div className="bg-iv-bg flex items-center gap-2 rounded-md border p-2">
                <code className="text-iv-text flex-1 truncate text-xs">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/interviews/sessions/join/${inviteCode}`}
                </code>
                <Button size="sm" variant="ghost" onClick={handleCopyLink}>
                  {copied ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Start button (interviewer only) */}
          {myRole === 'interviewer' && (
            <Button className="w-full" size="lg" onClick={handleStartSession} disabled={!canStart}>
              <Play className="size-4" />
              {!hasInterviewee ? '지원자를 기다리는 중...' : '면접 시작'}
            </Button>
          )}

          {myRole !== 'interviewer' && (
            <p className="text-iv-text3 text-center text-sm">
              면접관이 세션을 시작할 때까지 기다려주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
