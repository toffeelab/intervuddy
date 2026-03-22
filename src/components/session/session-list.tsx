'use client';

import { useRouter } from 'next/navigation';
import { Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InterviewSession } from '@/data-access/types';
import { cn } from '@/lib/utils';

interface Props {
  sessions: InterviewSession[];
}

const statusConfig = {
  waiting: {
    label: '대기 중',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  in_progress: {
    label: '진행 중',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    label: '완료',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
} as const;

export function SessionList({ sessions }: Props) {
  const router = useRouter();

  if (sessions.length === 0) {
    return (
      <div className="text-iv-text3 flex flex-col items-center justify-center py-16 text-sm">
        <Users className="mb-3 size-8 opacity-40" />
        <p>등록된 세션이 없습니다.</p>
        <p className="mt-1 text-xs">새 세션을 만들어 모의면접을 시작하세요.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => {
        const config = statusConfig[session.status];
        const href =
          session.status === 'completed'
            ? `/interviews/sessions/${session.id}/result`
            : `/interviews/sessions/${session.id}`;

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(href)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(href);
              }
            }}
            className="border-iv-border bg-iv-bg hover:bg-iv-bg3 cursor-pointer rounded-lg border p-4 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-iv-text min-w-0 truncate text-sm font-medium">{session.title}</h3>
              <Badge className={cn('shrink-0', config.className)}>{config.label}</Badge>
            </div>
            <div className="text-iv-text3 mt-3 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {new Date(session.createdAt).toLocaleDateString('ko-KR')}
              </span>
              {session.status === 'completed' && session.endedAt && (
                <span>종료: {new Date(session.endedAt).toLocaleDateString('ko-KR')}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
