# Phase 1: 텍스트 기반 실시간 모의면접 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PartyKit WebSocket을 이용한 텍스트 기반 실시간 모의면접 기능을 구현한다. 면접관이 질문을 전송하고 지원자가 답변하며, 검토자가 사이드 채널로 피드백을 남기는 구조.

**Architecture:** Next.js 앱에서 세션 CRUD/초대/결과 페이지를 담당하고, PartyKit 서버가 WebSocket 룸을 관리한다. 브라우저는 `new WebSocket()` API를 직접 사용하며, 메시지 발생 시 PartyKit → Next.js API로 DB에 즉시 저장한다.

**Tech Stack:** PartyKit, WebSocket (브라우저 API), Next.js App Router, Drizzle ORM, PostgreSQL, Zustand, Vitest

**설계 스펙:** `docs/superpowers/specs/2026-03-20-realtime-mock-interview-design.md` (Phase 1 섹션)

**전제 조건:** Phase 0 (ID 마이그레이션) 완료 — `docs/superpowers/plans/2026-03-20-phase0-id-migration.md` 의 13개 태스크가 모두 완료되어 job_descriptions/interview_questions/followup_questions의 PK가 UUID(text)로 변경된 상태여야 한다. Phase 0 미완료 시 FK 타입 불일치로 마이그레이션 실패.

---

## 파일 구조

### PartyKit 서버 (신규 디렉토리)

- `partykit/package.json` — PartyKit 의존성
- `partykit/partykit.json` — PartyKit 설정
- `partykit/tsconfig.json` — TypeScript 설정
- `partykit/src/interview-room.ts` — WebSocket 룸 로직 (메시지 라우팅, 역할 검증, 상태 관리)
- `partykit/src/types.ts` — 공유 메시지 타입 정의

### DB 스키마 (신규 테이블)

- `src/db/schema.ts` — 6개 신규 테이블 추가 + relations

### Data-Access (신규)

- `src/data-access/sessions.ts` — 세션 CRUD
- `src/data-access/session-participants.ts` — 참가자 관리
- `src/data-access/session-invitations.ts` — 초대 링크 관리
- `src/data-access/session-records.ts` — 질문/답변/피드백 저장

### API Routes (신규)

- `src/app/api/sessions/record/route.ts` — PartyKit → DB 저장 엔드포인트

### Server Actions (신규)

- `src/actions/session-actions.ts` — 세션 생성/종료/삭제
- `src/actions/invitation-actions.ts` — 초대 링크 생성/수락

### Pages (신규)

- `src/app/interviews/sessions/page.tsx` — 세션 목록
- `src/app/interviews/sessions/new/page.tsx` — 세션 생성
- `src/app/interviews/sessions/[id]/page.tsx` — 세션 진행 (WebSocket)
- `src/app/interviews/sessions/[id]/result/page.tsx` — 세션 결과
- `src/app/interviews/sessions/join/[code]/page.tsx` — 초대 링크 입장

### Components (신규)

- `src/components/session/session-list.tsx` — 세션 목록 UI
- `src/components/session/session-create-form.tsx` — 세션 생성 폼
- `src/components/session/session-room.tsx` — 면접 진행 룸 (WebSocket 연결)
- `src/components/session/question-panel.tsx` — 면접관용 질문 선택/전송 패널
- `src/components/session/answer-panel.tsx` — 지원자용 답변 입력 패널
- `src/components/session/feedback-panel.tsx` — 피드백/채점 패널 (면접관+검토자)
- `src/components/session/participant-list.tsx` — 참가자 목록 표시
- `src/components/session/waiting-room.tsx` — 대기실 UI
- `src/components/session/session-timer.tsx` — 타이머 컴포넌트
- `src/components/session/session-result.tsx` — 결과 요약 UI

### Hooks (신규)

- `src/lib/hooks/use-websocket.ts` — WebSocket 연결 관리 커스텀 훅 (연결/재연결/메시지 송수신)

### 공유 타입

- `src/types/session-ws.ts` — WebSocket 메시지 타입 (Next.js와 PartyKit 양쪽에서 사용, partykit/src/types.ts에서도 동일 타입 유지)

### Stores (신규)

- `src/stores/session-store.ts` — 세션 진행 중 실시간 상태 (participants, questions, timer 등)

### 환경 설정

- `.env.local` — `NEXT_PUBLIC_PARTYKIT_HOST` 추가
- `.env.example` — 동일 변수 문서화
- `partykit/.env` — `NEXT_API_URL` (PartyKit → Next.js API 호출용)

### 기존 파일 수정

- `src/test/helpers/db.ts` — `truncateAllTables`에 신규 테이블 6개 추가
- `src/data-access/index.ts` — 신규 모듈 4개 barrel export 추가

---

## Task 1: 브랜치 생성

**Files:** 없음

- [ ] **Step 1: feature 브랜치 생성**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/2026-03-20/phase1-realtime-mock-interview
```

---

## Task 2: PartyKit 프로젝트 초기화

**Files:**

- Create: `partykit/package.json`
- Create: `partykit/partykit.json`
- Create: `partykit/tsconfig.json`
- Create: `partykit/src/types.ts`

- [ ] **Step 1: partykit 디렉토리 생성 및 초기화**

```bash
mkdir -p partykit/src
cd partykit
pnpm init
pnpm add partykit
pnpm add -D typescript @types/node
```

- [ ] **Step 2: partykit.json 작성**

```json
{
  "name": "intervuddy-interview",
  "main": "src/interview-room.ts",
  "compatibilityDate": "2024-09-23"
}
```

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 공유 메시지 타입 정의**

`partykit/src/types.ts`:

```typescript
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
  | { type: 'session:end' }
  | {
      type: 'question:send';
      payload: { questionId?: string; content: string; displayOrder: number };
    }
  | { type: 'answer:send'; payload: { displayOrder: number; content: string } }
  | { type: 'timer:start'; payload: { duration: number } }
  | { type: 'timer:stop' }
  | { type: 'feedback:send'; payload: { displayOrder: number; content: string; score?: number } }
  | { type: 'question:suggest'; payload: { content: string } };

// 서버 → 클라이언트 메시지
export type ServerMessage =
  | { type: 'participants'; payload: { participants: Participant[] } }
  | { type: 'sync'; payload: SyncState }
  | { type: 'error'; payload: { message: string } }
  | ClientMessage; // 릴레이된 클라이언트 메시지

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
```

- [ ] **Step 5: 커밋**

```bash
git add partykit/
git commit -m "chore: PartyKit 프로젝트 초기화 및 메시지 타입 정의"
```

---

## Task 3: PartyKit WebSocket 룸 구현

**Files:**

- Create: `partykit/src/interview-room.ts`

- [ ] **Step 1: 기본 룸 클래스 작성**

`partykit/src/interview-room.ts`:

```typescript
import type * as Party from 'partykit/server';
import type { ClientMessage, Participant, SessionRole, SyncState } from './types';

export default class InterviewRoom implements Party.Server {
  private participants: Map<string, Participant & { connId: string }> = new Map();
  private questions: Array<{ displayOrder: number; content: string; questionId?: string }> = [];
  private sessionStatus: 'waiting' | 'in_progress' | 'completed' = 'waiting';

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // JWT 검증은 Phase 2에서 구현, 현재는 query param으로 userId/role 전달
    const url = new URL(ctx.request.url);
    const userId = url.searchParams.get('userId');
    const role = url.searchParams.get('role') as SessionRole | null;
    const displayName = url.searchParams.get('displayName') || 'Anonymous';

    if (!userId || !role) {
      conn.send(JSON.stringify({ type: 'error', payload: { message: 'Missing userId or role' } }));
      conn.close();
      return;
    }

    // 역할 제한 검증
    if (!this.canJoin(role)) {
      conn.send(
        JSON.stringify({ type: 'error', payload: { message: `Role ${role} is already taken` } })
      );
      conn.close();
      return;
    }

    this.participants.set(userId, { userId, role, displayName, connected: true, connId: conn.id });
    this.broadcastParticipants();

    // 재연결 시 현재 상태 동기화
    const syncState: SyncState = {
      status: this.sessionStatus,
      participants: this.getParticipantList(),
      questions: this.questions,
    };
    conn.send(JSON.stringify({ type: 'sync', payload: syncState }));
  }

  onClose(conn: Party.Connection) {
    for (const [userId, p] of this.participants) {
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
        // 면접관 + 검토자에게만 전송 (지원자 제외)
        this.broadcastToRoles(enriched, ['interviewer', 'reviewer']);
        break;

      case 'question:suggest':
        if (senderParticipant.role !== 'reviewer') return;
        // 면접관에게만 전송
        this.broadcastToRoles(enriched, ['interviewer']);
        break;
    }

    // DB 저장을 위해 Next.js API 호출 (비동기, 실패해도 브로드캐스트는 완료됨)
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
        // 재시도
      }
      if (attempt < retries - 1) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
    // 3회 실패 시 로그 기록, 메시지는 이미 브로드캐스트됨
  }
}
```

- [ ] **Step 2: 로컬 PartyKit 서버 실행 테스트**

```bash
cd partykit
npx partykit dev
```

Expected: 로컬 PartyKit 서버 시작

- [ ] **Step 3: 커밋**

```bash
git add partykit/
git commit -m "feat: PartyKit WebSocket 룸 구현 (메시지 라우팅, 역할 검증, 상태 관리)"
```

---

## Task 4: DB 스키마 — 신규 테이블 추가

**Files:**

- Modify: `src/db/schema.ts`

- [ ] **Step 1: 6개 신규 테이블 정의**

`src/db/schema.ts`에 다음 테이블 추가:

```typescript
// ─── interviewSessions ──────────────────────────────────────────────────────
export const interviewSessions = pgTable('interview_sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  status: text('status').notNull().default('waiting'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  qaOwnerId: text('qa_owner_id').references(() => users.id, { onDelete: 'set null' }),
  jdId: text('jd_id').references(() => jobDescriptions.id, { onDelete: 'set null' }),
  categoryId: integer('category_id').references(() => interviewCategories.id, {
    onDelete: 'set null',
  }),
  summary: text('summary'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── sessionParticipants ────────────────────────────────────────────────────
export const sessionParticipants = pgTable(
  'session_participants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('session_participants_unique').on(table.sessionId, table.userId)]
);

// ─── sessionInvitations ─────────────────────────────────────────────────────
export const sessionInvitations = pgTable('session_invitations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  status: text('status').notNull().default('pending'),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── sessionQuestions ───────────────────────────────────────────────────────
export const sessionQuestions = pgTable('session_questions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  questionId: text('question_id').references(() => interviewQuestions.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  displayOrder: integer('display_order').notNull(),
  askedAt: timestamp('asked_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── sessionAnswers ─────────────────────────────────────────────────────────
export const sessionAnswers = pgTable(
  'session_answers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionQuestionId: text('session_question_id')
      .notNull()
      .references(() => sessionQuestions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('session_answers_unique').on(table.sessionQuestionId, table.userId)]
);

// ─── sessionFeedbacks ───────────────────────────────────────────────────────
export const sessionFeedbacks = pgTable(
  'session_feedbacks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionQuestionId: text('session_question_id')
      .notNull()
      .references(() => sessionQuestions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content'),
    score: integer('score'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('session_feedbacks_unique').on(table.sessionQuestionId, table.userId)]
);
```

- [ ] **Step 2: Relations 정의**

```typescript
export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
  creator: one(users, {
    fields: [interviewSessions.createdBy],
    references: [users.id],
    relationName: 'sessionCreator',
  }),
  qaOwner: one(users, {
    fields: [interviewSessions.qaOwnerId],
    references: [users.id],
    relationName: 'sessionQaOwner',
  }),
  jobDescription: one(jobDescriptions, {
    fields: [interviewSessions.jdId],
    references: [jobDescriptions.id],
  }),
  category: one(interviewCategories, {
    fields: [interviewSessions.categoryId],
    references: [interviewCategories.id],
  }),
  participants: many(sessionParticipants),
  invitations: many(sessionInvitations),
  questions: many(sessionQuestions),
}));

export const sessionParticipantsRelations = relations(sessionParticipants, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [sessionParticipants.sessionId],
    references: [interviewSessions.id],
  }),
  user: one(users, { fields: [sessionParticipants.userId], references: [users.id] }),
}));

export const sessionInvitationsRelations = relations(sessionInvitations, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [sessionInvitations.sessionId],
    references: [interviewSessions.id],
  }),
  inviter: one(users, { fields: [sessionInvitations.invitedBy], references: [users.id] }),
}));

export const sessionQuestionsRelations = relations(sessionQuestions, ({ one, many }) => ({
  session: one(interviewSessions, {
    fields: [sessionQuestions.sessionId],
    references: [interviewSessions.id],
  }),
  sourceQuestion: one(interviewQuestions, {
    fields: [sessionQuestions.questionId],
    references: [interviewQuestions.id],
  }),
  answers: many(sessionAnswers),
  feedbacks: many(sessionFeedbacks),
}));

export const sessionAnswersRelations = relations(sessionAnswers, ({ one }) => ({
  sessionQuestion: one(sessionQuestions, {
    fields: [sessionAnswers.sessionQuestionId],
    references: [sessionQuestions.id],
  }),
  user: one(users, { fields: [sessionAnswers.userId], references: [users.id] }),
}));

export const sessionFeedbacksRelations = relations(sessionFeedbacks, ({ one }) => ({
  sessionQuestion: one(sessionQuestions, {
    fields: [sessionFeedbacks.sessionQuestionId],
    references: [sessionQuestions.id],
  }),
  user: one(users, { fields: [sessionFeedbacks.userId], references: [users.id] }),
}));
```

- [ ] **Step 3: schema export에 추가**

`schema` 객체에 신규 테이블과 relations 모두 추가.

- [ ] **Step 4: 테스트 헬퍼 업데이트**

`src/test/helpers/db.ts`의 `truncateAllTables` 함수에 신규 테이블 6개의 DELETE 문 추가 (FK 순서 주의: feedbacks → answers → questions → invitations → participants → sessions):

```typescript
await db.execute(sql`DELETE FROM session_feedbacks`);
await db.execute(sql`DELETE FROM session_answers`);
await db.execute(sql`DELETE FROM session_questions`);
await db.execute(sql`DELETE FROM session_invitations`);
await db.execute(sql`DELETE FROM session_participants`);
await db.execute(sql`DELETE FROM interview_sessions`);
```

- [ ] **Step 5: data-access/index.ts 업데이트**

`src/data-access/index.ts`에 신규 모듈 barrel export 추가.

- [ ] **Step 6: Drizzle 마이그레이션 생성 및 실행**

```bash
pnpm db:generate
pnpm db:migrate
```

- [ ] **Step 7: 커밋**

```bash
git add src/db/schema.ts src/test/helpers/db.ts src/data-access/index.ts drizzle/
git commit -m "feat: 실시간 모의면접 신규 테이블 6개 추가 (스키마 + 마이그레이션 + 테스트 헬퍼)"
```

---

## Task 5: Data-Access 레이어 — 세션 CRUD

**Files:**

- Create: `src/data-access/sessions.ts`
- Test: `src/data-access/sessions.test.ts`

- [ ] **Step 1: 테스트 작성 (Red)**

`src/data-access/sessions.test.ts`:

- `createSession()` — 세션 생성, UUID 반환 확인
- `getSessionById()` — 생성한 세션 조회
- `getSessionsByUserId()` — 내가 만든/참여한 세션 목록
- `updateSessionStatus()` — waiting → in_progress → completed 전환
- `softDeleteSession()` — soft delete 확인

- [ ] **Step 2: 구현 (Green)**

`src/data-access/sessions.ts`:

- `createSession(userId, input)` → `Promise<string>` (세션 ID)
- `getSessionById(userId, sessionId)` → `Promise<Session | null>`
- `getSessionsByUserId(userId)` → `Promise<Session[]>`
- `updateSessionStatus(userId, sessionId, status)` → `Promise<void>` (in_progress 시 startedAt, completed 시 endedAt 자동 기록)
- `softDeleteSession(userId, sessionId)` → `Promise<void>`

- [ ] **Step 3: 테스트 통과 확인**

Run: `pnpm test src/data-access/sessions.test.ts`

- [ ] **Step 4: 커밋**

```bash
git add src/data-access/sessions.ts src/data-access/sessions.test.ts
git commit -m "feat: 세션 CRUD data-access 구현 (TDD)"
```

---

## Task 6: Data-Access 레이어 — 참가자 관리

**Files:**

- Create: `src/data-access/session-participants.ts`
- Test: `src/data-access/session-participants.test.ts`

- [ ] **Step 1: 테스트 작성 (Red)**

- `addParticipant()` — 참가자 추가
- `getParticipants()` — 세션 참가자 목록 조회
- `addParticipant()` 중복 방지 (UNIQUE 제약)
- 역할 제약: interviewer/interviewee 각 1명

- [ ] **Step 2: 구현 (Green)**

- `addParticipant(sessionId, userId, role)` → `Promise<string>`
- `getParticipants(sessionId)` → `Promise<SessionParticipant[]>`
- `getMySessionRole(sessionId, userId)` → `Promise<SessionRole | null>`

- [ ] **Step 3: 테스트 통과 확인**

Run: `pnpm test src/data-access/session-participants.test.ts`

- [ ] **Step 4: 커밋**

```bash
git add src/data-access/session-participants.ts src/data-access/session-participants.test.ts
git commit -m "feat: 세션 참가자 관리 data-access 구현 (TDD)"
```

---

## Task 7: Data-Access 레이어 — 초대 링크

**Files:**

- Create: `src/data-access/session-invitations.ts`
- Test: `src/data-access/session-invitations.test.ts`

- [ ] **Step 1: 테스트 작성 (Red)**

- `createInvitation()` — 초대 링크 생성, invite_code 반환
- `getInvitationByCode()` — 코드로 초대 조회
- `acceptInvitation()` — 수락 시 status 변경 + used_count 증가
- 만료/사용 횟수 초과 검증

- [ ] **Step 2: 구현 (Green)**

- `createInvitation(sessionId, invitedBy, role)` → `Promise<string>` (invite_code)
- `getInvitationByCode(code)` → `Promise<Invitation | null>`
- `acceptInvitation(code, userId)` → `Promise<{ sessionId, role } | null>`

invite_code 생성: `crypto.randomUUID().slice(0, 8)` (짧은 코드)

- [ ] **Step 3: 테스트 통과 확인**

Run: `pnpm test src/data-access/session-invitations.test.ts`

- [ ] **Step 4: 커밋**

```bash
git add src/data-access/session-invitations.ts src/data-access/session-invitations.test.ts
git commit -m "feat: 세션 초대 링크 data-access 구현 (TDD)"
```

---

## Task 8: Data-Access 레이어 — 질문/답변/피드백 기록

**Files:**

- Create: `src/data-access/session-records.ts`
- Test: `src/data-access/session-records.test.ts`

- [ ] **Step 1: 테스트 작성 (Red)**

- `recordQuestion()` — 질문 기록 저장
- `recordAnswer()` — 답변 기록 저장
- `recordFeedback()` — 피드백/채점 저장
- `getSessionRecords()` — 세션의 전체 기록 조회 (질문 + 답변 + 피드백 JOIN)

- [ ] **Step 2: 구현 (Green)**

- `recordQuestion(sessionId, content, displayOrder, questionId?)` → `Promise<string>`
- `recordAnswer(sessionQuestionId, userId, content)` → `Promise<string>`
- `recordFeedback(sessionQuestionId, userId, content?, score?)` → `Promise<string>`
- `getSessionRecords(sessionId)` → 질문별로 답변/피드백을 그룹핑한 구조
- `getSessionQuestionByDisplayOrder(sessionId, displayOrder)` → `Promise<string | null>` (sessionQuestionId 반환, API Route에서 answer/feedback 저장 시 사용)

- [ ] **Step 3: 테스트 통과 확인**

Run: `pnpm test src/data-access/session-records.test.ts`

- [ ] **Step 4: 커밋**

```bash
git add src/data-access/session-records.ts src/data-access/session-records.test.ts
git commit -m "feat: 세션 기록(질문/답변/피드백) data-access 구현 (TDD)"
```

---

## Task 9: API Route — PartyKit → DB 저장 엔드포인트

**Files:**

- Create: `src/app/api/sessions/record/route.ts`

- [ ] **Step 1: API Route 작성**

`src/app/api/sessions/record/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import {
  recordQuestion,
  recordAnswer,
  recordFeedback,
  getSessionQuestionByDisplayOrder,
} from '@/data-access/session-records';
import { updateSessionStatus } from '@/data-access/sessions';

export async function POST(request: Request) {
  // PartyKit 서버에서 호출하는 내부 API — 공유 시크릿으로 인증
  const authHeader = request.headers.get('x-api-secret');
  if (authHeader !== process.env.PARTYKIT_API_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { sessionId, message } = await request.json();

  try {
    switch (message.type) {
      case 'question:send':
        await recordQuestion(
          sessionId,
          message.payload.content,
          message.payload.displayOrder,
          message.payload.questionId
        );
        break;
      case 'answer:send': {
        const sqId = await getSessionQuestionByDisplayOrder(
          sessionId,
          message.payload.displayOrder
        );
        if (sqId) await recordAnswer(sqId, message.sender, message.payload.content);
        break;
      }
      case 'feedback:send': {
        const sqId = await getSessionQuestionByDisplayOrder(
          sessionId,
          message.payload.displayOrder
        );
        if (sqId)
          await recordFeedback(
            sqId,
            message.sender,
            message.payload.content,
            message.payload.score
          );
        break;
      }
      case 'session:start':
        await updateSessionStatus(message.sender, sessionId, 'in_progress');
        break;
      case 'session:end':
        await updateSessionStatus(message.sender, sessionId, 'completed');
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
```

`PARTYKIT_API_SECRET` 환경변수를 `.env.local`과 `partykit/.env`에 동일 값으로 설정.

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/sessions/record/route.ts
git commit -m "feat: PartyKit → DB 저장 API Route 추가"
```

---

## Task 10: Server Actions — 세션 생성/초대

**Files:**

- Create: `src/actions/session-actions.ts`
- Create: `src/actions/invitation-actions.ts`

- [ ] **Step 1: session-actions.ts 작성**

```typescript
'use server';
import { getCurrentUserId } from '@/lib/auth';
import { createSession, softDeleteSession } from '@/data-access/sessions';
import { addParticipant } from '@/data-access/session-participants';
import { revalidatePath } from 'next/cache';

export async function createSessionAction(input: {
  title: string;
  myRole: 'interviewer' | 'interviewee';
  qaOwnerId: string;
  jdId?: string;
  categoryId?: number;
}) {
  const userId = await getCurrentUserId();
  const sessionId = await createSession(userId, input);
  await addParticipant(sessionId, userId, input.myRole);
  revalidatePath('/interviews/sessions');
  return sessionId;
}

export async function deleteSessionAction(sessionId: string) {
  const userId = await getCurrentUserId();
  await softDeleteSession(userId, sessionId);
  revalidatePath('/interviews/sessions');
}
```

- [ ] **Step 2: invitation-actions.ts 작성**

```typescript
'use server';
import { getCurrentUserId } from '@/lib/auth';
import { createInvitation, acceptInvitation } from '@/data-access/session-invitations';
import { addParticipant } from '@/data-access/session-participants';

export async function createInvitationAction(
  sessionId: string,
  role: 'interviewer' | 'interviewee' | 'reviewer'
) {
  const userId = await getCurrentUserId();
  const inviteCode = await createInvitation(sessionId, userId, role);
  return inviteCode;
}

export async function acceptInvitationAction(code: string) {
  const userId = await getCurrentUserId();
  const result = await acceptInvitation(code, userId);
  if (!result) throw new Error('Invalid or expired invitation');
  await addParticipant(result.sessionId, userId, result.role);
  return result.sessionId;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/actions/session-actions.ts src/actions/invitation-actions.ts
git commit -m "feat: 세션 생성/초대 Server Actions 추가"
```

---

## Task 11: WebSocket 커스텀 훅

**Files:**

- Create: `src/lib/hooks/use-websocket.ts`

- [ ] **Step 1: useWebSocket 훅 작성**

```typescript
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage } from '@/types/session-ws';

interface UseWebSocketOptions {
  sessionId: string;
  userId: string;
  role: string;
  displayName: string;
  onMessage: (msg: ServerMessage) => void;
}

export function useWebSocket({
  sessionId,
  userId,
  role,
  displayName,
  onMessage,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptRef = useRef(0);

  const connect = useCallback(() => {
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
    if (!host) return;

    const params = new URLSearchParams({ userId, role, displayName });
    const ws = new WebSocket(`wss://${host}/party/${sessionId}?${params}`);

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        onMessage(msg);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Exponential backoff 재연결
      const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30000);
      reconnectAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    wsRef.current = ws;
  }, [sessionId, userId, role, displayName, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, send };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/hooks/use-websocket.ts src/types/session-ws.ts
git commit -m "feat: WebSocket 연결 관리 커스텀 훅 + 공유 타입 추가"
```

---

## Task 12: Zustand 세션 스토어

**Files:**

- Create: `src/stores/session-store.ts`

- [ ] **Step 1: 세션 스토어 작성**

```typescript
import { create } from 'zustand';
import type { Participant } from '@/types/session-ws';

interface SessionQuestion {
  displayOrder: number;
  content: string;
  questionId?: string;
  answer?: string;
  feedbacks: Array<{ userId: string; displayName: string; content: string; score?: number }>;
}

interface SessionStore {
  status: 'waiting' | 'in_progress' | 'completed';
  participants: Participant[];
  questions: SessionQuestion[];
  timerEndAt: number | null;

  setStatus: (status: 'waiting' | 'in_progress' | 'completed') => void;
  setParticipants: (participants: Participant[]) => void;
  addQuestion: (q: { displayOrder: number; content: string; questionId?: string }) => void;
  addAnswer: (displayOrder: number, content: string) => void;
  addFeedback: (
    displayOrder: number,
    feedback: { userId: string; displayName: string; content: string; score?: number }
  ) => void;
  setTimer: (endAt: number | null) => void;
  syncState: (state: {
    status: string;
    participants: Participant[];
    questions: SessionQuestion[];
  }) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  status: 'waiting',
  participants: [],
  questions: [],
  timerEndAt: null,

  setStatus: (status) => set({ status }),
  setParticipants: (participants) => set({ participants }),
  addQuestion: (q) => set((s) => ({ questions: [...s.questions, { ...q, feedbacks: [] }] })),
  addAnswer: (displayOrder, content) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.displayOrder === displayOrder ? { ...q, answer: content } : q
      ),
    })),
  addFeedback: (displayOrder, feedback) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.displayOrder === displayOrder ? { ...q, feedbacks: [...q.feedbacks, feedback] } : q
      ),
    })),
  setTimer: (endAt) => set({ timerEndAt: endAt }),
  syncState: (state) =>
    set({
      status: state.status as 'waiting' | 'in_progress' | 'completed',
      participants: state.participants,
      questions: state.questions,
    }),
  reset: () => set({ status: 'waiting', participants: [], questions: [], timerEndAt: null }),
}));
```

- [ ] **Step 2: 커밋**

```bash
git add src/stores/session-store.ts
git commit -m "feat: 세션 실시간 상태 Zustand 스토어 추가"
```

---

## Task 13: 세션 생성 페이지

**Files:**

- Create: `src/app/interviews/sessions/new/page.tsx`
- Create: `src/components/session/session-create-form.tsx`

프론트엔드 컨벤션: `docs/agent_docs/frontend-conventions.md` 참조

- [ ] **Step 1: 세션 생성 폼 컴포넌트 (Client)**

`session-create-form.tsx` — 제목, 내 역할(면접관/지원자), Q&A 소유자, JD/카테고리 선택 폼.
`createSessionAction` 호출 후 세션 페이지로 라우팅.

- [ ] **Step 2: 세션 생성 페이지 (Server)**

`new/page.tsx` — Server Component. 현재 사용자의 JD 목록과 카테고리 목록을 fetch하여 폼에 전달.

- [ ] **Step 3: 커밋**

```bash
git add src/app/interviews/sessions/new/ src/components/session/session-create-form.tsx
git commit -m "feat: 세션 생성 페이지 및 폼 컴포넌트 추가"
```

---

## Task 14: 세션 목록 페이지

**Files:**

- Create: `src/app/interviews/sessions/page.tsx`
- Create: `src/components/session/session-list.tsx`

- [ ] **Step 1: 세션 목록 컴포넌트 (Client)**

`session-list.tsx` — 세션 카드 리스트. 상태(대기중/진행중/완료) 배지, 참가자 수, 생성일 표시.

- [ ] **Step 2: 세션 목록 페이지 (Server)**

`page.tsx` — `getSessionsByUserId(userId)` 호출. 세션 생성 버튼.

- [ ] **Step 3: 커밋**

```bash
git add src/app/interviews/sessions/page.tsx src/components/session/session-list.tsx
git commit -m "feat: 세션 목록 페이지 추가"
```

---

## Task 15: 초대 링크 입장 페이지

**Files:**

- Create: `src/app/interviews/sessions/join/[code]/page.tsx`

- [ ] **Step 1: 초대 입장 페이지**

`join/[code]/page.tsx` — 코드로 초대 정보 조회 → 유효하면 `acceptInvitationAction` 호출 → 세션 페이지로 리다이렉트. 만료/사용 초과 시 에러 표시.

- [ ] **Step 2: 커밋**

```bash
git add src/app/interviews/sessions/join/
git commit -m "feat: 초대 링크 입장 페이지 추가"
```

---

## Task 16: 세션 진행 페이지 — 대기실 + 룸

**Files:**

- Create: `src/app/interviews/sessions/[id]/page.tsx`
- Create: `src/components/session/session-room.tsx`
- Create: `src/components/session/waiting-room.tsx`
- Create: `src/components/session/participant-list.tsx`

- [ ] **Step 1: 세션 진행 페이지 (Server)**

`[id]/page.tsx` — 세션 정보 + 참가자의 역할을 조회하여 Client Component에 전달.

- [ ] **Step 2: session-room.tsx (Client)**

WebSocket 메인 컨테이너:

- `useWebSocket` 훅으로 연결
- 수신 메시지를 `useSessionStore`에 반영
- `status`에 따라 `waiting-room` 또는 면접 진행 UI 표시
- 역할에 따라 다른 패널 렌더링

- [ ] **Step 3: waiting-room.tsx (Client)**

대기실 UI:

- 참가자 목록 (역할, 연결 상태 표시)
- 면접관만 "면접 시작" 버튼 표시
- 초대 링크 생성/복사 기능

- [ ] **Step 4: participant-list.tsx (Client)**

참가자 목록 컴포넌트 (대기실 + 진행 중 양쪽에서 사용).

- [ ] **Step 5: 커밋**

```bash
git add src/app/interviews/sessions/[id]/page.tsx src/components/session/
git commit -m "feat: 세션 진행 페이지 + 대기실 + 참가자 목록 UI"
```

---

## Task 17: 면접 진행 UI — 질문/답변/피드백 패널

**Files:**

- Create: `src/components/session/question-panel.tsx`
- Create: `src/components/session/answer-panel.tsx`
- Create: `src/components/session/feedback-panel.tsx`
- Create: `src/components/session/session-timer.tsx`

- [ ] **Step 1: question-panel.tsx (면접관용)**

Q&A 라이브러리에서 질문 선택 또는 직접 타이핑 → `question:send` 메시지 전송.
지원자의 답변을 실시간으로 표시.

- [ ] **Step 2: answer-panel.tsx (지원자용)**

현재 질문 표시 + 답변 입력 텍스트 영역 → `answer:send` 메시지 전송.

- [ ] **Step 3: feedback-panel.tsx (면접관+검토자용)**

질문별 피드백 텍스트 + 점수(1-5) 입력 → `feedback:send` 메시지 전송.
질문 제안 입력 → `question:suggest` 메시지 전송 (검토자만).

- [ ] **Step 4: session-timer.tsx**

타이머 UI. 면접관이 시작/정지 조작, 모든 참가자에게 동기화.

- [ ] **Step 5: 커밋**

```bash
git add src/components/session/
git commit -m "feat: 면접 진행 UI 패널들 추가 (질문/답변/피드백/타이머)"
```

---

## Task 18: 세션 결과 페이지

**Files:**

- Create: `src/app/interviews/sessions/[id]/result/page.tsx`
- Create: `src/components/session/session-result.tsx`

- [ ] **Step 1: 결과 페이지 (Server)**

`result/page.tsx` — `getSessionRecords(sessionId)` 호출. 질문별 답변 + 피드백/채점을 타임라인 형태로 표시.

- [ ] **Step 2: session-result.tsx (Client)**

결과 표시 컴포넌트:

- 질문 목록 (순서대로)
- 각 질문의 답변 텍스트
- 면접관/검토자별 피드백 및 점수
- 전체 평균 점수 (있는 경우)

- [ ] **Step 3: 커밋**

```bash
git add src/app/interviews/sessions/[id]/result/ src/components/session/session-result.tsx
git commit -m "feat: 세션 결과 페이지 추가"
```

---

## Task 19: 환경 설정 & 네비게이션

**Files:**

- Modify: `.env.example`
- Modify: 기존 네비게이션/레이아웃 (해당되는 곳)

- [ ] **Step 1: 환경 변수 문서화**

`.env.example`에 추가:

```
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
PARTYKIT_API_SECRET=your-shared-secret-here
```

`.env.local`에도 동일하게 설정.

`partykit/.env`에 추가:

```
NEXT_API_URL=http://localhost:3000
PARTYKIT_API_SECRET=your-shared-secret-here
```

- [ ] **Step 2: 네비게이션에 세션 메뉴 추가**

기존 사이드바/헤더에 "모의면접" 메뉴 항목 추가 → `/interviews/sessions` 링크.

- [ ] **Step 3: 커밋**

```bash
git add .env.example src/
git commit -m "chore: 환경 변수 설정 및 네비게이션에 모의면접 메뉴 추가"
```

---

## Task 20: 전체 검증

> verification-before-completion 스킬 사용 권장

**Files:** 없음

- [ ] **Step 1: 린트 + 타입 검사**

```bash
pnpm lint
pnpm exec tsc --noEmit
```

- [ ] **Step 2: 테스트 실행**

```bash
pnpm test
```

- [ ] **Step 3: 빌드 확인**

```bash
pnpm build
```

- [ ] **Step 4: E2E 수동 테스트**

1. 로컬 PartyKit 서버 시작: `cd partykit && npx partykit dev`
2. Next.js 개발 서버 시작: `pnpm dev`
3. 브라우저 2개로 테스트:
   - 탭 A: 세션 생성 (면접관 역할)
   - 초대 링크 복사
   - 탭 B: 초대 링크로 입장 (지원자 역할)
   - 대기실에서 양쪽 참가자 확인
   - 면접 시작 → 질문 전송 → 답변 입력
   - 면접 종료 → 결과 페이지 확인

- [ ] **Step 5: Phase 1 완료 확인**

스펙 문서와 대조:

- [x] PartyKit WebSocket 연결 동작
- [x] 세션 생성/초대/입장 흐름 완성
- [x] 역할별 메시지 라우팅 (피드백: 지원자 제외, 질문 제안: 면접관만)
- [x] 질문/답변/피드백 DB 저장
- [x] 세션 결과 조회
- [x] 재연결 시 상태 동기화

---

## 주의사항

- **Phase 0 완료 필수**: 이 계획의 Task 4에서 `jdId: text(...)` FK가 `jobDescriptions.id`를 참조하므로, Phase 0에서 해당 PK가 text(UUID)로 변경된 상태여야 한다.
- PartyKit 서버는 Next.js와 **독립 배포**. monorepo에서 별도 디렉토리로 관리. pnpm workspace에 추가 여부는 프로젝트 상황에 따라 결정.
- **공유 타입**: WebSocket 메시지 타입은 `src/types/session-ws.ts`에 정의하고, `partykit/src/types.ts`에서 동일 타입을 유지한다. `partykit/`에서 Next.js `src/` 외부를 직접 import하지 않는다.
- JWT 인증은 Phase 2에서 구현. Phase 1에서는 query param으로 userId/role 전달 (개발/테스트 용도). 단, **API Route는 `PARTYKIT_API_SECRET` 공유 시크릿으로 인증**한다.
- DB 저장은 **낙관적 브로드캐스트** — 메시지를 먼저 브로드캐스트하고 비동기로 DB 저장. 저장 실패 시 최대 3회 재시도.
- `join` 메시지는 `onConnect`에서 query param으로 처리. ClientMessage 타입에 포함하지 않음.
- PartyKit URL 형식: 로컬 개발 시 `ws://${host}/parties/intervuddy-interview/${sessionId}` — `partykit.json`의 name에 따라 다를 수 있으므로 로컬 테스트 시 확인 필요.
- 컴포넌트 스타일링은 `docs/agent_docs/frontend-conventions.md` 참조 (Tailwind CSS v4 + shadcn/ui).
- `console.log`/`console.error` 사용 금지 (CLAUDE.md 규칙). PartyKit 서버 로그는 Cloudflare의 로그 시스템 활용.
