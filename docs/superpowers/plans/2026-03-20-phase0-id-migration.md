# Phase 0: 기존 테이블 ID 마이그레이션 (integer → UUID) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** job_descriptions, interview_questions, followup_questions 테이블의 PK를 sequential integer에서 UUID(text)로 변경하여 ID 노출 보안 문제를 해결한다.

**Architecture:** Drizzle ORM 스키마를 수정하고 커스텀 SQL 마이그레이션을 작성한다. 타입 변경이 data-access → actions → components → stores까지 cascading되므로 bottom-up 순서로 진행한다. TDD로 data-access 레이어 테스트를 먼저 수정하고 구현을 맞춘다.

**Tech Stack:** Drizzle ORM, PostgreSQL, TypeScript, Vitest

**설계 스펙:** `docs/superpowers/specs/2026-03-20-realtime-mock-interview-design.md` (Phase 0 섹션)

---

## 파일 구조 (변경 대상)

### 핵심 변경 (bottom-up 순서)

- `src/db/schema.ts` — PK/FK 타입 변경
- `src/data-access/types.ts` — 인터페이스 타입 변경
- `src/data-access/jobs.ts` — 함수 파라미터/반환 타입
- `src/data-access/questions.ts` — 함수 파라미터/반환 타입
- `src/data-access/followups.ts` — 함수 파라미터/반환 타입 + userId 추가
- `src/data-access/categories.ts` — jdId 파라미터 타입
- `src/data-access/import.ts` — jdId, questionIds 타입

### Actions

- `src/actions/job-actions.ts` — id 파라미터 타입
- `src/actions/question-actions.ts` — id 파라미터 타입
- `src/actions/followup-actions.ts` — id/questionId 파라미터 타입

### Pages (URL params)

- `src/app/interviews/jobs/[id]/page.tsx` — `Number(id)` 제거
- `src/app/interviews/jobs/[id]/edit/page.tsx` — `Number(id)` 제거
- `src/app/study/page.tsx` — `Number(jdId)` 제거

### Components

- `src/components/interviews/question-edit-drawer.tsx` — FollowupFormItem.id 타입
- `src/components/interviews/import-modal.tsx` — jdId, selectedIds 타입
- `src/components/study/study-client-shell.tsx` — allItemIds 타입
- `src/components/study/interview-header.tsx` — allItemIds 타입
- `src/components/study/quick-add-form.tsx` — jdId, questionId 타입

### Stores

- `src/stores/edit-store.ts` — drawerTargetId 타입
- `src/stores/study-store.ts` — expandedCards, selectedJdId 타입

### Tests & Seeds

- `src/test/helpers/db.ts` — 테스트 시드 함수
- `src/data-access/jobs.test.ts` — id 타입 변경
- `src/data-access/questions.test.ts` — id 타입 변경
- `src/data-access/followups.test.ts` — id 타입 + userId 파라미터 추가
- `src/data-access/categories.test.ts` — jdId 타입 변경
- `src/data-access/import.test.ts` — jdId, questionIds 타입 변경
- `src/data-access/cleanup.test.ts` — getFollowupsByQuestionId userId 추가
- `src/actions/followup-actions.test.ts` — questionId 타입 + getFollowupsByQuestionId userId 추가
- `src/actions/import-actions.test.ts` — jdId, questionIds 타입 변경
- `src/actions/job-actions.test.ts` — id 타입 변경
- `src/actions/question-actions.test.ts` — id 타입 변경
- `src/actions/category-actions.test.ts` — jdId 타입 변경
- `src/components/interviews/question-edit-drawer.test.tsx` — drawerTargetId 타입 변경

### Migration

- `drizzle/migrations/XXXX_id_migration.sql` — 커스텀 SQL 마이그레이션 (생성)

---

## Task 1: 브랜치 생성

**Files:** 없음

- [ ] **Step 1: feature 브랜치 생성**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/2026-03-20/phase0-id-migration
```

- [ ] **Step 2: 브랜치 확인**

Run: `git branch --show-current`
Expected: `feature/2026-03-20/phase0-id-migration`

---

## Task 2: DB 스키마 변경

**Files:**

- Modify: `src/db/schema.ts:64-144`

- [ ] **Step 1: jobDescriptions 테이블 PK 변경**

`src/db/schema.ts`에서 jobDescriptions 정의 수정:

```typescript
// 변경 전
id: integer('id').generatedAlwaysAsIdentity().primaryKey(),

// 변경 후
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

- [ ] **Step 2: interviewQuestions 테이블 PK 및 FK 변경**

```typescript
// id 변경
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),

// jdId FK 타입 변경
jdId: text('jd_id').references(() => jobDescriptions.id, { onDelete: 'cascade' }),

// originQuestionId FK 타입 변경
originQuestionId: text('origin_question_id').references(
  (): AnyPgColumn => interviewQuestions.id,
  { onDelete: 'set null' }
),
```

- [ ] **Step 3: followupQuestions 테이블 PK 및 FK 변경**

```typescript
// id 변경
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),

// questionId FK 타입 변경
questionId: text('question_id')
  .notNull()
  .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
```

- [ ] **Step 4: interviewCategories의 jdId FK 타입 변경**

```typescript
// jdId FK 타입 변경 (categories는 PK 유지, FK만 변경)
jdId: text('jd_id').references(() => jobDescriptions.id, { onDelete: 'cascade' }),
```

- [ ] **Step 5: 타입 검사 실행**

Run: `pnpm exec tsc --noEmit 2>&1 | head -50`
Expected: 타입 에러 다수 발생 (아직 data-access 타입을 안 바꿨으므로 정상)

- [ ] **Step 6: 커밋**

```bash
git add src/db/schema.ts
git commit -m "refactor: DB 스키마 PK/FK 타입을 integer에서 text(UUID)로 변경"
```

---

## Task 3: DB 마이그레이션 생성 및 실행

**Files:**

- Create: `drizzle/migrations/XXXX_id_to_uuid.sql` (Drizzle Kit이 자동 생성)

- [ ] **Step 1: Drizzle 마이그레이션 생성**

Run: `pnpm db:generate`

Drizzle Kit이 스키마 변경을 감지하고 마이그레이션 SQL을 생성한다.

- [ ] **Step 2: 마이그레이션 SQL 검토**

생성된 마이그레이션 파일을 열어서 다음 순서가 맞는지 확인:

1. FK 제약조건 삭제
2. 컬럼 타입 변경 (integer → text, `USING id::text`)
3. identity/sequence 삭제
4. FK 제약조건 재생성

Drizzle Kit이 올바르게 생성하지 못한 경우 수동으로 커스텀 SQL 작성.

- [ ] **Step 3: Docker PostgreSQL이 실행 중인지 확인**

Run: `docker compose up -d`

- [ ] **Step 4: 로컬 DB에 마이그레이션 실행**

Run: `pnpm db:migrate`
Expected: 마이그레이션 성공

- [ ] **Step 5: 테스트 DB에도 마이그레이션 적용 확인**

테스트 실행 시 `intervuddy_test` DB를 사용하므로 마이그레이션이 양쪽 DB에 모두 적용되었는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add drizzle/
git commit -m "chore: integer → UUID ID 마이그레이션 SQL 추가"
```

---

## Task 4: 타입 정의 업데이트

**Files:**

- Modify: `src/data-access/types.ts`

- [ ] **Step 1: 모든 인터페이스의 id/FK 타입 변경**

`src/data-access/types.ts`에서 다음 필드들을 `number` → `string`으로 변경:

```typescript
// FollowupQuestion
id: string;          // was number
questionId: string;  // was number

// InterviewQuestion
id: string;               // was number
jdId: string | null;       // was number | null
originQuestionId: string | null; // was number | null
// categoryId: number; ← 유지

// InterviewCategory
// id: number; ← 유지
jdId: string | null;  // was number | null

// JobDescription
id: string;  // was number

// CreateQuestionInput
jdId?: string | null;  // was number | null
// categoryId: number; ← 유지

// UpdateQuestionInput
id: string;  // was number
// categoryId?: number; ← 유지

// CreateCategoryInput
jdId?: string | null;  // was number | null

// CreateFollowupInput
questionId: string;  // was number

// UpdateFollowupInput
id: string;  // was number

// UpdateJobInput
id: string;  // was number
```

- [ ] **Step 2: 타입 검사 실행**

Run: `pnpm exec tsc --noEmit 2>&1 | head -80`
Expected: 에러가 줄어들되, data-access 함수들에서 아직 에러 발생

- [ ] **Step 3: 커밋**

```bash
git add src/data-access/types.ts
git commit -m "refactor: data-access 타입 인터페이스 id를 number에서 string으로 변경"
```

---

## Task 5: 테스트 수정 (Red Phase)

**Files:**

- Modify: `src/test/helpers/db.ts`
- Modify: `src/data-access/jobs.test.ts`
- Modify: `src/data-access/questions.test.ts`
- Modify: `src/data-access/followups.test.ts`
- Modify: `src/data-access/categories.test.ts`
- Modify: `src/data-access/import.test.ts`
- Modify: `src/data-access/cleanup.test.ts`
- Modify: `src/actions/followup-actions.test.ts`
- Modify: `src/actions/import-actions.test.ts`
- Modify: `src/actions/job-actions.test.ts`
- Modify: `src/actions/question-actions.test.ts`
- Modify: `src/actions/category-actions.test.ts`
- Modify: `src/components/interviews/question-edit-drawer.test.tsx`

- [ ] **Step 1: 테스트 헬퍼 수정**

`src/test/helpers/db.ts`에서 id 관련 타입을 확인. 시드 함수는 id를 직접 지정하지 않으므로 큰 변경은 없을 수 있으나, 반환 타입이 자동으로 string이 되는지 확인.

- [ ] **Step 2: data-access 테스트 수정**

`jobs.test.ts`, `questions.test.ts`, `followups.test.ts`, `categories.test.ts`, `import.test.ts`, `cleanup.test.ts`에서:

- `getJobById(userId, 999999)` → `getJobById(userId, 'nonexistent-id')`
- `.toBeGreaterThan(0)` 같은 숫자 assertion → `.toBeDefined()` 또는 UUID 형식 검증
- `getFollowupsByQuestionId(questionId)` → `getFollowupsByQuestionId(userId, questionId)` (모든 호출처)

- [ ] **Step 3: actions 테스트 수정**

`followup-actions.test.ts` (getFollowupsByQuestionId 호출 16건 — userId 추가), `import-actions.test.ts`, `job-actions.test.ts`, `question-actions.test.ts`, `category-actions.test.ts`에서:

- id/jdId/questionIds의 number 타입 → string
- `getFollowupsByQuestionId` mock 호출에 userId 파라미터 추가

- [ ] **Step 4: 컴포넌트 테스트 수정**

`question-edit-drawer.test.tsx`에서 `drawerTargetId?: number | null` → `string | null`.

- [ ] **Step 5: 테스트 실행 (실패 확인)**

Run: `pnpm test 2>&1 | tail -30`
Expected: data-access 함수 시그니처가 아직 안 바뀌었으므로 컴파일/런타임 에러

- [ ] **Step 6: 커밋**

```bash
git add src/test/ src/data-access/*.test.ts src/actions/*.test.ts src/components/**/*.test.tsx
git commit -m "test: ID 마이그레이션에 맞춰 테스트 수정 (red phase)"
```

---

## Task 6: Data-Access 레이어 — 구현 수정 (Green Phase)

**Files:**

- Modify: `src/data-access/jobs.ts`
- Modify: `src/data-access/questions.ts`
- Modify: `src/data-access/followups.ts`
- Modify: `src/data-access/categories.ts`
- Modify: `src/data-access/import.ts`

- [ ] **Step 1: jobs.ts 수정**

모든 함수의 `id: number` → `id: string`, 반환 타입 `number` → `string`:

- `getJobById(userId: string, id: string)`
- `createJob()` 반환: `Promise<string>`
- `updateJobStatus(userId: string, id: string, ...)`
- `softDeleteJob(userId: string, id: string)`
- `restoreJob(userId: string, id: string)`
- `softDeleteJobWithQuestions(userId: string, id: string)`
- `restoreJobWithQuestions(userId: string, id: string)`

- [ ] **Step 2: questions.ts 수정**

- `FollowupRow.id: string`, `FollowupRow.questionId: string`
- `mapRow` 파라미터: `id: string`, `jdId: string | null`, `originQuestionId: string | null`
- `mapRows` 파라미터: 동일
- `batchLoadFollowups(ids: string[]): Promise<Map<string, FollowupQuestion[]>>`
- `getQuestionsByJdId(userId: string, jdId: string)`
- `createQuestion()` 반환: `Promise<string>`
- `updateQuestion`, `updateQuestionKeywords`, `softDeleteQuestion`, `restoreQuestion`: `id: string`
- `getDeletedQuestions(userId: string, jdId?: string)`

- [ ] **Step 3: followups.ts 수정 + userId 추가**

- `getFollowupsByQuestionId(userId: string, questionId: string)` — userId 파라미터 추가
- 함수 내부에 `eq(followupQuestions.userId, userId)` 조건 추가
- `createFollowup()` 반환: `Promise<string>`
- `updateFollowup`, `softDeleteFollowup`, `restoreFollowup`: `id: string`

- [ ] **Step 4: categories.ts 수정**

- `getCategoriesByJdId(userId: string, jdId: string)` — jdId만 string으로 변경
- categoryId 관련 함수는 변경 없음

- [ ] **Step 5: import.ts 수정**

```typescript
// 변경 전
jdId: number;
questionIds: number[];

// 변경 후
jdId: string;
questionIds: string[];
```

- [ ] **Step 6: 테스트 실행 (통과 확인)**

Run: `pnpm test 2>&1 | tail -30`
Expected: 모든 data-access 테스트 통과

- [ ] **Step 7: 커밋**

```bash
git add src/data-access/
git commit -m "refactor: data-access 레이어 ID 타입을 number에서 string(UUID)으로 변경"
```

---

## Task 7: Server Actions 수정

**Files:**

- Modify: `src/actions/job-actions.ts`
- Modify: `src/actions/question-actions.ts`
- Modify: `src/actions/followup-actions.ts`
- Modify: `src/actions/import-actions.ts`

- [ ] **Step 1: job-actions.ts 수정**

```typescript
// 모든 id 파라미터: number → string
updateJobStatusAction(id: string, status: JobDescriptionStatus)
deleteJobAction(id: string)
restoreJobAction(id: string)
```

- [ ] **Step 2: question-actions.ts 수정**

```typescript
deleteQuestionAction(id: string)
restoreQuestionAction(id: string)
updateQuestionKeywordsAction(id: string, keywords: string[])
```

- [ ] **Step 3: followup-actions.ts 수정**

```typescript
// id 파라미터 + createFollowupAction의 input 타입은 types.ts에서 이미 변경됨
deleteFollowupAction(id: string)
restoreFollowupAction(id: string)
```

- [ ] **Step 4: import-actions.ts 수정**

```typescript
// jdId: number → string, questionIds: number[] → string[]
importQuestionsAction(jdId: string, questionIds: string[])
```

- [ ] **Step 5: 타입 검사 실행**

Run: `pnpm exec tsc --noEmit 2>&1 | head -50`
Expected: actions 관련 에러 해소, 남은 에러는 components/stores/pages

- [ ] **Step 6: 커밋**

```bash
git add src/actions/
git commit -m "refactor: Server Actions ID 타입을 number에서 string으로 변경"
```

---

## Task 8: Zustand Stores 수정

**Files:**

- Modify: `src/stores/edit-store.ts`
- Modify: `src/stores/study-store.ts`

- [ ] **Step 1: edit-store.ts 수정**

```typescript
// 변경 전
drawerTargetId: number | null;
openDrawer: (targetId: number) => void;

// 변경 후
drawerTargetId: string | null;
openDrawer: (targetId: string) => void;
```

- [ ] **Step 2: study-store.ts 수정**

```typescript
// 변경 전
expandedCards: Set<number>;
selectedJdId: number | null;
toggleCard: (id: number) => void;
toggleAll: (ids: number[]) => void;
setSelectedJdId: (jdId: number | null) => void;

// 변경 후
expandedCards: Set<string>;
selectedJdId: string | null;
toggleCard: (id: string) => void;
toggleAll: (ids: string[]) => void;
setSelectedJdId: (jdId: string | null) => void;
```

- [ ] **Step 3: 커밋**

```bash
git add src/stores/
git commit -m "refactor: Zustand 스토어 ID 타입을 number에서 string으로 변경"
```

---

## Task 9: Pages 수정 (URL params)

**Files:**

- Modify: `src/app/interviews/jobs/[id]/page.tsx`
- Modify: `src/app/interviews/jobs/[id]/edit/page.tsx`
- Modify: `src/app/study/page.tsx`

- [ ] **Step 1: jobs/[id]/page.tsx 수정**

```typescript
// 변경 전
const job = await getJobById(userId, Number(id));

// 변경 후
const job = await getJobById(userId, id);
```

또한 같은 파일에서 `originQuestionId as number` 캐스팅을 `as string`으로 변경:

```typescript
// 변경 전
.map((q) => q.originQuestionId as number);

// 변경 후
.map((q) => q.originQuestionId as string);
```

- [ ] **Step 2: jobs/[id]/edit/page.tsx 수정**

```typescript
// 변경 전
const job = await getJobById(userId, Number(id));

// 변경 후
const job = await getJobById(userId, id);
```

- [ ] **Step 3: study/page.tsx 수정**

```typescript
// 변경 전
const jdIdNum = jdId ? Number(jdId) : null;
// ...
jdIdNum !== null && !Number.isNaN(jdIdNum);

// 변경 후
// Number 변환 제거, jdId를 string으로 직접 사용
// Number.isNaN 검증 제거 (UUID는 문자열이므로 null 체크만 필요)
const validJdId = jdId || null;
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/
git commit -m "refactor: 페이지 URL params에서 Number() 변환 제거 (UUID 대응)"
```

---

## Task 10: Components 수정

**Files:**

- Modify: `src/components/interviews/question-edit-drawer.tsx`
- Modify: `src/components/interviews/import-modal.tsx`
- Modify: `src/components/study/study-client-shell.tsx`
- Modify: `src/components/study/interview-header.tsx`
- Modify: `src/components/study/quick-add-form.tsx`

- [ ] **Step 1: question-edit-drawer.tsx 수정**

```typescript
// FollowupFormItem 인터페이스
interface FollowupFormItem {
  id?: string; // was number
  // ...
}
```

또한 `f.id as number` 캐스팅을 `f.id as string`으로 변경:

```typescript
// 변경 전
const keepIds = new Set(validFollowups.filter((f) => f.id).map((f) => f.id as number));

// 변경 후
const keepIds = new Set(validFollowups.filter((f) => f.id).map((f) => f.id as string));
```

- [ ] **Step 2: import-modal.tsx 수정**

```typescript
// Props
jdId: string;                              // was number
importedOriginIds: string[];               // was number[]

// State
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
// filterCategoryId는 number 유지
```

- [ ] **Step 3: study 컴포넌트들 수정**

`study-client-shell.tsx`:

```typescript
allItemIds: string[];  // was number[]
```

`interview-header.tsx`:

```typescript
allItemIds: string[];  // was number[]
```

`quick-add-form.tsx`:

```typescript
jdId?: string | null;    // was number | null
questionId?: string;     // was number
// categoryId: number; ← 유지
```

- [ ] **Step 4: 타입 검사 실행**

Run: `pnpm exec tsc --noEmit 2>&1 | head -30`
Expected: 에러 0개

- [ ] **Step 5: 커밋**

```bash
git add src/components/
git commit -m "refactor: 컴포넌트 ID 타입을 number에서 string으로 변경"
```

---

## Task 11: 전체 빌드 & 테스트 검증

**Files:** 없음

- [ ] **Step 1: 린트 실행**

Run: `pnpm lint`
Expected: 에러 없음

- [ ] **Step 2: 타입 검사 실행**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 테스트 실행**

Run: `pnpm test`
Expected: 모든 테스트 통과

- [ ] **Step 4: 빌드 실행**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 5: 에러 수정 (있다면)**

타입 에러, 테스트 실패, 빌드 에러가 있으면 수정하고 재검증.

- [ ] **Step 6: 커밋 (수정사항이 있었다면)**

```bash
git add -A
git commit -m "fix: ID 마이그레이션 관련 타입/빌드 에러 수정"
```

---

## Task 12: 시드 데이터 확인

**Files:**

- Modify: `data/seed.sample.ts`
- Modify: `src/test/helpers/db.ts`

- [ ] **Step 1: seed.sample.ts 확인**

시드 데이터는 id를 직접 지정하지 않고 카테고리 이름으로 매핑하는 구조이므로 변경 불필요할 가능성 높음. `$defaultFn`에 의해 UUID가 자동 생성되는지만 확인.

- [ ] **Step 2: test helpers 확인**

`src/test/helpers/db.ts`도 id를 하드코딩하지 않으므로 큰 변경 없을 수 있음. Task 5에서 이미 수정한 부분과 중복되지 않는지 확인.

- [ ] **Step 3: 시드 실행 테스트**

Run: `pnpm db:seed:sample`
Expected: 성공, UUID로 데이터 삽입

- [ ] **Step 4: 커밋**

```bash
git add data/seed.sample.ts src/test/helpers/db.ts
git commit -m "chore: 시드 데이터와 테스트 헬퍼를 UUID ID에 맞춰 업데이트"
```

---

## Task 13: 최종 검증 & 개발 서버 확인

> verification-before-completion 스킬 사용 권장

**Files:** 없음

- [ ] **Step 1: 전체 테스트 재실행**

Run: `pnpm test`
Expected: 모든 테스트 통과

- [ ] **Step 2: 빌드 확인**

Run: `pnpm build`
Expected: 성공

- [ ] **Step 3: 개발 서버 실행 및 수동 확인**

Run: `pnpm dev`

브라우저에서 다음 확인:

- `/interviews/jobs` 목록 로드
- JD 생성 → URL이 UUID 형식 (`/interviews/jobs/xxxx-xxxx-...`)
- JD 상세 페이지 진입
- 질문 추가/수정/삭제
- `/study` 페이지 로드 및 카드 토글

- [ ] **Step 4: Phase 0 완료 기준 체크리스트 확인**

스펙 문서의 Phase 0 완료 기준과 대조:

- [x] job_descriptions, interview_questions, followup_questions PK가 UUID(text)로 변경됨
- [x] 모든 FK 참조 타입이 동기화됨
- [x] data-access 함수 및 types.ts 인터페이스가 새 타입 반영
- [x] getFollowupsByQuestionId에 userId 파라미터 추가됨
- [x] 라우트가 UUID 기반으로 동작함
- [x] 시드 데이터, 테스트 헬퍼 동기화 완료
- [x] 기존 테스트 통과

---

## 주의사항

- `interview_categories`의 PK는 **integer 유지**. 변경하지 않는다.
- `interviewCategories.jdId`의 FK 타입만 `integer` → `text`로 변경 (job_descriptions.id가 text가 되므로).
- Drizzle Kit이 생성한 마이그레이션 SQL이 부정확할 수 있다. 특히 `generatedAlwaysAsIdentity` → 일반 `text` 변환은 수동 검증 필요.
- 기존 DB에 데이터가 있다면 `USING id::text`로 기존 integer를 문자열로 변환한다. 이후 새 레코드는 UUID가 된다.
