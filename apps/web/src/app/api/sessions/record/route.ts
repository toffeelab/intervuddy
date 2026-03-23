import { NextRequest, NextResponse } from 'next/server';
import {
  getParticipantRole,
  recordQuestion,
  recordAnswer,
  recordFeedback,
  getSessionQuestionByDisplayOrder,
  updateSessionStatus,
} from '@intervuddy/database';
import { getDb } from '@/db';

export async function POST(request: NextRequest) {
  // 1. Verify shared secret
  const secret = request.headers.get('x-api-secret');
  if (secret !== process.env.PARTYKIT_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  const { sessionId, message } = await request.json();
  const { type, payload, sender } = message;

  // 3. Verify sender is a participant of the session
  if (sender) {
    const role = await getParticipantRole(getDb(), sessionId, sender);
    if (!role) {
      return NextResponse.json(
        { error: 'Sender is not a participant of this session' },
        { status: 403 }
      );
    }
  }

  try {
    switch (type) {
      case 'session:start':
        await updateSessionStatus(getDb(), sender, sessionId, 'in_progress');
        break;
      case 'session:end':
        await updateSessionStatus(getDb(), sender, sessionId, 'completed', {
          summary: payload?.summary,
        });
        break;
      case 'question:send':
        await recordQuestion(getDb(), sessionId, {
          questionId: payload.questionId,
          content: payload.content,
          displayOrder: payload.displayOrder,
        });
        break;
      case 'answer:send': {
        const sq = await getSessionQuestionByDisplayOrder(getDb(), sessionId, payload.displayOrder);
        if (sq) await recordAnswer(getDb(), sq.id, sender, payload.content);
        break;
      }
      case 'feedback:send': {
        const sq2 = await getSessionQuestionByDisplayOrder(
          getDb(),
          sessionId,
          payload.displayOrder
        );
        if (sq2)
          await recordFeedback(getDb(), sq2.id, sender, payload.content, payload.score ?? null);
        break;
      }
      default:
        // Other message types don't need persistence
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
