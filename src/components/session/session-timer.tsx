'use client';

import { useEffect, useState } from 'react';
import { Pause, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session-store';
import type { ClientMessage } from '@/types/session-messages';

interface Props {
  isInterviewer: boolean;
  send: (message: ClientMessage) => void;
}

export function SessionTimer({ isInterviewer, send }: Props) {
  const { timerDuration, timerStartedAt } = useSessionStore();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (timerDuration === null || timerStartedAt === null) {
      setRemaining(null);
      return;
    }

    function tick() {
      const elapsed = Math.floor((Date.now() - timerStartedAt!) / 1000);
      const left = Math.max(0, timerDuration! - elapsed);
      setRemaining(left);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerDuration, timerStartedAt]);

  function handleStop() {
    send({ type: 'timer:stop' });
  }

  const isRunning = timerDuration !== null && timerStartedAt !== null;
  const minutes = remaining !== null ? Math.floor(remaining / 60) : 0;
  const seconds = remaining !== null ? remaining % 60 : 0;

  return (
    <div className="flex items-center gap-2">
      <Timer className="text-iv-text3 size-4 shrink-0" />
      {isRunning ? (
        <>
          <span className="text-iv-text font-mono text-sm tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          {isInterviewer && (
            <Button size="sm" variant="ghost" onClick={handleStop}>
              <Pause className="size-3.5" />
            </Button>
          )}
        </>
      ) : (
        <span className="text-iv-text3 text-xs">타이머 대기 중</span>
      )}
    </div>
  );
}
