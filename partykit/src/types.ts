// 역할
export type SessionRole = 'interviewer' | 'interviewee' | 'reviewer';

// 기본 메시지 구조
export interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
  sender: string;
  timestamp: number;
}

// 클라이언트 → 서버 메시지
// 참고: join은 onConnect에서 query param으로 처리하므로 ClientMessage에 포함하지 않음
export type ClientMessage =
  | { type: 'leave'; payload: { userId: string } }
  | { type: 'session:start' }
  | { type: 'session:end'; payload?: { summary?: string } }
  | {
      type: 'question:send';
      payload: { questionId?: string; content: string; displayOrder: number; isFollowUp?: boolean };
    }
  | { type: 'answer:send'; payload: { displayOrder: number; content: string } }
  | { type: 'timer:start'; payload: { duration: number } }
  | { type: 'timer:stop' }
  | { type: 'feedback:send'; payload: { displayOrder: number; content: string; score?: number } }
  | { type: 'question:suggest'; payload: { content: string } };

// 릴레이된 클라이언트 메시지 (서버가 sender/timestamp를 추가)
export type RelayedClientMessage = ClientMessage & { sender: string; timestamp: number };

// 서버 → 클라이언트 메시지
export type ServerMessage =
  | { type: 'participants'; payload: { participants: Participant[] } }
  | { type: 'sync'; payload: SyncState }
  | { type: 'error'; payload: { message: string } }
  | RelayedClientMessage;

export interface Participant {
  userId: string;
  role: SessionRole;
  displayName: string;
  connected: boolean;
}

export interface SyncState {
  status: 'waiting' | 'in_progress' | 'completed';
  participants: Participant[];
  questions: Array<{ displayOrder: number; content: string; questionId?: string }>;
  currentQuestion?: { displayOrder: number; content: string };
}
