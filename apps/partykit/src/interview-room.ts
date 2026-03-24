import type * as Party from 'partykit/server';
import type { ClientMessage, Participant, SessionRole, SyncState } from './types';

export default class InterviewRoom implements Party.Server {
  private participants: Map<string, Participant & { connId: string }> = new Map();
  private questions: Array<{
    displayOrder: number;
    content: string;
    questionId?: string;
    isFollowUp?: boolean;
  }> = [];
  private summary: string | null = null;
  private sessionStatus: 'waiting' | 'in_progress' | 'completed' = 'waiting';

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const userId = url.searchParams.get('userId');
    const role = url.searchParams.get('role') as SessionRole | null;
    const displayName = url.searchParams.get('displayName') || 'Anonymous';

    if (!userId || !role) {
      conn.send(JSON.stringify({ type: 'error', payload: { message: 'Missing userId or role' } }));
      conn.close();
      return;
    }

    if (!this.canJoin(role)) {
      conn.send(
        JSON.stringify({ type: 'error', payload: { message: `Role ${role} is already taken` } })
      );
      conn.close();
      return;
    }

    this.participants.set(userId, { userId, role, displayName, connected: true, connId: conn.id });
    this.broadcastParticipants();

    const syncState: SyncState = {
      status: this.sessionStatus,
      participants: this.getParticipantList(),
      questions: this.questions,
    };
    conn.send(JSON.stringify({ type: 'sync', payload: syncState }));
  }

  onClose(conn: Party.Connection) {
    for (const [, p] of this.participants) {
      if (p.connId === conn.id) {
        p.connected = false;
        break;
      }
    }
    this.broadcastParticipants();
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    const senderParticipant = this.findParticipantByConnId(sender.id);
    if (!senderParticipant) return;

    const enriched = { ...msg, sender: senderParticipant.userId, timestamp: Date.now() };

    switch (msg.type) {
      case 'leave':
        this.participants.delete(senderParticipant.userId);
        this.broadcastParticipants();
        return;

      case 'session:start':
        if (senderParticipant.role !== 'interviewer') return;
        this.sessionStatus = 'in_progress';
        this.broadcast(enriched);
        break;

      case 'session:end':
        if (senderParticipant.role !== 'interviewer') return;
        this.sessionStatus = 'completed';
        if (msg.payload?.summary) {
          this.summary = msg.payload.summary;
        }
        this.broadcast(enriched);
        break;

      case 'question:send':
        if (senderParticipant.role !== 'interviewer') return;
        this.questions.push(msg.payload);
        this.broadcast(enriched);
        break;

      case 'answer:send':
        if (senderParticipant.role !== 'interviewee') return;
        this.broadcast(enriched);
        break;

      case 'timer:start':
      case 'timer:stop':
        if (senderParticipant.role !== 'interviewer') return;
        this.broadcast(enriched);
        break;

      case 'feedback:send':
        if (senderParticipant.role === 'interviewee') return;
        this.broadcastToRoles(enriched, ['interviewer', 'reviewer']);
        break;

      case 'question:suggest':
        if (senderParticipant.role !== 'reviewer') return;
        this.broadcastToRoles(enriched, ['interviewer']);
        break;
    }

    this.persistMessage(enriched);
  }

  private canJoin(role: SessionRole): boolean {
    if (role === 'reviewer') return true;
    const existing = [...this.participants.values()].find((p) => p.role === role);
    return !existing || !existing.connected;
  }

  private findParticipantByConnId(connId: string) {
    return [...this.participants.values()].find((p) => p.connId === connId) || null;
  }

  private getParticipantList(): Participant[] {
    return [...this.participants.values()].map(({ connId, ...rest }) => rest);
  }

  private broadcast(msg: unknown) {
    this.room.broadcast(JSON.stringify(msg));
  }

  private broadcastToRoles(msg: unknown, roles: SessionRole[]) {
    const data = JSON.stringify(msg);
    for (const [, participant] of this.participants) {
      if (roles.includes(participant.role) && participant.connected) {
        const conn = this.room.getConnection(participant.connId);
        if (conn) conn.send(data);
      }
    }
  }

  private broadcastParticipants() {
    this.broadcast({ type: 'participants', payload: { participants: this.getParticipantList() } });
  }

  private async persistMessage(msg: unknown, retries = 3) {
    const apiUrl = process.env.NEXT_API_URL;
    const apiSecret = process.env.PARTYKIT_API_SECRET;
    if (!apiUrl) return;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(`${apiUrl}/api/sessions/record`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-secret': apiSecret || '',
          },
          body: JSON.stringify({ sessionId: this.room.id, message: msg }),
        });
        if (res.ok) return;
      } catch {
        // retry
      }
      if (attempt < retries - 1) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}
