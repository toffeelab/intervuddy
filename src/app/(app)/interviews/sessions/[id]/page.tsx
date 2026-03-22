import { notFound } from 'next/navigation';
import { SessionWaitingRoom } from '@/components/session/session-waiting-room';
import {
  getSessionById,
  getParticipants,
  getParticipantRole,
  getLibraryQuestions,
} from '@/data-access';
import { getCurrentUserId } from '@/lib/auth';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const [session, myRole, participants, libraryQuestions] = await Promise.all([
    getSessionById(userId, id),
    getParticipantRole(id, userId),
    getParticipants(userId, id),
    getLibraryQuestions(userId),
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
