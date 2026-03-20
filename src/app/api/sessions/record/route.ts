import { NextRequest, NextResponse } from 'next/server';
import {
  recordQuestion,
  recordAnswer,
  recordFeedback,
  getSessionQuestionByDisplayOrder,
} from '@/data-access/session-records';
import { updateSessionStatus } from '@/data-access/sessions';

export async function POST(request: NextRequest) {
  // 1. Verify shared secret
  const secret = request.headers.get('x-api-secret');
  if (secret !== process.env.PARTYKIT_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  const { sessionId, message } = await request.json();
  const { type, payload, sender } = message;

  try {
    switch (type) {
      case 'session:start':
        await updateSessionStatus(sender, sessionId, 'in_progress');
        break;
      case 'session:end':
        await updateSessionStatus(sender, sessionId, 'completed');
        break;
      case 'question:send':
        await recordQuestion(sessionId, {
          questionId: payload.questionId,
          content: payload.content,
          displayOrder: payload.displayOrder,
        });
        break;
      case 'answer:send': {
        const sq = await getSessionQuestionByDisplayOrder(sessionId, payload.displayOrder);
        if (sq) await recordAnswer(sq.id, sender, payload.content);
        break;
      }
      case 'feedback:send': {
        const sq2 = await getSessionQuestionByDisplayOrder(sessionId, payload.displayOrder);
        if (sq2) await recordFeedback(sq2.id, sender, payload.content, payload.score ?? null);
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
