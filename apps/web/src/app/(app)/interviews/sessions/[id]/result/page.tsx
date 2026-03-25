import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionById, getParticipants, getSessionRecords } from '@intervuddy/database';
import { ArrowLeft } from 'lucide-react';
import { SessionResultView } from '@/components/session/session-result-view';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionResultPage({ params }: Props) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const db = getDb();

  const [session, participants, records] = await Promise.all([
    getSessionById(db, userId, id),
    getParticipants(db, userId, id),
    getSessionRecords(db, id),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <Link
          href="/interviews/sessions"
          className="text-iv-text2 hover:text-iv-text mb-3 inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          세션 목록
        </Link>
        <h2 className="text-iv-text text-lg font-medium">세션 결과</h2>
        <p className="text-iv-text3 mt-1 text-sm">모의면접 결과를 확인하고 개선점을 파악하세요.</p>
      </div>

      <SessionResultView session={session} participants={participants} records={records} />
    </div>
  );
}
