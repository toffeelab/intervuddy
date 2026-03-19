# 소프트 삭제 & 복구 기능 설계

> Branch 5: `feature/soft-delete-and-recovery`
> 의존: Branch 4 (`feature/2026-03-18/job-description-management`) 머지 완료

## 목표

소프트 삭제된 항목(JD, 질문)을 `/interviews/trash` 페이지에서 확인하고 복구할 수 있도록 한다. 보관 기간(30일) 만료 시 앱 시작 시점에 영구 삭제한다.

## 현재 상태

**이미 구현됨:**

- data-access: `softDeleteQuestion`, `restoreQuestion`, `getDeletedQuestions(jdId?)` — questions.ts
- data-access: `softDeleteFollowup`, `restoreFollowup` — followups.ts
- data-access: `softDeleteCategory`, `restoreCategory` — categories.ts
- data-access: `softDeleteJob`, `restoreJob`, `getDeletedJobs()` — jobs.ts
- Server Actions: `restoreQuestionAction`, `restoreFollowupAction`, `restoreCategoryAction` — 각 actions 파일
- `src/lib/retention-policy.ts` — `DEFAULT_RETENTION_DAYS = 30`

**미구현:**

- `restoreJobAction` — job-actions.ts에 누락
- JD 삭제/복구 시 하위 질문 cascade soft delete/restore
- `data-access/cleanup.ts` — 만료 항목 영구 삭제 로직
- 휴지통 UI — 삭제된 항목 확인 및 복구

## 구현 범위

### 1. 데이터 레이어

#### JD cascade soft delete/restore

JD를 soft delete할 때 해당 JD의 질문들도 함께 soft delete해야 한다. 그렇지 않으면:

- 질문이 삭제된 JD에 남아 사용자에게 보이지 않는 고아 상태가 됨
- `purgeExpiredItems`가 JD를 영구 삭제 시 `ON DELETE CASCADE`로 질문이 soft delete 보관 기간 없이 즉시 삭제됨

**`softDeleteJobWithQuestions(id: number)`** — `data-access/jobs.ts`에 추가:

1. JD soft delete (`deleted_at = now`)
2. 해당 JD의 활성 질문 모두 soft delete
3. 트랜잭션으로 감싸기

**`restoreJobWithQuestions(id: number)`** — `data-access/jobs.ts`에 추가:

1. JD restore (`deleted_at = NULL`)
2. 해당 JD의 질문 중 JD와 동일 시점에 삭제된 것들 restore
3. 트랜잭션으로 감싸기

> 기존 `softDeleteJob`/`restoreJob`은 그대로 유지 (단순 단건 삭제/복구 용도). 새 함수가 cascade 버전.

#### 영구 삭제 (`src/data-access/cleanup.ts`)

```typescript
interface PurgeResult {
  questions: number;
  followups: number;
  categories: number;
  jobs: number;
}

function purgeExpiredItems(retentionDays?: number): PurgeResult;
```

- `DEFAULT_RETENTION_DAYS` (30일) 기준으로 `deleted_at`이 만료된 항목 영구 DELETE
- 삭제 순서: followups → questions → categories → jobs (FK 의존성 순서)
- `question_keywords`는 `ON DELETE CASCADE`로 자동 삭제되므로 별도 DELETE 불필요
- 트랜잭션으로 감싸기

#### Server Actions 수정

**`src/actions/job-actions.ts`:**

| Action                 | 변경                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `deleteJobAction(id)`  | `softDeleteJob` → `softDeleteJobWithQuestions` 호출로 변경 + `/interviews/trash` revalidate 추가                |
| `restoreJobAction(id)` | 신규 — `restoreJobWithQuestions` 호출 + `/interviews`, `/interviews/trash`, `/interviews/jobs/${id}` revalidate |

**기존 delete action들에 `/interviews/trash` revalidate 추가:**

- `deleteQuestionAction` — + `/interviews/trash`
- `deleteCategoryAction` — + `/interviews/trash`
- `deleteFollowupAction` — + `/interviews/trash`

**기존 restore action들에 `/interviews/trash` revalidate 추가:**

- `restoreQuestionAction` — + `/interviews/trash`
- `restoreCategoryAction` — + `/interviews/trash`
- `restoreFollowupAction` — + `/interviews/trash`

### 2. 휴지통 페이지

#### 라우트: `/interviews/trash`

Server Component. 삭제된 모든 항목을 섹션별로 표시.

**데이터 fetch:**

- `getDeletedJobs()` — 삭제된 JD 목록
- `getDeletedQuestions()` — 삭제된 질문 목록 (전체, jdId 없이)

**표시 정보 (각 항목):**

- 항목 이름/내용 (JD: 회사명 — 포지션, 질문: 질문 텍스트)
- 삭제 시간 (deletedAt)
- 남은 보관일 (30일 - 경과일)
- "복구" 버튼

**빈 상태:** "삭제된 항목이 없습니다"

### 3. 컴포넌트

#### `trash-section.tsx` (Client Component)

삭제된 항목 리스트 섹션. Props:

```typescript
interface TrashItem {
  id: number;
  type: 'job' | 'question';
  title: string;
  subtitle?: string;
  deletedAt: string;
}

interface TrashSectionProps {
  label: string;
  icon: React.ReactNode;
  items: TrashItem[];
  onRestore: (id: number) => Promise<void>;
  retentionDays: number;
}
```

- 각 항목: 제목 + 부제 + "N일 후 영구 삭제" 경고 + "복구" 버튼
- 복구 시 `useTransition` + 에러 핸들링
- 빈 상태 처리

### 4. sidebar-nav 수정

`/interviews/trash` 링크 추가:

- 아이콘: `Trash2` (lucide)
- "JD 관리", "공통 라이브러리" 아래에 구분선 후 배치
- active state: `pathname.startsWith('/interviews/trash')`

### 5. 앱 시작 시 정리

`src/db/schema.ts`의 `initializeDatabase()` 마지막에 `purgeExpiredItems()` 호출. 서버 시작 시 1회 실행.

> `question_keywords`는 `interview_questions`에 `ON DELETE CASCADE`이므로 별도 purge 불필요.

### 6. 테스트

| 테스트 파일                       | 범위                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `src/data-access/cleanup.test.ts` | 만료 항목 영구 삭제, 미만료 유지                         |
| `src/data-access/jobs.test.ts`    | softDeleteJobWithQuestions, restoreJobWithQuestions 추가 |
| `src/actions/job-actions.test.ts` | restoreJobAction 추가 + revalidate 검증                  |

## 제외 범위

- 카테고리/꼬리질문 별도 복구 UI (카테고리는 질문 CASCADE, 꼬리질문은 질문에 종속)
- 휴지통 내 검색/필터
- 영구 삭제 수동 트리거 (자동 정리만)
- 삭제 항목 카운트 뱃지 (향후 개선)
