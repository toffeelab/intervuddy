# Phase 1: 텍스트 기반 실시간 모의면접 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PartyKit WebSocket을 사용하여 면접관/지원자/검토자가 실시간으로 모의면접을 진행하고, 질문/답변/피드백을 기록하는 텍스트 기반 모의면접 기능 구현

**Architecture:** Next.js App Router 기반 페이지 + PartyKit 독립 서버(WebSocket 룸) + PostgreSQL 영속화. 프론트엔드에서 브라우저 WebSocket API를 직접 사용하고, PartyKit 서버가 메시지 라우팅 및 Next.js API Route 호출을 통해 DB 저장 처리.

**Tech Stack:** PartyKit, WebSocket (브라우저 API), Drizzle ORM, Zustand, Next.js 16 App Router, Vitest

**전제 조건:** Phase 0 (ID 마이그레이션) 완료 — `job_descriptions`, `interview_questions`, `followup_questions` PK가 UUID(text)

**스펙 문서:** `docs/superpowers/specs/2026-03-20-realtime-mock-interview-design.md`

---

## 파일 구조

### 신규 생성

```
partykit/                              # PartyKit 독립 프로젝트
├── package.json
├── partykit.json
├── tsconfig.json
└── src/
    ├── types.ts                       # WS 메시지 타입 (공유)
    └── interview-room.ts             # WebSocket 룸 로직

src/types/session-messages.ts          # WS 메시지 타입 (Next.js 측 복사본)

src/db/schema.ts                       # 신규 6개 테이블 추가

src/data-access/
├── sessions.ts                        # 세션 CRUD
├── sessions.test.ts
├── session-participants.ts            # 참가자 CRUD
├── session-participants.test.ts
├── session-invitations.ts             # 초대 CRUD
├── session-invitations.test.ts
├── session-records.ts                 # 질문/답변/피드백 기록
├── session-records.test.ts
└── index.ts                           # barrel export 업데이트

src/actions/
├── session-actions.ts                 # 세션 관리 Server Actions
└── session-actions.test.ts

src/app/api/sessions/record/route.ts   # PartyKit → DB 저장 API Route

src/lib/hooks/use-websocket.ts         # WebSocket 연결/재연결 훅

src/stores/session-store.ts            # 세션 UI 상태 관리

src/app/interviews/sessions/
├── page.tsx                           # 세션 목록
├── new/page.tsx                       # 세션 생성
├── [id]/page.tsx                      # 세션 진행 (WebSocket)
├── [id]/result/page.tsx               # 세션 결과
└── join/[code]/page.tsx               # 초대 링크 입장

src/components/session/
├── session-list.tsx                   # 세션 목록 컴포넌트
├── session-create-form.tsx            # 세션 생성 폼
├── session-waiting-room.tsx           # 대기실
├── session-interview-room.tsx         # 면접 진행 UI
├── session-question-panel.tsx         # 면접관: 질문 선택/전송
├── session-answer-panel.tsx           # 지원자: 답변 입력
├── session-feedback-panel.tsx         # 피드백/채점 사이드패널
├── session-timer.tsx                  # 타이머
├── session-participants-bar.tsx       # 참가자 표시
└── session-result-view.tsx            # 결과 확인

src/test/helpers/db.ts                 # truncateAllTables 업데이트
```

### 수정

```
src/data-access/index.ts               # 신규 모듈 re-export 추가
src/data-access/types.ts               # 세션 관련 인터페이스 추가
src/test/helpers/db.ts                  # 신규 테이블 DELETE 추가
data/seed.sample.ts                    # 샘플 세션 데이터 추가
```

### 스펙 대비 의도적 변경 사항

- **`session_feedbacks` UNIQUE 제약 제거**: 스펙은 `(session_question_id, user_id)` UNIQUE를 정의하지만, 검토자가 질문별로 여러 피드백을 남길 수 있도록 의도적으로 제거. 스펙 업데이트 필요.
- **`join` 메시지를 `ClientMessage`에서 제외**: 스펙은 `join`을 클라이언트 메시지로 정의하지만, 구현에서는 `onConnect` 시 URL query param으로 처리. 별도 `join` 메시지 불필요.

---

## Task 1: PartyKit 프로젝트 초기화

**Files:**
- Create: `partykit/package.json`
- Create: `partykit/partykit.json`
- Create: `partykit/tsconfig.json`
- Create: `partykit/.gitignore`

- [ ] **Step 1: PartyKit 디렉토리 생성 및 초기화**

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
  "$schema": "https://www.partykit.io/schema.json",
  "name": "intervuddy-sessions",
  "main": "src/interview-room.ts",
  "compatibilityDate": "2024-09-23"
}
```

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["@types/node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: 최소한의 interview-room.ts 작성 (연결 확인용)**

```typescript
import type { Party, PartyConnection, PartyServer } from "partykit/server";

export default {
  onConnect(conn: PartyConnection, room: Party) {
    conn.send(JSON.stringify({ type: "connected", payload: { roomId: room.id } }));
  },
  onMessage(message: string, conn: PartyConnection, room: Party) {
    // 추후 구현
  },
} satisfies PartyServer;
```

- [ ] **Step 5: 로컬 서버 시작 테스트**

```bash
cd partykit && npx partykit dev
```
Expected: 로컬 서버가 시작되고 WebSocket 연결 가능 확인

- [ ] **Step 6: 커밋**

```bash
git add partykit/
git commit -m "chore: PartyKit 프로젝트 초기화"
```

---

## Task 2: WebSocket 메시지 타입 정의

**Files:**
- Create: `partykit/src/types.ts`
- Create: `src/types/session-messages.ts`

타입 파일은 PartyKit 서버와 Next.js 클라이언트 양쪽에서 사용한다. Next.js는 `partykit/` 외부 경로를 import할 수 없으므로 동일한 타입을 복사하여 유지한다.

- [ ] **Step 1: 메시지 타입 정의 (`partykit/src/types.ts`)**

스펙 섹션 5의 메시지 프로토콜을 TypeScript 타입으로 정의한다.

```typescript
// ── Roles ──
export type SessionRole = 'interviewer' | 'interviewee' | 'reviewer';
export type SessionStatus = 'waiting' | 'in_progress' | 'completed';

// ── Participant ──
export interface Participant {
  userId: string;
  role: SessionRole;
  displayName: string;
  isConnected: boolean;
}

// ── Client → Server Messages ──
export type ClientMessage =
  | { type: 'leave'; payload: { userId: string } }
  | { type: 'session:start' }
  | { type: 'session:end' }
  | { type: 'question:send'; payload: { questionId?: string; content: string; displayOrder: number } }
  | { type: 'answer:send'; payload: { displayOrder: number; content: string } }
  | { type: 'timer:start'; payload: { duration: number } }
  | { type: 'timer:stop' }
  | { type: 'feedback:send'; payload: { displayOrder: number; content: string; score?: number } }
  | { type: 'question:suggest'; payload: { content: string } };

// ── Server → Client Messages ──
export type ServerMessage =
  | { type: 'connected'; payload: { roomId: string } }
  | { type: 'participants'; payload: { participants: Participant[] } }
  | { type: 'session:start'; sender: string; timestamp: number }
  | { type: 'session:end'; sender: string; timestamp: number }
  | { type: 'question:send'; payload: { questionId?: string; content: string; displayOrder: number }; sender: string; timestamp: number }
  | { type: 'answer:send'; payload: { displayOrder: number; content: string }; sender: string; timestamp: number }
  | { type: 'timer:start'; payload: { duration: number }; sender: string; timestamp: number }
  | { type: 'timer:stop'; sender: string; timestamp: number }
  | { type: 'feedback:send'; payload: { displayOrder: number; content: string; score?: number }; sender: string; timestamp: number }
  | { type: 'question:suggest'; payload: { content: string }; sender: string; timestamp: number }
  | { type: 'sync'; payload: { status: SessionStatus; participants: Participant[]; questions: SyncQuestion[]; currentDisplayOrder?: number } }
  | { type: 'error'; payload: { message: string } };

// ── Sync State ──
export interface SyncQuestion {
  displayOrder: number;
  content: string;
  questionId?: string;
  answer?: string;
}
```

- [ ] **Step 2: Next.js 측 타입 복사 (`src/types/session-messages.ts`)**

`partykit/src/types.ts`와 동일한 내용을 복사. 파일 상단에 다음 주석을 추가:

```typescript
/**
 * WebSocket 메시지 타입 정의
 * ⚠️ partykit/src/types.ts와 동기화 유지 필요
 * Next.js는 partykit/ 외부 경로를 import할 수 없으므로 복사본 유지
 */
```

- [ ] **Step 3: 커밋**

```bash
git add partykit/src/types.ts src/types/session-messages.ts
git commit -m "feat: WebSocket 메시지 타입 정의"
```

---

## Task 3: PartyKit 룸 구현

**Files:**
- Modify: `partykit/src/interview-room.ts`

스펙 섹션 5의 메시지 라우팅 규칙과 섹션 8의 인증/재연결 전략을 구현한다.

- [ ] **Step 1: 전체 룸 로직 구현**

핵심 구현 사항:
1. **`onConnect`**: URL query param에서 `userId`, `role`, `displayName`, `token` 추출. 참가자 등록 + `participants` 브로드캐스트
2. **`onMessage`**: `ClientMessage` 타입별 분기 처리
3. **메시지 라우팅**:
   - `feedback:send` → 면접관 + 검토자만 (지원자 제외)
   - `question:suggest` → 면접관만
   - 나머지 → 전체
4. **`onClose`**: 참가자 제거 + `participants` 브로드캐스트
5. **`sync` 메시지**: 재연결 시 현재 상태 전송 (룸 메모리에 상태 유지)
6. **`leave` 메시지**: 명시적 퇴장 처리
7. **역할 제한**: `session:start`, `session:end`, `question:send` → 면접관만
8. **DB 영속화**: `persistMessage()` 메서드 — `NEXT_API_URL` 환경변수로 Next.js API Route 호출, 재시도 최대 3회

참고: JWT 인증 검증은 Phase 2에서 구현. Phase 1에서는 query param의 userId/role을 신뢰.

- [ ] **Step 2: 로컬 테스트**

```bash
cd partykit && npx partykit dev
```

브라우저 콘솔에서 WebSocket 연결 및 메시지 교환 테스트:
```javascript
const ws = new WebSocket('ws://localhost:1999/parties/main/test-room?userId=user1&role=interviewer&displayName=Test');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({ type: 'session:start' }));
```

- [ ] **Step 3: 커밋**

```bash
git add partykit/src/interview-room.ts
git commit -m "feat: PartyKit 모의면접 룸 로직 구현"
```

---

## Task 4: DB 스키마 추가 (6개 신규 테이블)

**Files:**
- Modify: `src/db/schema.ts`

스펙 섹션 6의 Phase 1 신규 테이블을 Drizzle 스키마로 정의한다.

- [ ] **Step 1: 6개 테이블 + relations 추가**

`src/db/schema.ts`에 다음 테이블을 추가한다. 기존 `followupQuestions` 정의 이후, relations 정의 이전에 위치:

1. `interviewSessions` — 모의면접 세션
2. `sessionParticipants` — 세션 참가자 (UNIQUE: session_id + user_id)
3. `sessionInvitations` — 초대 링크 (UNIQUE: invite_code)
4. `sessionQuestions` — 면접 질문 기록
5. `sessionAnswers` — 답변 기록 (UNIQUE: session_question_id + user_id)
6. `sessionFeedbacks` — 피드백/채점 (UNIQUE 없음 — 여러 피드백 허용)

스펙의 컬럼 정의를 그대로 따르되:
- 모든 PK: `text('id').$defaultFn(() => crypto.randomUUID())`
- FK 타입은 참조 대상과 일치 (`users.id` → text, `interviewCategories.id` → integer, 나머지 → text)
- `qa_owner_id`: nullable + ON DELETE SET NULL
- `session_feedbacks`: UNIQUE 제약 제거 (리뷰 피드백: 여러 피드백 허용)

relations도 추가:
- `interviewSessions` ↔ `users` (createdBy, qaOwner)
- `interviewSessions` ↔ `jobDescriptions`, `interviewCategories`
- `interviewSessions` ← `sessionParticipants`, `sessionInvitations`, `sessionQuestions`
- `sessionQuestions` ← `sessionAnswers`, `sessionFeedbacks`

schema export 객체에도 모든 신규 테이블/relations 추가.

- [ ] **Step 2: 마이그레이션 생성**

```bash
pnpm db:generate
```

생성된 SQL 파일 확인 — 6개 테이블 CREATE + 인덱스 + UNIQUE 제약 포함 확인.

- [ ] **Step 3: 마이그레이션 실행**

```bash
pnpm db:migrate
```

- [ ] **Step 4: 커밋**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: 모의면접 세션 DB 스키마 6개 테이블 추가"
```

---

## Task 5: 테스트 헬퍼 업데이트

**Files:**
- Modify: `src/test/helpers/db.ts`

신규 6개 테이블을 `truncateAllTables`에 추가하여 테스트 격리를 보장한다.

- [ ] **Step 1: truncateAllTables에 DELETE 문 추가**

FK 의존성 순서(자식 먼저):
```sql
DELETE FROM session_feedbacks
DELETE FROM session_answers
DELETE FROM session_questions
DELETE FROM session_invitations
DELETE FROM session_participants
DELETE FROM interview_sessions
```

기존 DELETE 문들 (`DELETE FROM followup_questions` 이전)에 추가.

- [ ] **Step 2: seedTestSession 헬퍼 함수 추가**

테스트에서 사용할 세션 시드 함수:
```typescript
export async function seedTestSession(db: NodePgDatabase<typeof schema>): Promise<void> {
  // interviewSessions 1개 생성 (status: 'waiting', createdBy: DEFAULT_USER_ID)
  // sessionParticipants 1개 생성 (interviewer)
}
```

- [ ] **Step 3: 기존 테스트 통과 확인**

```bash
pnpm test
```
Expected: 기존 159개 테스트 모두 통과

- [ ] **Step 4: 커밋**

```bash
git add src/test/helpers/db.ts
git commit -m "test: 모의면접 테이블 테스트 헬퍼 업데이트"
```

---

## Task 6: data-access 타입 정의 + sessions.ts (세션 CRUD)

**Files:**
- Modify: `src/data-access/types.ts`
- Create: `src/data-access/sessions.ts`
- Create: `src/data-access/sessions.test.ts`

- [ ] **Step 0: 세션 관련 인터페이스를 types.ts에 추가**

기존 패턴(`InterviewQuestion`, `JobDescription` 등)을 따라 다음 인터페이스 추가:
- `InterviewSession` (id, title, status, createdBy, qaOwnerId, jdId, categoryId, startedAt, endedAt, ...)
- `SessionParticipant` (id, sessionId, userId, role, joinedAt)
- `SessionInvitation` (id, sessionId, invitedBy, role, inviteCode, status, maxUses, usedCount, expiresAt)
- `SessionQuestion` (id, sessionId, questionId, content, displayOrder, askedAt)
- `SessionAnswer` (id, sessionQuestionId, userId, content, answeredAt)
- `SessionFeedback` (id, sessionQuestionId, userId, content, score, createdAt)
- `CreateSessionInput` (title, role, qaOwnerId?, jdId?, categoryId?)
- `SessionRecord` (질문 + 답변 + 피드백 조인 결과)

- [ ] **Step 1: 실패하는 테스트 작성 (Red)**

`sessions.test.ts`에 다음 함수들의 테스트 작성:
- `createSession(userId, input)` → 세션 생성, id 반환
- `getSessionById(userId, sessionId)` → 세션 조회 (참가자 정보 포함)
- `getSessionsByUserId(userId)` → 사용자의 세션 목록 (참가 중인 세션)
- `updateSessionStatus(userId, sessionId, status)` → 상태 변경 + started_at/ended_at 자동 기록
- `deleteSession(userId, sessionId)` → soft delete

테스트 패턴은 기존 `jobs.test.ts`를 참고:
```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestDb, cleanupTestDb, truncateAllTables } from '@/test/helpers/db';
// ...
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test src/data-access/sessions.test.ts
```
Expected: FAIL (함수 미구현)

- [ ] **Step 3: 최소 구현 (Green)**

`sessions.ts` 구현. 기존 `jobs.ts` 패턴을 따른다:
- 모든 함수는 `userId`를 첫 번째 파라미터로 받음
- `getSessionsByUserId`: `session_participants`를 JOIN하여 해당 유저가 참가 중인 세션 목록 반환
- `updateSessionStatus`: status가 `in_progress`로 변경 시 `started_at = now()`, `completed`로 변경 시 `ended_at = now()`

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm test src/data-access/sessions.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/sessions.ts src/data-access/sessions.test.ts
git commit -m "feat: 세션 CRUD data-access 구현"
```

---

## Task 7: data-access — session-participants.ts

**Files:**
- Create: `src/data-access/session-participants.ts`
- Create: `src/data-access/session-participants.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (Red)**

함수 (모든 함수는 기존 패턴에 따라 `callerUserId`를 첫 번째 파라미터로 받아 접근 제어 수행):
- `addParticipant(callerUserId, sessionId, userId, role)` → 참가자 추가 (세션 생성자만 가능)
- `removeParticipant(callerUserId, sessionId, userId)` → 참가자 제거
- `getParticipants(callerUserId, sessionId)` → 세션 참가자 목록 (참가자만 조회 가능)
- `getParticipantRole(sessionId, userId)` → 특정 유저의 역할 조회 (내부용, 접근 제어 없음)
- 역할 제약 검증: 면접관/지원자 중복 등록 시 에러

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test src/data-access/session-participants.test.ts
```

- [ ] **Step 3: 최소 구현 (Green)**

- UNIQUE (session_id, user_id) 제약을 활용
- 면접관 1명, 지원자 1명 제한은 data-access 레벨에서 검증

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm test src/data-access/session-participants.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/session-participants.ts src/data-access/session-participants.test.ts
git commit -m "feat: 세션 참가자 data-access 구현"
```

---

## Task 8: data-access — session-invitations.ts

**Files:**
- Create: `src/data-access/session-invitations.ts`
- Create: `src/data-access/session-invitations.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (Red)**

함수:
- `createInvitation(userId, sessionId, role, options?)` → 초대 생성 (invite_code 자동 생성, 기본 만료: 24시간)
- `getInvitationByCode(code)` → 코드로 초대 조회
- `acceptInvitation(code, userId)` → 초대 수락 (used_count 증가, status 변경, participant 추가)
- `revokeInvitation(userId, invitationId)` → 초대 취소
- 만료/사용횟수 초과 검증

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test src/data-access/session-invitations.test.ts
```

- [ ] **Step 3: 최소 구현 (Green)**

- `invite_code`: `crypto.randomUUID().slice(0, 8)` (짧은 코드)
- `acceptInvitation`: 트랜잭션 내에서 초대 상태 확인 + 참가자 추가 + used_count 증가

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm test src/data-access/session-invitations.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/session-invitations.ts src/data-access/session-invitations.test.ts
git commit -m "feat: 세션 초대 data-access 구현"
```

---

## Task 9: data-access — session-records.ts (질문/답변/피드백)

**Files:**
- Create: `src/data-access/session-records.ts`
- Create: `src/data-access/session-records.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (Red)**

함수:
- `recordQuestion(sessionId, input)` → 질문 기록 (content 스냅샷 + 선택적 questionId 참조)
- `recordAnswer(sessionQuestionId, userId, content)` → 답변 기록
- `recordFeedback(sessionQuestionId, userId, content?, score?)` → 피드백 기록
- `getSessionRecords(sessionId)` → 세션의 전체 기록 (질문 + 답변 + 피드백 조인)
- `getSessionQuestionByDisplayOrder(sessionId, displayOrder)` → displayOrder로 sessionQuestion 조회

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test src/data-access/session-records.test.ts
```

- [ ] **Step 3: 최소 구현 (Green)**

- `getSessionRecords`: LEFT JOIN으로 질문 → 답변 → 피드백을 한 번에 조회
- `recordQuestion`: `content`에 질문 텍스트 스냅샷 저장 (원본 수정에 영향 안 받도록)

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm test src/data-access/session-records.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/session-records.ts src/data-access/session-records.test.ts
git commit -m "feat: 세션 기록(질문/답변/피드백) data-access 구현"
```

---

## Task 10: data-access barrel export 업데이트

**Files:**
- Modify: `src/data-access/index.ts`

- [ ] **Step 1: 신규 모듈 re-export 추가**

```typescript
export * from './sessions';
export * from './session-participants';
export * from './session-invitations';
export * from './session-records';
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm build
```

- [ ] **Step 3: 커밋**

```bash
git add src/data-access/index.ts
git commit -m "chore: data-access barrel export 업데이트"
```

---

## Task 11: Server Actions — session-actions.ts

**Files:**
- Create: `src/actions/session-actions.ts`
- Create: `src/actions/session-actions.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (Red)**

함수:
- `createSessionAction(input)` → 세션 생성 + 생성자를 참가자로 추가
- `deleteSessionAction(sessionId)` → 세션 soft delete (생성자만 가능)
- `createInvitationAction(sessionId, role)` → 초대 링크 생성
- `acceptInvitationAction(code)` → 초대 수락

모든 action은 `getCurrentUserId()`로 인증 확인.

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm test src/actions/session-actions.test.ts
```

- [ ] **Step 3: 최소 구현 (Green)**

기존 `question-actions.ts` 패턴을 따른다:
```typescript
'use server';
import { getCurrentUserId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm test src/actions/session-actions.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/actions/session-actions.ts src/actions/session-actions.test.ts
git commit -m "feat: 세션 관리 Server Actions 구현"
```

---

## Task 12: API Route — PartyKit → DB 저장

**Files:**
- Create: `src/app/api/sessions/record/route.ts`

PartyKit 서버가 메시지를 DB에 영속화할 때 호출하는 내부 API.

- [ ] **Step 1: API Route 구현**

```typescript
// POST /api/sessions/record
// Body: { sessionId, type, payload, sender, timestamp }
```

메시지 타입별 처리:
- `session:start` → `updateSessionStatus(sender, sessionId, 'in_progress')`
- `session:end` → `updateSessionStatus(sender, sessionId, 'completed')`
- `question:send` → `recordQuestion(sessionId, { questionId, content, displayOrder })`
- `answer:send` → displayOrder로 sessionQuestionId 조회 → `recordAnswer(...)`
- `feedback:send` → displayOrder로 sessionQuestionId 조회 → `recordFeedback(...)`

보안: `PARTYKIT_API_SECRET` 환경변수로 공유 시크릿 헤더 검증.

```typescript
const secret = request.headers.get('x-partykit-secret');
if (secret !== process.env.PARTYKIT_API_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

- [ ] **Step 2: PartyKit 서버의 persistMessage에 시크릿 헤더 추가**

`partykit/src/interview-room.ts`의 `persistMessage` 메서드에서:
```typescript
headers: {
  'Content-Type': 'application/json',
  'x-partykit-secret': room.env.PARTYKIT_API_SECRET as string,
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/sessions/record/route.ts partykit/src/interview-room.ts
git commit -m "feat: PartyKit → DB 영속화 API Route 구현"
```

---

## Task 13: useWebSocket 커스텀 훅

**Files:**
- Create: `src/lib/hooks/use-websocket.ts`

브라우저 WebSocket API를 직접 사용하는 React 훅. 연결/재연결/메시지 처리를 담당한다.

- [ ] **Step 1: 훅 구현**

핵심 기능:
1. **연결**: `new WebSocket(url)` — url은 `wss://${NEXT_PUBLIC_PARTYKIT_HOST}/parties/main/${sessionId}?userId=...&role=...&displayName=...`
2. **재연결**: `onclose` 시 exponential backoff (1s, 2s, 4s, 8s, 최대 30s) 자동 재연결
3. **메시지 수신**: `onmessage` → JSON 파싱 → 콜백 호출
4. **메시지 전송**: `send(message: ClientMessage)` 함수 노출
5. **상태**: `connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'`
6. **cleanup**: 컴포넌트 unmount 시 `ws.close()`

```typescript
interface UseWebSocketOptions {
  sessionId: string;
  userId: string;
  role: SessionRole;
  displayName: string;
  onMessage: (message: ServerMessage) => void;
  enabled?: boolean; // false면 연결하지 않음
}

interface UseWebSocketReturn {
  send: (message: ClientMessage) => void;
  connectionStatus: ConnectionStatus;
  disconnect: () => void;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/hooks/use-websocket.ts
git commit -m "feat: WebSocket 연결/재연결 커스텀 훅 구현"
```

---

## Task 14: Zustand 세션 스토어

**Files:**
- Create: `src/stores/session-store.ts`
- Create: `src/stores/session-store.test.ts`

세션 진행 중 클라이언트 UI 상태를 관리한다. WebSocket 메시지를 받아서 상태를 업데이트. 기존 `theme-store.test.ts` 패턴을 따라 테스트 작성.

- [ ] **Step 1: 스토어 구현**

```typescript
interface SessionState {
  // 세션 정보
  sessionId: string | null;
  status: SessionStatus;
  myRole: SessionRole | null;

  // 참가자
  participants: Participant[];

  // 질문/답변
  questions: SessionQuestion[];
  currentDisplayOrder: number;

  // 타이머
  timerDuration: number | null;
  timerStartedAt: number | null;

  // 피드백 (면접관/검토자만)
  feedbacks: Map<number, SessionFeedback[]>; // displayOrder → feedbacks

  // 질문 제안 (면접관만)
  suggestions: QuestionSuggestion[];

  // Actions
  handleServerMessage: (message: ServerMessage) => void;
  setSession: (sessionId: string, role: SessionRole) => void;
  reset: () => void;
}
```

`handleServerMessage`에서 ServerMessage 타입별로 상태 업데이트:
- `participants` → participants 업데이트
- `question:send` → questions 배열에 추가
- `answer:send` → 해당 question의 answer 업데이트
- `feedback:send` → feedbacks Map에 추가
- `timer:start/stop` → 타이머 상태 업데이트
- `sync` → 전체 상태 복원

- [ ] **Step 2: 스토어 테스트 작성**

`session-store.test.ts`에서 `handleServerMessage`의 각 메시지 타입별 상태 업데이트를 테스트:
- `participants` 메시지 → participants 배열 업데이트
- `question:send` 메시지 → questions 배열에 추가
- `answer:send` 메시지 → 해당 question의 answer 업데이트
- `sync` 메시지 → 전체 상태 복원
- `reset()` → 초기 상태로 돌아감

- [ ] **Step 3: 커밋**

```bash
git add src/stores/session-store.ts src/stores/session-store.test.ts
git commit -m "feat: 세션 UI 상태 Zustand 스토어 구현 + 테스트"
```

---

## Task 15: 세션 목록 페이지

**Files:**
- Create: `src/app/interviews/sessions/page.tsx`
- Create: `src/components/session/session-list.tsx`

- [ ] **Step 1: 서버 컴포넌트 — 페이지**

```typescript
// src/app/interviews/sessions/page.tsx (Server Component)
import { getCurrentUserId } from '@/lib/auth';
import { getSessionsByUserId } from '@/data-access/sessions';
import { SessionList } from '@/components/session/session-list';

export default async function SessionsPage() {
  const userId = await getCurrentUserId();
  const sessions = await getSessionsByUserId(userId);
  return <SessionList sessions={sessions} />;
}
```

- [ ] **Step 2: 클라이언트 컴포넌트 — 목록**

`session-list.tsx` (`'use client'`):
- 세션 카드 목록 (제목, 상태 뱃지, 참가자, 생성일)
- 상태별 필터 (전체/대기중/진행중/완료)
- "새 세션 만들기" 버튼 → `/interviews/sessions/new`
- 세션 클릭 → `/interviews/sessions/[id]` (대기중/진행중) 또는 `/interviews/sessions/[id]/result` (완료)

UI: 기존 인터뷰 페이지 스타일을 따름 (shadcn/ui Card, Badge 컴포넌트 활용)

참고: 프론트엔드 컨벤션은 `docs/agent_docs/frontend-conventions.md` 참조

- [ ] **Step 3: 커밋**

```bash
git add src/app/interviews/sessions/page.tsx src/components/session/session-list.tsx
git commit -m "feat: 세션 목록 페이지 구현"
```

---

## Task 16: 세션 생성 페이지

**Files:**
- Create: `src/app/interviews/sessions/new/page.tsx`
- Create: `src/components/session/session-create-form.tsx`

- [ ] **Step 1: 서버 컴포넌트 — 페이지**

Q&A 카테고리 목록과 JD 목록을 fetch하여 폼에 전달.

- [ ] **Step 2: 클라이언트 컴포넌트 — 생성 폼**

`session-create-form.tsx` (`'use client'`):
- 제목 입력
- 내 역할 선택 (면접관 / 지원자) — RadioGroup
- Q&A 소유자 선택 (기본: 자신) — 향후 다른 사용자 선택 UI 추가 가능
- JD 선택 (선택사항) — Select
- 카테고리 선택 (선택사항) — Select
- "생성" 버튼 → `createSessionAction` 호출 → `/interviews/sessions/[id]`로 이동

- [ ] **Step 3: 커밋**

```bash
git add src/app/interviews/sessions/new/ src/components/session/session-create-form.tsx
git commit -m "feat: 세션 생성 페이지 구현"
```

---

## Task 17: 세션 진행 페이지 — 대기실 + WebSocket 연결

**Files:**
- Create: `src/app/interviews/sessions/[id]/page.tsx`
- Create: `src/components/session/session-waiting-room.tsx`
- Create: `src/components/session/session-participants-bar.tsx`

- [ ] **Step 1: 서버 컴포넌트 — 페이지**

세션 정보 + 참가자 정보를 fetch. 현재 유저의 역할을 확인하여 클라이언트 컴포넌트에 전달.

- [ ] **Step 2: 대기실 클라이언트 컴포넌트**

`session-waiting-room.tsx` (`'use client'`):
- WebSocket 연결 (`useWebSocket` 훅)
- 참가자 목록 실시간 표시 (`session-participants-bar.tsx`)
- 초대 링크 생성/복사 기능
- "면접 시작" 버튼 (면접관만 표시, 지원자가 입장해야 활성화)
- 면접 시작 시 → `session:start` 메시지 전송 → 면접 진행 UI로 전환

- [ ] **Step 3: 참가자 바 컴포넌트**

`session-participants-bar.tsx`:
- 참가자 아바타/이름 + 역할 뱃지
- 연결 상태 표시 (초록/회색 점)

- [ ] **Step 4: 커밋**

```bash
git add src/app/interviews/sessions/[id]/ src/components/session/session-waiting-room.tsx src/components/session/session-participants-bar.tsx
git commit -m "feat: 세션 대기실 + WebSocket 연결 구현"
```

---

## Task 18: 세션 진행 페이지 — 면접 진행 UI

**Files:**
- Create: `src/components/session/session-interview-room.tsx`
- Create: `src/components/session/session-question-panel.tsx`
- Create: `src/components/session/session-answer-panel.tsx`
- Create: `src/components/session/session-timer.tsx`

- [ ] **Step 1: 면접 진행 메인 컴포넌트**

`session-interview-room.tsx` (`'use client'`):
- 역할에 따라 다른 레이아웃 표시
- 면접관: 질문 패널(좌) + 답변/피드백 영역(우)
- 지원자: 질문 표시(상) + 답변 입력(하)
- 검토자: 질문/답변 표시(좌) + 피드백 입력(우)
- 상단: 참가자 바 + 타이머 + "면접 종료" 버튼 (면접관만)

- [ ] **Step 2: 면접관 질문 패널**

`session-question-panel.tsx` (`'use client'`):
- Q&A 라이브러리 검색/선택 (qa_owner_id의 질문 목록)
- 선택한 질문을 "전송" → `question:send` 메시지
- 즉석 질문 텍스트 입력 + 전송
- 검토자의 `question:suggest` 표시 (토스트 또는 사이드바)

- [ ] **Step 3: 지원자 답변 패널**

`session-answer-panel.tsx` (`'use client'`):
- 현재 질문 표시
- 답변 텍스트 입력 (textarea)
- "답변 제출" → `answer:send` 메시지

- [ ] **Step 4: 타이머 컴포넌트**

`session-timer.tsx` (`'use client'`):
- 면접관이 시작/정지 제어
- 카운트다운 표시 (mm:ss)
- 시간 초과 시 시각적 알림

- [ ] **Step 5: 커밋**

```bash
git add src/components/session/session-interview-room.tsx src/components/session/session-question-panel.tsx src/components/session/session-answer-panel.tsx src/components/session/session-timer.tsx
git commit -m "feat: 면접 진행 UI 컴포넌트 구현"
```

---

## Task 19: 피드백 패널

**Files:**
- Create: `src/components/session/session-feedback-panel.tsx`

- [ ] **Step 1: 피드백/채점 패널 구현**

`session-feedback-panel.tsx` (`'use client'`):
- 면접관 + 검토자에게만 표시 (지원자에게는 렌더링하지 않음)
- 질문별 피드백 입력 (textarea)
- 1-5 점수 선택 (별점 또는 숫자 버튼)
- "피드백 전송" → `feedback:send` 메시지
- 다른 검토자의 피드백도 실시간 표시

검토자 전용:
- "질문 제안" 입력 → `question:suggest` 메시지 (면접관에게만 전달)

- [ ] **Step 2: 커밋**

```bash
git add src/components/session/session-feedback-panel.tsx
git commit -m "feat: 피드백/채점 패널 구현"
```

---

## Task 20: 초대 링크 입장 페이지

**Files:**
- Create: `src/app/interviews/sessions/join/[code]/page.tsx`

- [ ] **Step 1: 서버 컴포넌트 구현**

- URL의 `code`로 초대 조회 (`getInvitationByCode`)
- 유효성 검증 (만료, 사용횟수, 상태)
- 인증 확인 (`getCurrentUserId`)
- 유효하면 `acceptInvitationAction` 호출 → 세션 페이지로 리다이렉트
- 무효하면 에러 메시지 표시

- [ ] **Step 2: 커밋**

```bash
git add src/app/interviews/sessions/join/
git commit -m "feat: 초대 링크 입장 페이지 구현"
```

---

## Task 21: 세션 결과 페이지

**Files:**
- Create: `src/app/interviews/sessions/[id]/result/page.tsx`
- Create: `src/components/session/session-result-view.tsx`

- [ ] **Step 1: 서버 컴포넌트 — 페이지**

세션 정보 + 전체 기록(`getSessionRecords`)을 fetch.

- [ ] **Step 2: 결과 뷰 컴포넌트**

`session-result-view.tsx` (Server Component 가능):
- 세션 메타 정보 (제목, 날짜, 참가자)
- 질문별 카드:
  - 질문 텍스트
  - 답변 텍스트
  - 피드백 목록 (작성자 + 점수 + 내용)
- 전체 평균 점수 표시

- [ ] **Step 3: 커밋**

```bash
git add src/app/interviews/sessions/[id]/result/ src/components/session/session-result-view.tsx
git commit -m "feat: 세션 결과 페이지 구현"
```

---

## Task 22: 환경 변수 설정 및 통합 테스트

**Files:**
- Modify: `.env.local` (로컬 개발)
- Modify: `.env.example` (문서화)

- [ ] **Step 1: 환경 변수 추가**

`.env.local`:
```
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
PARTYKIT_API_SECRET=dev-secret-change-in-production
```

`.env.example`에도 주석과 함께 추가.

PartyKit 측 (`partykit/.env` 또는 partykit.json):
```
NEXT_API_URL=http://localhost:3000
PARTYKIT_API_SECRET=dev-secret-change-in-production
```

- [ ] **Step 2: seed.sample.ts 업데이트**

`data/seed.sample.ts`에 샘플 세션 데이터 추가 (CLAUDE.md 필수 사항):
- 세션 1개 (status: 'completed')
- 참가자 2명 (interviewer + interviewee)
- 질문 2개 + 답변 + 피드백

- [ ] **Step 3: 전체 테스트 실행**

```bash
pnpm test
```
Expected: 기존 테스트 + 신규 data-access/actions 테스트 모두 통과

- [ ] **Step 4: 빌드 확인**

```bash
pnpm build
```
Expected: 빌드 성공

- [ ] **Step 5: 로컬 통합 테스트**

1. `cd partykit && npx partykit dev` (터미널 1)
2. `pnpm dev` (터미널 2)
3. 브라우저에서:
   - 세션 생성
   - 초대 링크 생성/복사
   - 다른 브라우저 탭에서 초대 링크로 입장
   - 면접 시작 → 질문 전송 → 답변 입력 → 피드백
   - 면접 종료 → 결과 확인

- [ ] **Step 6: 커밋**

```bash
git add .env.example data/seed.sample.ts
git commit -m "chore: 모의면접 환경 변수 설정 + 샘플 시드 업데이트"
```

---

## Task 23: Phase 1 완료 기준 검증

- [ ] **Step 1: 체크리스트 확인**

| 항목 | 검증 방법 |
|------|----------|
| 6개 신규 테이블 생성 | `pnpm db:studio`에서 확인 |
| data-access 4개 모듈 + 테스트 | `pnpm test` 전체 통과 |
| Server Actions + 테스트 | `pnpm test` 포함 |
| API Route (PartyKit → DB) | 통합 테스트로 확인 |
| useWebSocket 훅 | 로컬 통합 테스트로 확인 |
| 6개 페이지 | 빌드 성공 + 로컬 확인 |
| PartyKit 룸 | 로컬 통합 테스트로 확인 |
| 빌드 성공 | `pnpm build` |

- [ ] **Step 2: 린트 & 포맷**

```bash
pnpm lint:fix && pnpm format
```
