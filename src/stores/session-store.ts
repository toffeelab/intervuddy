import { create } from 'zustand';
import type { Participant, ServerMessage, SessionRole } from '@/types/session-messages';

interface SessionQuestion {
  displayOrder: number;
  content: string;
  questionId?: string;
  isFollowUp?: boolean;
  answer?: { content: string; sender: string; timestamp: number };
}

interface SessionFeedback {
  displayOrder: number;
  content: string;
  score?: number;
  sender: string;
  timestamp: number;
}

interface QuestionSuggestion {
  content: string;
  sender: string;
  timestamp: number;
}

interface SessionState {
  sessionId: string | null;
  status: 'waiting' | 'in_progress' | 'completed';
  myRole: SessionRole | null;
  participants: Participant[];
  questions: SessionQuestion[];
  currentDisplayOrder: number;
  timerDuration: number | null;
  timerStartedAt: number | null;
  feedbacks: SessionFeedback[];
  suggestions: QuestionSuggestion[];
  summary: string | null;

  // Actions
  setSession: (sessionId: string, role: SessionRole) => void;
  handleServerMessage: (message: ServerMessage) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  status: 'waiting' as const,
  myRole: null,
  participants: [] as Participant[],
  questions: [] as SessionQuestion[],
  currentDisplayOrder: 0,
  timerDuration: null,
  timerStartedAt: null,
  feedbacks: [] as SessionFeedback[],
  suggestions: [] as QuestionSuggestion[],
  summary: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setSession: (sessionId, role) => set({ sessionId, myRole: role }),

  handleServerMessage: (message) => {
    switch (message.type) {
      case 'participants':
        set({ participants: message.payload.participants });
        break;

      case 'sync':
        set({
          status: message.payload.status,
          participants: message.payload.participants,
          questions: message.payload.questions.map((q) => ({
            displayOrder: q.displayOrder,
            content: q.content,
            questionId: q.questionId,
          })),
        });
        break;

      case 'session:start':
        set({ status: 'in_progress' });
        break;

      case 'session:end':
        set({
          status: 'completed',
          summary: message.payload?.summary ?? null,
        });
        break;

      case 'question:send':
        set((state) => ({
          questions: [
            ...state.questions,
            {
              displayOrder: message.payload.displayOrder,
              content: message.payload.content,
              questionId: message.payload.questionId,
              isFollowUp: message.payload.isFollowUp,
            },
          ],
          currentDisplayOrder: message.payload.displayOrder,
        }));
        break;

      case 'answer:send':
        set((state) => ({
          questions: state.questions.map((q) =>
            q.displayOrder === message.payload.displayOrder
              ? {
                  ...q,
                  answer: {
                    content: message.payload.content,
                    sender: (message as unknown as { sender: string }).sender,
                    timestamp: (message as unknown as { timestamp: number }).timestamp,
                  },
                }
              : q
          ),
        }));
        break;

      case 'timer:start':
        set({
          timerDuration: message.payload.duration,
          timerStartedAt: Date.now(),
        });
        break;

      case 'timer:stop':
        set({ timerDuration: null, timerStartedAt: null });
        break;

      case 'feedback:send':
        set((state) => ({
          feedbacks: [
            ...state.feedbacks,
            {
              displayOrder: message.payload.displayOrder,
              content: message.payload.content,
              score: message.payload.score,
              sender: (message as unknown as { sender: string }).sender,
              timestamp: (message as unknown as { timestamp: number }).timestamp,
            },
          ],
        }));
        break;

      case 'question:suggest':
        set((state) => ({
          suggestions: [
            ...state.suggestions,
            {
              content: message.payload.content,
              sender: (message as unknown as { sender: string }).sender,
              timestamp: (message as unknown as { timestamp: number }).timestamp,
            },
          ],
        }));
        break;
    }
  },

  reset: () => set(initialState),
}));
