import Link from 'next/link';
import { getSessionsByUserId } from '@intervuddy/database';
import { Plus } from 'lucide-react';
import { SessionList } from '@/components/session/session-list';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

export default async function SessionsPage() {
  const userId = await getCurrentUserId();
  const sessions = await getSessionsByUserId(getDb(), userId);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-iv-text text-lg font-medium">모의면접 세션</h2>
          <p className="text-iv-text3 mt-1 text-sm">
            모의면접 세션을 관리하고 새 세션을 시작하세요.
          </p>
        </div>
        <Link
          href="/interviews/sessions/new"
          className="bg-iv-accent text-iv-accent-foreground hover:bg-iv-accent/90 inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors"
        >
          <Plus className="size-4" />새 세션 만들기
        </Link>
      </div>

      <SessionList sessions={sessions} />
    </div>
  );
}
