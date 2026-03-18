# JD 관리 기능 설계

> Branch 4: `feature/job-description-management`
> 의존: Branch 3 (`feature/question-crud-actions`) 머지 완료

## 목표

면접 준비 대상 JD(Job Description)를 관리하고, 공통 라이브러리 질문을 JD별로 가져와서 맞춤 학습할 수 있도록 한다.

## 현재 상태

- `src/data-access/jobs.ts` — CRUD 함수 구현 완료 (getAllJobs, getJobById, createJob, updateJob, updateJobStatus, softDeleteJob, restoreJob, getDeletedJobs)
- `src/data-access/jobs.test.ts` — 테스트 완료
- `src/stores/study-store.ts` — `selectedJdId` 필드 존재
- `/interviews` — placeholder 페이지
- `/interviews/questions` — 공통 라이브러리 관리 완료

## 구현 범위

### 1. 데이터 레이어

#### 질문 가져오기 (`src/data-access/import.ts`)

```typescript
interface ImportResult {
  importedCount: number;
  skippedCount: number;
}

function importQuestionsToJob(params: { jdId: number; questionIds: number[] }): ImportResult;
```

- 라이브러리 질문을 JD로 복사 (question, answer, tip, display_order)
- 키워드, 꼬리질문도 함께 복사
- `origin_question_id`에 원본 ID 설정
- 이미 가져온 질문(동일 origin_question_id + 동일 jdId)은 스킵
- 전체 트랜잭션으로 감싸기

**카테고리 전략:** 가져온 질문은 원본과 동일한 `category_id`(글로벌 카테고리)를 유지한다. `getCategoriesByJdId(jdId)`가 이미 `WHERE (c.jd_id IS NULL OR c.jd_id = ?)`로 글로벌 카테고리를 포함 조회하므로, JD별 카테고리를 별도 생성할 필요 없다. JD별 커스텀 카테고리는 향후 확장 범위.

#### Server Actions

**`src/actions/job-actions.ts`:**

| Action                              | 호출                          | 반환             | revalidate                             |
| ----------------------------------- | ----------------------------- | ---------------- | -------------------------------------- |
| `createJobAction(input)`            | `createJob(input)`            | `{ id: number }` | `/interviews`                          |
| `updateJobAction(input)`            | `updateJob(input)`            | `void`           | `/interviews`, `/interviews/jobs/[id]` |
| `updateJobStatusAction(id, status)` | `updateJobStatus(id, status)` | `void`           | `/interviews`, `/interviews/jobs/[id]` |
| `deleteJobAction(id)`               | `softDeleteJob(id)`           | `void`           | `/interviews`                          |

> `restoreJobAction`은 Branch 5 (소프트 삭제/복구 UI)에서 추가.

**`src/actions/import-actions.ts`:**

| Action                                         | 호출                        | 반환           | revalidate                        |
| ---------------------------------------------- | --------------------------- | -------------- | --------------------------------- |
| `importQuestionsAction({ jdId, questionIds })` | `importQuestionsToJob(...)` | `ImportResult` | `/interviews/jobs/[id]`, `/study` |

### 2. 페이지 구조

| 라우트                       | 타입             | 역할                                                 |
| ---------------------------- | ---------------- | ---------------------------------------------------- |
| `/interviews`                | Server Component | JD 목록 카드 그리드 + 상태 필터 + "새 JD" 버튼       |
| `/interviews/jobs/new`       | Server Component | JD 생성 폼 (회사명, 포지션, 메모)                    |
| `/interviews/jobs/[id]`      | Server Component | JD 상세 — 메타정보 + 카테고리별 질문 + 질문 가져오기 |
| `/interviews/jobs/[id]/edit` | Server Component | JD 수정 (JobForm 재사용)                             |

**404 처리:** `getJobById(id)`가 `null`을 반환하면 `notFound()` (from `next/navigation`) 호출. `/interviews/jobs/[id]`와 `/interviews/jobs/[id]/edit` 모두 적용.

### 3. 컴포넌트

#### `job-status-badge.tsx` (Server Component)

상태별 뱃지 표시:

- `in_progress` → 파란색 "진행중"
- `completed` → 초록색 "완료"
- `archived` → 회색 "보관"

shadcn Badge 사용. 상태 표시만 하므로 Client Component 불필요.

#### `job-card.tsx` (Client Component — `'use client'`)

JD 카드 컴포넌트. 표시 항목:

- 회사명, 포지션
- 상태 뱃지 (JobStatusBadge)
- 질문 수
- 생성일

클릭 시 `/interviews/jobs/[id]`로 이동 (`useRouter`). 삭제 버튼(confirm 후 `deleteJobAction`). 에러 핸들링 포함.

#### `job-form.tsx` (Client Component — `'use client'`)

생성/수정 공용 폼:

- 회사명 (필수), 포지션 (필수), 메모 (선택)
- 빈 값 유효성 검사
- 생성 모드: `createJobAction` → 반환된 `{ id }`로 `router.push('/interviews/jobs/${id}')` 리다이렉트
- 수정 모드: `updateJobAction` → `router.push('/interviews/jobs/${id}')` 리다이렉트
- 에러 핸들링: try/catch, 에러 메시지 표시

#### `import-modal.tsx` (Client Component — `'use client'`)

Dialog 기반 질문 가져오기 모달:

- 라이브러리 질문 데이터는 JD 상세 페이지(Server Component)에서 props로 전달 — 별도 fetch 불필요
- 카테고리 필터 (Select)
- 질문 체크박스 리스트 (질문 텍스트 + 키워드 미리보기)
- 이미 가져온 질문은 "가져옴" 뱃지로 표시 + 체크 불가 (origin_question_id 비교)
- "전체 선택" / "선택 가져오기" 버튼
- `importQuestionsAction` 호출
- 에러 핸들링 포함

### 4. `/study` 페이지 통합

#### 데이터 흐름

```
sidebar (Client) → 사용자가 JD 선택
  → router.push('/study?jdId=3') (searchParams로 전달)
  → /study/page.tsx (Server Component)
    → searchParams.jdId 읽기
    → jdId ? getQuestionsByJdId(jdId) : getLibraryQuestions()
    → 결과를 props로 하위 컴포넌트에 전달
```

#### sidebar 수정 (`src/components/study/sidebar.tsx`)

상단에 JD 선택 드롭다운 추가 (shadcn Select):

- "공통 라이브러리" (기본값, value = "")
- 각 JD: "회사명 — 포지션" (value = jd.id)
- JD 목록은 `/study/page.tsx` Server Component에서 `getAllJobs()`로 조회 → sidebar에 props 전달
- onChange 시 `router.push('/study?jdId=${id}')` 또는 `router.push('/study')` (공통 라이브러리)

#### `/study/page.tsx` 수정

`searchParams.jdId`에 따라 데이터 fetch 분기:

- `undefined` → `getLibraryQuestions()` + `getGlobalCategories()`
- JD 선택 → `getQuestionsByJdId(jdId)` + `getCategoriesByJdId(jdId)`

### 5. sidebar-nav 수정 (`src/components/interviews/sidebar-nav.tsx`)

현재 `/interviews`와 `/interviews/questions` 두 항목만 존재. `/interviews/jobs/*` 하위 라우트 접근 시 "JD 관리" 항목이 활성화되도록 매칭 로직 수정:

- `/interviews/jobs/*` → "JD 관리" 활성 (`pathname === '/interviews' || pathname.startsWith('/interviews/jobs')`)
- `/interviews/questions` → "공통 라이브러리" 활성 (기존 유지)

### 6. 테스트

| 테스트 파일                          | 범위                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| `src/data-access/import.test.ts`     | 질문 복사, 키워드/꼬리질문 복사, 중복 스킵, 트랜잭션 |
| `src/actions/job-actions.test.ts`    | CRUD actions + revalidatePath + 반환값 검증          |
| `src/actions/import-actions.test.ts` | import action + revalidatePath + ImportResult 검증   |

### 7. 설치 필요 패키지

```bash
pnpm dlx shadcn@latest add select dialog checkbox
```

> dialog, checkbox는 import-modal에서 사용. 이미 설치된 경우 스킵.

## 제외 범위

- 소프트 삭제/복구 UI 및 `restoreJobAction` (Branch 5에서 구현)
- JD별 커스텀 카테고리 생성 (향후 확장)
- 질문 가져오기 시 편집 기능 (복사 후 JD 상세에서 편집)
