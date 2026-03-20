# 실시간 모의면접 설계 스펙

> 작성일: 2026-03-20

## 1. 개요

Intervuddy에 실시간 모의면접 기능을 추가한다. 면접관과 지원자가 WebSocket으로 연결되어 질문/답변을 실시간으로 주고받고, 검토자가 사이드 채널로 피드백을 남기는 구조.

### 단계별 로드맵

| 단계        | 범위                                         | 기술                                      |
| ----------- | -------------------------------------------- | ----------------------------------------- |
| **Phase 0** | 기존 테이블 ID 마이그레이션 (integer → UUID) | Drizzle ORM                               |
| **Phase 1** | 텍스트 기반 실시간 모의면접                  | PartyKit + WebSocket                      |
| **Phase 2** | 1:1 영상/음성 통화 추가                      | WebRTC (브라우저 API) + PartyKit 시그널링 |
| **Phase 3** | AI 답변 분석/피드백                          | SSE 스트리밍                              |
| **Phase 4** | 영상 녹화                                    | WebRTC MediaRecorder + 외부 스토리지      |
| **향후**    | 다대일 영상 송출 (패널 면접)                 | SFU (LiveKit 등)                          |
| **향후**    | 채용 플랫폼 확장 (팀/회사 Q&A 풀)            | 조직 모델 추가                            |

### 이 문서의 스코프

**Phase 0 + Phase 1**만 다룬다.

## 2. 기술 스택

### 실시간 통신: PartyKit (WebSocket)

- Cloudflare 위에서 동작하는 서버리스 WebSocket
- 서버 인프라 운영 부담 없이 WebSocket 로직 작성 가능
- 프론트엔드에서 `new WebSocket()` 브라우저 API를 직접 사용 (SDK 없음)
- 별도 `partykit/` 디렉토리에서 독립 배포

### 선택 이유

- AI 채팅/피드백은 **SSE**가 적합 (단방향 스트리밍) → 별도 구현
- 모의면접의 양방향 실시간 통신은 **WebSocket**이 필요
- 관리형 서비스(Pusher, Ably 등)는 WebSocket API를 추상화해서 학습 효과가 낮음
- PartyKit은 **서버 운영 0 + WebSocket 직접 체험** 의 최적 지점

### 영상/음성 (Phase 2, 이 스펙에서 구현하지 않음)

- 브라우저 내장 WebRTC API 직접 사용
- PartyKit을 시그널링 서버로 활용
- STUN: Google 무료 서버 / TURN: Cloudflare TURN (무료 베타)
- 1:1만 지원 (P2P), 3명 이상 영상 송출은 SFU 필요 (향후)

## 3. 역할 & 제약

| 역할                 | 인원    | 영상 (Phase 2) | 할 수 있는 것                                            |
| -------------------- | ------- | -------------- | -------------------------------------------------------- |
| 지원자 (interviewee) | **1명** | 송수신         | 답변 입력, 면접관과 대화                                 |
| 면접관 (interviewer) | **1명** | 송수신         | Q&A 라이브러리에서 질문 선택 또는 즉석 질문, 피드백/채점 |
| 검토자 (reviewer)    | **N명** | 없음 (WS only) | 면접관에게만 보이는 메모, 채점, 질문 제안                |

### 역할 배정

- 세션 생성 시 생성자가 자신의 역할을 선택 (면접관 또는 지원자)
- 초대 시 역할을 지정하여 링크 발급
- 제약: 지원자 1명, 면접관 1명, 검토자 N명

### Q&A 소유자 선택

- 세션 생성 시 "누구의 Q&A를 사용할지" (`qa_owner_id`) 지정
- 면접관은 해당 사용자의 Q&A 라이브러리에서 질문을 선택하거나 즉석 질문 타이핑
- 향후 채용 플랫폼 확장 시 "팀/회사의 Q&A 풀"로 자연스럽게 전환 가능 (소유자 개념 확장)

## 4. 사용자 흐름

```
세션 생성 → 초대 → 대기실 → 면접 진행 → 종료 → 결과 확인
```

1. **세션 생성**: 생성자가 제목, 자신의 역할, Q&A 소유자, 카테고리(선택) 설정
2. **초대**: 역할별 초대 링크 생성 → 공유 → 수신자가 링크로 입장
3. **대기실**: 필수 참가자(면접관 + 지원자) 입장 대기, 준비 완료 표시
4. **면접 진행**:
   - 면접관이 질문 전송 (라이브러리 선택 or 직접 타이핑)
   - 지원자가 답변 입력
   - 검토자는 사이드 채널로 메모/피드백 (지원자에게 안 보임)
   - 타이머 (선택)
5. **종료**: 면접관이 종료 → 세션 기록 DB 저장
6. **결과**: 질문/답변 기록 + 피드백/채점 확인 가능

### 결과물 (단계별)

| 단계               | 결과물                              |
| ------------------ | ----------------------------------- |
| **Phase 1 (이번)** | 질문/답변 텍스트 기록 + 피드백/채점 |
| Phase 3            | + AI 답변 분석/개선점 제안          |
| Phase 4            | + 영상 녹화 파일                    |

## 5. WebSocket 메시지 프로토콜

### 기본 구조

```typescript
interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
  sender: string; // userId
  timestamp: number; // Unix ms
}
```

### 연결 & 세션 관리

```typescript
// 입장
{ type: 'join', payload: { userId, role, displayName } }
// 퇴장
{ type: 'leave', payload: { userId } }
// 참가자 목록 동기화 (서버 → 전체)
{ type: 'participants', payload: { participants: [...] } }
// 면접 시작 (면접관 → 전체)
{ type: 'session:start' }
// 면접 종료 (면접관 → 전체)
{ type: 'session:end' }
```

### 면접 진행

```typescript
// 질문 전송 (면접관 → 전체)
{ type: 'question:send', payload: {
    questionId?: string,    // Q&A 라이브러리에서 선택 시 (nullable, UUID)
    content: string,        // 질문 텍스트
    displayOrder: number    // 질문 순서
}}
// 답변 입력 (지원자 → 전체)
{ type: 'answer:send', payload: {
    displayOrder: number,   // 어떤 질문에 대한 답변인지
    content: string
}}
// 타이머 (면접관 → 전체)
{ type: 'timer:start', payload: { duration: number } }
{ type: 'timer:stop' }
```

### 피드백 채널

```typescript
// 피드백/채점 (면접관/검토자 → 면접관+검토자만, 지원자 제외)
{ type: 'feedback:send', payload: {
    displayOrder: number,
    content: string,
    score?: number          // 1-5 (선택)
}}
// 질문 제안 (검토자 → 면접관만)
{ type: 'question:suggest', payload: { content: string } }
```

### 메시지 라우팅 규칙 (PartyKit 서버)

| 메시지 타입                 | 수신 대상                       |
| --------------------------- | ------------------------------- |
| join / leave / participants | 전체                            |
| session:start / session:end | 전체                            |
| question:send               | 전체                            |
| answer:send                 | 전체                            |
| timer:\*                    | 전체                            |
| feedback:send               | 면접관 + 검토자만 (지원자 제외) |
| question:suggest            | 면접관만                        |

## 6. DB 스키마

### Phase 0: 기존 테이블 ID 마이그레이션

다음 테이블의 PK를 `integer` (generatedAlwaysAsIdentity) → `text` (UUID, `crypto.randomUUID()`)로 변경:

| 테이블                | 변경 이유                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| `job_descriptions`    | URL path에 sequential integer 노출 (`/interviews/jobs/[id]`) → 열거 공격 가능 |
| `interview_questions` | 모의면접 WebSocket 메시지에 ID 노출 예정                                      |
| `followup_questions`  | 부모 테이블(interview_questions)과 일관성 유지                                |

`interview_categories`는 현재 URL 미노출 + 내부 참조 전용이므로 변경 불필요.

#### 마이그레이션 시 함께 수정할 사항

- 모든 FK 참조 타입 동기화 (integer → text)
- `getFollowupsByQuestionId`에 userId 파라미터 추가 (접근 제어 보강)
- 라우트 경로 변경: `/interviews/jobs/[id]` → UUID 기반
- `src/data-access/types.ts`의 모든 `id: number` → `id: string` 등 타입 변경 (cascading 영향 범위 큼)
- data-access 레이어, 시드 데이터(`data/seed.sample.ts`), 테스트 헬퍼(`src/test/helpers/db.ts`) 동기화

#### Phase 0 완료 기준

- [ ] job_descriptions, interview_questions, followup_questions PK가 UUID(text)로 변경됨
- [ ] 모든 FK 참조 타입이 동기화됨
- [ ] data-access 함수 및 types.ts 인터페이스가 새 타입 반영
- [ ] getFollowupsByQuestionId에 userId 파라미터 추가됨
- [ ] 라우트가 UUID 기반으로 동작함
- [ ] 시드 데이터, 테스트 헬퍼 동기화 완료
- [ ] 기존 테스트 통과

### Phase 1: 신규 테이블

모든 신규 테이블은 UUID PK(`text` + `crypto.randomUUID()`) 사용.

```
interview_sessions
├── session_participants
├── session_invitations
└── session_questions
    ├── session_answers
    └── session_feedbacks
```

#### interview_sessions (모의면접 세션)

| 컬럼        | 타입                                 | 제약                                                                        | 설명                                               |
| ----------- | ------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------- |
| id          | text PK                              | crypto.randomUUID()                                                         |                                                    |
| title       | text                                 | NOT NULL                                                                    | 세션 제목                                          |
| status      | text                                 | NOT NULL, DEFAULT 'waiting', CHECK IN ('waiting','in_progress','completed') |                                                    |
| created_by  | text FK → users.id                   | NOT NULL, ON DELETE CASCADE                                                 | 세션 생성자                                        |
| qa_owner_id | text FK → users.id                   | nullable, ON DELETE SET NULL                                                | Q&A 소유자 (소유자 탈퇴 시 NULL, 세션 기록은 보존) |
| jd_id       | text FK → job_descriptions.id        | nullable, ON DELETE SET NULL                                                | 연결된 채용 공고                                   |
| category_id | integer FK → interview_categories.id | nullable, ON DELETE SET NULL                                                | Q&A 카테고리                                       |
| summary     | text                                 | nullable                                                                    | 세션 종료 후 소감/AI 요약                          |
| started_at  | timestamptz                          | nullable                                                                    |                                                    |
| ended_at    | timestamptz                          | nullable                                                                    |                                                    |
| deleted_at  | timestamptz                          | nullable                                                                    | soft delete                                        |
| created_at  | timestamptz                          | NOT NULL, DEFAULT NOW()                                                     |                                                    |
| updated_at  | timestamptz                          | NOT NULL, DEFAULT NOW()                                                     |                                                    |

#### session_participants (세션 참가자)

| 컬럼       | 타입                            | 제약                                                        | 설명 |
| ---------- | ------------------------------- | ----------------------------------------------------------- | ---- |
| id         | text PK                         | crypto.randomUUID()                                         |      |
| session_id | text FK → interview_sessions.id | NOT NULL, ON DELETE CASCADE                                 |      |
| user_id    | text FK → users.id              | NOT NULL, ON DELETE CASCADE                                 |      |
| role       | text                            | NOT NULL, CHECK IN ('interviewer','interviewee','reviewer') |      |
| joined_at  | timestamptz                     | NOT NULL, DEFAULT NOW()                                     |      |

UNIQUE: (session_id, user_id)

#### session_invitations (초대 링크)

| 컬럼        | 타입                            | 제약                                                                             | 설명                   |
| ----------- | ------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| id          | text PK                         | crypto.randomUUID()                                                              |                        |
| session_id  | text FK → interview_sessions.id | NOT NULL, ON DELETE CASCADE                                                      |                        |
| invited_by  | text FK → users.id              | NOT NULL, ON DELETE CASCADE                                                      |                        |
| role        | text                            | NOT NULL, CHECK IN ('interviewer','interviewee','reviewer')                      |                        |
| invite_code | text                            | NOT NULL, UNIQUE                                                                 | URL에 사용할 짧은 코드 |
| status      | text                            | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','accepted','expired','revoked') |                        |
| max_uses    | integer                         | NOT NULL, DEFAULT 1                                                              |                        |
| used_count  | integer                         | NOT NULL, DEFAULT 0                                                              |                        |
| expires_at  | timestamptz                     | NOT NULL                                                                         |                        |
| created_at  | timestamptz                     | NOT NULL, DEFAULT NOW()                                                          |                        |

#### session_questions (면접 질문 기록)

| 컬럼          | 타입                             | 제약                         | 설명                                       |
| ------------- | -------------------------------- | ---------------------------- | ------------------------------------------ |
| id            | text PK                          | crypto.randomUUID()          |                                            |
| session_id    | text FK → interview_sessions.id  | NOT NULL, ON DELETE CASCADE  |                                            |
| question_id   | text FK → interview_questions.id | nullable, ON DELETE SET NULL | 라이브러리에서 선택 시 (Phase 0 이후 UUID) |
| content       | text                             | NOT NULL                     | 질문 텍스트 (스냅샷)                       |
| display_order | integer                          | NOT NULL, CHECK >= 0         |                                            |
| asked_at      | timestamptz                      | NOT NULL, DEFAULT NOW()      |                                            |

#### session_answers (답변 기록)

| 컬럼                | 타입                           | 제약                        | 설명 |
| ------------------- | ------------------------------ | --------------------------- | ---- |
| id                  | text PK                        | crypto.randomUUID()         |      |
| session_question_id | text FK → session_questions.id | NOT NULL, ON DELETE CASCADE |      |
| user_id             | text FK → users.id             | NOT NULL, ON DELETE CASCADE |      |
| content             | text                           | NOT NULL                    |      |
| answered_at         | timestamptz                    | NOT NULL, DEFAULT NOW()     |      |

UNIQUE: (session_question_id, user_id)

#### session_feedbacks (피드백/채점)

| 컬럼                | 타입                           | 제약                          | 설명          |
| ------------------- | ------------------------------ | ----------------------------- | ------------- |
| id                  | text PK                        | crypto.randomUUID()           |               |
| session_question_id | text FK → session_questions.id | NOT NULL, ON DELETE CASCADE   |               |
| user_id             | text FK → users.id             | NOT NULL, ON DELETE CASCADE   |               |
| content             | text                           | nullable                      | 피드백 텍스트 |
| score               | integer                        | nullable, CHECK >= 1 AND <= 5 |               |
| created_at          | timestamptz                    | NOT NULL, DEFAULT NOW()       |               |

UNIQUE: (session_question_id, user_id)

### 인덱스

```
-- 필수
interview_sessions(created_by)
interview_sessions(status)
interview_sessions(qa_owner_id)
session_participants(session_id)
session_participants(user_id)
session_questions(session_id, display_order)
session_answers(session_question_id)
session_feedbacks(session_question_id)
session_invitations(invite_code)  -- UNIQUE 인덱스
```

### 데이터 저장 전략

- 질문/답변/피드백 발생 시 PartyKit 서버가 Next.js API를 호출하여 즉시 DB 저장
- 연결이 끊겨도 데이터 유실 없음
- 세션 종료 시에는 status 업데이트 + ended_at 기록

## 7. 프로젝트 구조

```
intervuddy/
├── src/                          # 기존 Next.js 앱
│   ├── app/
│   │   └── interviews/
│   │       └── sessions/         # 신규: 모의면접 페이지
│   │           ├── page.tsx          # 세션 목록
│   │           ├── new/page.tsx      # 세션 생성
│   │           ├── [id]/page.tsx     # 세션 진행 (WebSocket 연결)
│   │           ├── [id]/result/page.tsx  # 세션 결과
│   │           └── join/[code]/page.tsx  # 초대 링크 입장
│   ├── components/
│   │   └── session/              # 신규: 세션 UI 컴포넌트
│   ├── data-access/
│   │   ├── sessions.ts           # 신규: 세션 CRUD
│   │   ├── session-participants.ts
│   │   ├── session-invitations.ts
│   │   └── session-records.ts    # 질문/답변/피드백 저장
│   └── db/
│       └── schema.ts             # 신규 테이블 추가
│
└── partykit/                     # 신규: PartyKit 서버 (독립 배포)
    ├── package.json
    ├── partykit.json
    └── src/
        └── interview-room.ts     # WebSocket 룸 로직
```

## 8. WebSocket 인증 & 재연결

### 인증 전략

- WebSocket 연결 시 URL query param으로 JWT 토큰 전달: `wss://party.host/room/session-id?token=<jwt>`
- PartyKit 서버의 `onConnect`에서 JWT를 검증하고, DB의 session_participants와 대조하여 역할 확인
- 검증 실패 시 연결 거부 (`conn.close()`)

### 재연결 프로토콜

```typescript
// 재연결 시 서버가 현재 상태를 전송 (서버 → 재연결한 클라이언트)
{ type: 'sync', payload: {
    status: 'waiting' | 'in_progress' | 'completed',
    participants: [...],
    questions: [...],         // 지금까지 출제된 질문들
    currentQuestion?: {...},  // 현재 진행 중인 질문
}}
```

- 클라이언트는 연결 끊김 감지 시 exponential backoff로 자동 재연결
- 재연결 성공 시 `sync` 메시지로 현재 상태 복원

### 데이터 저장 & 브로드캐스트 순서

- **낙관적 브로드캐스트**: 메시지를 먼저 참가자에게 브로드캐스트하고, 비동기로 DB 저장
- DB 저장 실패 시: 재시도 (최대 3회) → 실패하면 에러 로그 기록, 세션 종료 시 PartyKit 룸 메모리에서 일괄 재저장 시도
- 실시간 체감을 위해 저장 완료를 기다리지 않음

## 9. 비기능 요구사항

- WebSocket 연결 끊김 시 자동 재연결 (exponential backoff)
- 세션당 최대 참가자: 면접관 1 + 지원자 1 + 검토자 10 (초기 제한)
- 초대 링크 기본 만료: 24시간
- 세션 데이터 보존: soft delete (deleted_at)

## 10. PartyKit 배포 & 환경 설정

- PartyKit 서버는 `partykit/` 디렉토리에서 독립 배포 (`npx partykit deploy`)
- Next.js 앱에서 PartyKit 서버 URL은 환경변수로 관리: `NEXT_PUBLIC_PARTYKIT_HOST`
- 로컬 개발: `npx partykit dev`로 로컬 PartyKit 서버 실행
- CORS: PartyKit은 기본적으로 모든 origin 허용, 프로덕션에서는 허용 origin 제한 설정
