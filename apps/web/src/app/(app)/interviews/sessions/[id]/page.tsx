import { notFound } from 'next/navigation';
import {
  getSessionById,
  getParticipants,
  getParticipantRole,
  getLibraryQuestions,
} from '@intervuddy/database';
import { SessionWaitingRoom } from '@/components/session/session-waiting-room';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const db = getDb();
  const [session, myRole, participants, libraryQuestions] = await Promise.all([
    getSessionById(db, userId, id),
    getParticipantRole(db, id, userId),
    getParticipants(db, userId, id),
    getLibraryQuestions(db, userId),
  ]);

  if (!session || !myRole) {
    notFound();
  }

  // Find the current user's display name from participants
  const myParticipant = participants.find((p) => p.userId === userId);
  const displayName = myParticipant?.displayName ?? userId.slice(0, 8);

  return (
    <SessionWaitingRoom
      sessionId={session.id}
      userId={userId}
      myRole={myRole}
      displayName={displayName}
      initialTitle={session.title}
      libraryQuestions={libraryQuestions}
    />
  );
}
