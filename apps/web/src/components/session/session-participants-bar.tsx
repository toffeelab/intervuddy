'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Participant } from '@/types/session-messages';

interface Props {
  participants: Participant[];
}

const roleLabel: Record<string, string> = {
  interviewer: '면접관',
  interviewee: '지원자',
  reviewer: '리뷰어',
};

export function SessionParticipantsBar({ participants }: Props) {
  return (
    <div className="border-iv-border bg-iv-bg2 flex items-center gap-3 border-b px-4 py-2">
      <Users className="text-iv-text3 size-4 shrink-0" />
      <div className="flex flex-wrap items-center gap-2">
        {participants.map((p) => (
          <div key={p.userId} className="flex items-center gap-1.5">
            <span
              className={cn('size-2 rounded-full', p.connected ? 'bg-green-500' : 'bg-gray-400')}
            />
            <span className="text-iv-text text-xs">{p.displayName || p.userId.slice(0, 6)}</span>
            <Badge className="text-[10px]" variant="secondary">
              {roleLabel[p.role] ?? p.role}
            </Badge>
          </div>
        ))}
        {participants.length === 0 && <span className="text-iv-text3 text-xs">참가자 없음</span>}
      </div>
    </div>
  );
}
