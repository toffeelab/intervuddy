import { beforeEach, describe, expect, it } from 'vitest';
import type { RelayedClientMessage, ServerMessage } from '@/types/session-messages';
import { useSessionStore } from './session-store';

describe('session-store', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('setSession으로 sessionId와 myRole 설정', () => {
    useSessionStore.getState().setSession('session-1', 'interviewer');

    const state = useSessionStore.getState();
    expect(state.sessionId).toBe('session-1');
    expect(state.myRole).toBe('interviewer');
  });

  it('participants 메시지로 참가자 목록 업데이트', () => {
    const message: ServerMessage = {
      type: 'participants',
      payload: {
        participants: [
          { userId: 'u1', role: 'interviewer', displayName: 'Alice', connected: true },
          { userId: 'u2', role: 'interviewee', displayName: 'Bob', connected: true },
        ],
      },
    };

    useSessionStore.getState().handleServerMessage(message);

    const state = useSessionStore.getState();
    expect(state.participants).toHaveLength(2);
    expect(state.participants[0].displayName).toBe('Alice');
    expect(state.participants[1].role).toBe('interviewee');
  });

  it('question:send 메시지로 질문 추가 및 currentDisplayOrder 업데이트', () => {
    const message = {
      type: 'question:send',
      payload: { displayOrder: 1, content: '자기소개 해주세요', questionId: 'q-1' },
    } as ServerMessage;

    useSessionStore.getState().handleServerMessage(message);

    const state = useSessionStore.getState();
    expect(state.questions).toHaveLength(1);
    expect(state.questions[0].content).toBe('자기소개 해주세요');
    expect(state.questions[0].questionId).toBe('q-1');
    expect(state.currentDisplayOrder).toBe(1);
  });

  it('answer:send 메시지로 해당 질문에 답변 추가', () => {
    // 먼저 질문 추가
    useSessionStore.getState().handleServerMessage({
      type: 'question:send',
      payload: { displayOrder: 1, content: '자기소개 해주세요' },
    } as ServerMessage);

    // 답변 추가
    const answerMessage: RelayedClientMessage = {
      type: 'answer:send',
      payload: { displayOrder: 1, content: '안녕하세요, 저는...' },
      sender: 'u2',
      timestamp: 1000,
    };

    useSessionStore.getState().handleServerMessage(answerMessage);

    const state = useSessionStore.getState();
    expect(state.questions[0].answer).toBeDefined();
    expect(state.questions[0].answer?.content).toBe('안녕하세요, 저는...');
    expect(state.questions[0].answer?.sender).toBe('u2');
  });

  it('session:start 메시지로 상태를 in_progress로 변경', () => {
    useSessionStore.getState().handleServerMessage({
      type: 'session:start',
    } as ServerMessage);

    expect(useSessionStore.getState().status).toBe('in_progress');
  });

  it('session:end 메시지로 상태를 completed로 변경', () => {
    useSessionStore.getState().handleServerMessage({
      type: 'session:start',
    } as ServerMessage);
    useSessionStore.getState().handleServerMessage({
      type: 'session:end',
    } as ServerMessage);

    expect(useSessionStore.getState().status).toBe('completed');
  });

  it('sync 메시지로 전체 상태 복원', () => {
    const message: ServerMessage = {
      type: 'sync',
      payload: {
        status: 'in_progress',
        participants: [
          { userId: 'u1', role: 'interviewer', displayName: 'Alice', connected: true },
        ],
        questions: [
          { displayOrder: 1, content: '자기소개', questionId: 'q-1' },
          { displayOrder: 2, content: '프로젝트 경험' },
        ],
      },
    };

    useSessionStore.getState().handleServerMessage(message);

    const state = useSessionStore.getState();
    expect(state.status).toBe('in_progress');
    expect(state.participants).toHaveLength(1);
    expect(state.questions).toHaveLength(2);
    expect(state.questions[1].content).toBe('프로젝트 경험');
  });

  it('feedback:send 메시지로 피드백 추가', () => {
    const message: RelayedClientMessage = {
      type: 'feedback:send',
      payload: { displayOrder: 1, content: '좋은 답변이었습니다', score: 4 },
      sender: 'u1',
      timestamp: 2000,
    };

    useSessionStore.getState().handleServerMessage(message);

    const state = useSessionStore.getState();
    expect(state.feedbacks).toHaveLength(1);
    expect(state.feedbacks[0].content).toBe('좋은 답변이었습니다');
    expect(state.feedbacks[0].score).toBe(4);
    expect(state.feedbacks[0].sender).toBe('u1');
  });

  it('reset으로 초기 상태 복원', () => {
    // 상태 변경
    useSessionStore.getState().setSession('session-1', 'interviewer');
    useSessionStore.getState().handleServerMessage({
      type: 'session:start',
    } as ServerMessage);

    // 리셋
    useSessionStore.getState().reset();

    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.status).toBe('waiting');
    expect(state.myRole).toBeNull();
    expect(state.participants).toHaveLength(0);
    expect(state.questions).toHaveLength(0);
    expect(state.feedbacks).toHaveLength(0);
    expect(state.suggestions).toHaveLength(0);
  });
});
