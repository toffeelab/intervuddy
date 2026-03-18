# JD 관리 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** JD(Job Description)를 관리하고, 공통 라이브러리 질문을 JD별로 가져와 맞춤 학습할 수 있도록 한다.

**Architecture:** Server Actions로 JD CRUD 처리. `importQuestionsToJob`으로 라이브러리 질문을 JD로 트랜잭션 복사. `/study` 페이지는 searchParams 기반 JD 필터링.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript 5, SQLite (better-sqlite3), Zustand, Tailwind CSS v4, shadcn/ui, Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-job-description-management-design.md`

---

## 파일 맵

| 액션    | 파일                                              | 역할                               |
| ------- | ------------------------------------------------- | ---------------------------------- |
| Create  | `src/data-access/import.ts`                       | 질문 가져오기 로직 (트랜잭션 복사) |
| Create  | `src/data-access/import.test.ts`                  | 가져오기 테스트                    |
| Create  | `src/actions/job-actions.ts`                      | JD Server Actions                  |
| Create  | `src/actions/job-actions.test.ts`                 | JD Actions 테스트                  |
| Create  | `src/actions/import-actions.ts`                   | 질문 가져오기 Action               |
| Create  | `src/actions/import-actions.test.ts`              | import Action 테스트               |
| Create  | `src/components/interviews/job-status-badge.tsx`  | 상태 뱃지                          |
| Create  | `src/components/interviews/job-card.tsx`          | JD 카드                            |
| Create  | `src/components/interviews/job-status-filter.tsx` | 상태 필터                          |
| Create  | `src/components/interviews/job-form.tsx`          | JD 생성/수정 폼                    |
| Create  | `src/components/interviews/import-modal.tsx`      | 질문 가져오기 모달                 |
| Modify  | `src/app/interviews/page.tsx`                     | JD 목록 실제 구현                  |
| Create  | `src/app/interviews/jobs/new/page.tsx`            | JD 생성 페이지                     |
| Create  | `src/app/interviews/jobs/[id]/page.tsx`           | JD 상세 페이지                     |
| Create  | `src/app/interviews/jobs/[id]/edit/page.tsx`      | JD 수정 페이지                     |
| Modify  | `src/components/interviews/sidebar-nav.tsx`       | JD 라우트 활성화                   |
| Modify  | `src/components/study/sidebar.tsx`                | JD 선택 드롭다운                   |
| Modify  | `src/app/study/page.tsx`                          | JD 기반 데이터 fetch               |
| Install | shadcn `select`, `checkbox`                       | UI 컴포넌트                        |

---

## Task 1: shadcn 컴포넌트 설치

- [ ] **Step 1: select, checkbox 설치**

```bash
pnpm dlx shadcn@latest add select checkbox
```

> dialog는 이미 설치됨.

- [ ] **Step 2: 커밋**

```bash
git add src/components/ui/select.tsx src/components/ui/checkbox.tsx
git commit -m "chore: shadcn select, checkbox 컴포넌트 설치"
```

---

## Task 2: 질문 가져오기 data-access (TDD)

**Files:**

- Create: `src/data-access/import.ts`
- Create: `src/data-access/import.test.ts`

- [ ] **Step 1: import 테스트 작성**

```typescript
// src/data-access/import.test.ts
import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import { importQuestionsToJob } from './import';
import { getQuestionsByJdId } from './questions';
import { getLibraryQuestions } from './questions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('importQuestionsToJob', () => {
  it('라이브러리 질문을 JD로 복사 (질문 + 키워드 + 꼬리질문)', () => {
    seedTestQuestions(db); // categoryId=1, questionId=1 with 2 keywords + 1 followup
    seedTestJobDescription(db); // jdId=1

    const result = importQuestionsToJob({ jdId: 1, questionIds: [1] });
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(0);

    const jdQuestions = getQuestionsByJdId(1);
    expect(jdQuestions).toHaveLength(1);
    expect(jdQuestions[0].jdId).toBe(1);
    expect(jdQuestions[0].originQuestionId).toBe(1);
    expect(jdQuestions[0].question).toBe('자기소개를 해주세요');
    expect(jdQuestions[0].keywords).toHaveLength(2);
    expect(jdQuestions[0].followups).toHaveLength(1);
  });

  it('이미 가져온 질문은 스킵', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    importQuestionsToJob({ jdId: 1, questionIds: [1] });
    const result = importQuestionsToJob({ jdId: 1, questionIds: [1] });
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);

    expect(getQuestionsByJdId(1)).toHaveLength(1);
  });

  it('존재하지 않는 questionId는 스킵', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    const result = importQuestionsToJob({ jdId: 1, questionIds: [999] });
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('원본 질문의 category_id를 유지', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    importQuestionsToJob({ jdId: 1, questionIds: [1] });
    const jdQuestions = getQuestionsByJdId(1);
    const original = getLibraryQuestions();
    expect(jdQuestions[0].categoryId).toBe(original[0].categoryId);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/import.test.ts`
Expected: FAIL — `importQuestionsToJob` not found

- [ ] **Step 3: import 로직 구현**

```typescript
// src/data-access/import.ts
import { getDb } from '@/db/index';

interface ImportResult {
  importedCount: number;
  skippedCount: number;
}

export function importQuestionsToJob(params: {
  jdId: number;
  questionIds: number[];
}): ImportResult {
  const db = getDb();
  let importedCount = 0;
  let skippedCount = 0;

  const transaction = db.transaction(() => {
    for (const questionId of params.questionIds) {
      // 원본 질문 조회
      const original = db
        .prepare(
          `SELECT id, category_id, question, answer, tip, display_order
           FROM interview_questions
           WHERE id = ? AND jd_id IS NULL AND deleted_at IS NULL`
        )
        .get(questionId) as
        | {
            id: number;
            category_id: number;
            question: string;
            answer: string;
            tip: string | null;
            display_order: number;
          }
        | undefined;

      if (!original) {
        skippedCount++;
        continue;
      }

      // 이미 가져온 질문인지 확인
      const existing = db
        .prepare(
          `SELECT id FROM interview_questions
           WHERE origin_question_id = ? AND jd_id = ? AND deleted_at IS NULL`
        )
        .get(original.id, params.jdId) as { id: number } | undefined;

      if (existing) {
        skippedCount++;
        continue;
      }

      // 질문 복사
      const result = db
        .prepare(
          `INSERT INTO interview_questions
             (category_id, jd_id, origin_question_id, question, answer, tip, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          original.category_id,
          params.jdId,
          original.id,
          original.question,
          original.answer,
          original.tip,
          original.display_order
        );

      const newQuestionId = Number(result.lastInsertRowid);

      // 키워드 복사
      const keywords = db
        .prepare(`SELECT keyword FROM question_keywords WHERE question_id = ?`)
        .all(original.id) as { keyword: string }[];

      const insertKeyword = db.prepare(
        `INSERT INTO question_keywords (question_id, keyword) VALUES (?, ?)`
      );
      for (const kw of keywords) {
        insertKeyword.run(newQuestionId, kw.keyword);
      }

      // 꼬리질문 복사
      const followups = db
        .prepare(
          `SELECT question, answer, display_order
           FROM followup_questions
           WHERE question_id = ? AND deleted_at IS NULL`
        )
        .all(original.id) as {
        question: string;
        answer: string;
        display_order: number;
      }[];

      const insertFollowup = db.prepare(
        `INSERT INTO followup_questions (question_id, question, answer, display_order)
         VALUES (?, ?, ?, ?)`
      );
      for (const fu of followups) {
        insertFollowup.run(newQuestionId, fu.question, fu.answer, fu.display_order);
      }

      importedCount++;
    }
  });

  transaction();

  return { importedCount, skippedCount };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/import.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/import.ts src/data-access/import.test.ts
git commit -m "feat: 라이브러리→JD 질문 가져오기 data-access 구현"
```

---

## Task 3: JD Server Actions (TDD)

**Files:**

- Create: `src/actions/job-actions.ts`
- Create: `src/actions/job-actions.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/actions/job-actions.test.ts
import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, cleanupTestDb, seedTestJobDescription } from '@/test/helpers/db';
import { getAllJobs, getJobById } from '@/data-access/jobs';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
import {
  createJobAction,
  updateJobAction,
  updateJobStatusAction,
  deleteJobAction,
} from './job-actions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('createJobAction', () => {
  it('JD 생성 후 id 반환 + revalidate', async () => {
    const result = await createJobAction({
      companyName: '카카오',
      positionTitle: '프론트엔드',
    });
    expect(result.id).toBeGreaterThan(0);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');

    const job = getJobById(result.id);
    expect(job).not.toBeNull();
    expect(job!.companyName).toBe('카카오');
  });
});

describe('updateJobAction', () => {
  it('JD 수정 + revalidate', async () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    await updateJobAction({ id: jobs[0].id, companyName: '라인' });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
    const updated = getJobById(jobs[0].id);
    expect(updated!.companyName).toBe('라인');
  });
});

describe('updateJobStatusAction', () => {
  it('상태 변경 + revalidate', async () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    await updateJobStatusAction(jobs[0].id, 'completed');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
    const updated = getJobById(jobs[0].id);
    expect(updated!.status).toBe('completed');
  });
});

describe('deleteJobAction', () => {
  it('소프트 삭제 + revalidate', async () => {
    seedTestJobDescription(db);
    const jobs = getAllJobs();
    await deleteJobAction(jobs[0].id);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
    expect(getAllJobs()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/actions/job-actions.test.ts`
Expected: FAIL

- [ ] **Step 3: Server Actions 구현**

```typescript
// src/actions/job-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createJob, updateJob, updateJobStatus, softDeleteJob } from '@/data-access/jobs';
import type { CreateJobInput, UpdateJobInput, JobDescriptionStatus } from '@/data-access/types';

export async function createJobAction(input: CreateJobInput) {
  const id = createJob(input);
  revalidatePath('/interviews');
  return { id };
}

export async function updateJobAction(input: UpdateJobInput) {
  updateJob(input);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${input.id}`);
}

export async function updateJobStatusAction(id: number, status: JobDescriptionStatus) {
  updateJobStatus(id, status);
  revalidatePath('/interviews');
  revalidatePath(`/interviews/jobs/${id}`);
}

export async function deleteJobAction(id: number) {
  softDeleteJob(id);
  revalidatePath('/interviews');
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/actions/job-actions.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/actions/job-actions.ts src/actions/job-actions.test.ts
git commit -m "feat: JD Server Actions 구현"
```

---

## Task 4: import Server Action (TDD)

**Files:**

- Create: `src/actions/import-actions.ts`
- Create: `src/actions/import-actions.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/actions/import-actions.test.ts
import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import { getQuestionsByJdId } from '@/data-access/questions';

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
import { importQuestionsAction } from './import-actions';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('importQuestionsAction', () => {
  it('질문 가져오기 + revalidate + 결과 반환', async () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);

    const result = await importQuestionsAction({ jdId: 1, questionIds: [1] });
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/study');
    expect(getQuestionsByJdId(1)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/actions/import-actions.test.ts`
Expected: FAIL

- [ ] **Step 3: import Action 구현**

```typescript
// src/actions/import-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { importQuestionsToJob } from '@/data-access/import';

export async function importQuestionsAction(params: { jdId: number; questionIds: number[] }) {
  const result = importQuestionsToJob(params);
  revalidatePath(`/interviews/jobs/${params.jdId}`);
  revalidatePath('/study');
  return result;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/actions/import-actions.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/actions/import-actions.ts src/actions/import-actions.test.ts
git commit -m "feat: 질문 가져오기 Server Action 구현"
```

---

## Task 5: JD 상태 뱃지 + 카드 컴포넌트

**Files:**

- Create: `src/components/interviews/job-status-badge.tsx`
- Create: `src/components/interviews/job-card.tsx`

- [ ] **Step 1: job-status-badge 구현**

```typescript
// src/components/interviews/job-status-badge.tsx
import { Badge } from '@/components/ui/badge';
import type { JobDescriptionStatus } from '@/data-access/types';

const STATUS_CONFIG: Record<
  JobDescriptionStatus,
  { label: string; className: string }
> = {
  in_progress: {
    label: '진행중',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  completed: {
    label: '완료',
    className: 'bg-iv-green/10 text-iv-green border-iv-green/20',
  },
  archived: {
    label: '보관',
    className: 'bg-iv-text3/10 text-iv-text3 border-iv-text3/20',
  },
};

export function JobStatusBadge({ status }: { status: JobDescriptionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 2: job-card 구현**

```typescript
// src/components/interviews/job-card.tsx
'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobStatusBadge } from '@/components/interviews/job-status-badge';
import { deleteJobAction } from '@/actions/job-actions';
import { cn } from '@/lib/utils';
import type { JobDescription } from '@/data-access/types';

interface Props {
  job: JobDescription;
}

export function JobCard({ job }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`"${job.companyName} — ${job.positionTitle}" JD를 삭제하시겠습니까?`))
      return;
    startTransition(async () => {
      try {
        await deleteJobAction(job.id);
      } catch {
        setError('삭제에 실패했습니다');
      }
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/interviews/jobs/${job.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/interviews/jobs/${job.id}`);
        }
      }}
      className={cn(
        'group border-iv-border bg-iv-bg hover:bg-iv-bg3 cursor-pointer rounded-lg border p-4 transition-colors',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-iv-text truncate text-sm font-medium">{job.companyName}</h3>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-iv-text2 mt-1 truncate text-xs">{job.positionTitle}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          title="삭제"
          className="opacity-0 group-hover:opacity-100 hover:text-iv-red hover:bg-iv-red/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="text-iv-text3 mt-3 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <FileText className="size-3" />
          질문 {job.questionCount}개
        </span>
        <span>{new Date(job.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
      {error && <p className="text-iv-red mt-2 text-xs">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: 개발 서버에서 import 확인 (빌드 깨짐 없는지)**

Run: `pnpm build`
Expected: 빌드 성공 (아직 페이지에서 사용하지 않으므로 tree-shaking)

- [ ] **Step 4: 커밋**

```bash
git add src/components/interviews/job-status-badge.tsx src/components/interviews/job-card.tsx
git commit -m "feat: JD 상태 뱃지 및 카드 컴포넌트"
```

---

## Task 6: JD 목록 페이지 + sidebar-nav 수정

**Files:**

- Modify: `src/app/interviews/page.tsx`
- Modify: `src/components/interviews/sidebar-nav.tsx`

- [ ] **Step 1: sidebar-nav JD 라우트 활성화 수정**

`src/components/interviews/sidebar-nav.tsx`에서 `!isQuestions` 조건을 `pathname === '/interviews' || pathname.startsWith('/interviews/jobs')`로 변경:

```typescript
// src/components/interviews/sidebar-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarNav() {
  const pathname = usePathname();
  const isJdSection = pathname === '/interviews' || pathname.startsWith('/interviews/jobs');
  const isQuestions = pathname.startsWith('/interviews/questions');

  return (
    <nav className="border-iv-border bg-iv-bg2 flex w-52 shrink-0 flex-col gap-1 border-r p-3">
      <Link
        href="/interviews"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isJdSection
            ? 'bg-iv-accent/10 text-iv-accent'
            : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
        )}
      >
        <FolderOpen className="size-4 shrink-0" />
        <span>JD 관리</span>
      </Link>
      <Link
        href="/interviews/questions"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isQuestions
            ? 'bg-iv-accent/10 text-iv-accent'
            : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
        )}
      >
        <LayoutList className="size-4 shrink-0" />
        <span>공통 라이브러리</span>
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: JD 목록 페이지 구현**

```typescript
// src/app/interviews/page.tsx
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/interviews/job-card';
import { JobStatusFilter } from '@/components/interviews/job-status-filter';
import { getAllJobs } from '@/data-access/jobs';

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function InterviewsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const allJobs = getAllJobs();
  const jobs = status ? allJobs.filter((j) => j.status === status) : allJobs;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-iv-text text-lg font-medium">JD 관리</h2>
          <p className="text-iv-text3 mt-1 text-sm">
            면접 대상 JD를 관리하고 질문을 맞춤 구성합니다.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/interviews/jobs/new">
            <Plus className="size-4" />
            새 JD
          </Link>
        </Button>
      </div>

      <JobStatusFilter currentStatus={status ?? null} />

      {jobs.length === 0 ? (
        <div className="text-iv-text3 flex flex-col items-center justify-center py-16 text-sm">
          <p>등록된 JD가 없습니다.</p>
          <p className="mt-1 text-xs">새 JD를 추가하여 면접을 준비하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
```

상태 필터 컴포넌트도 함께 생성:

```typescript
// src/components/interviews/job-status-filter.tsx
'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const FILTERS = [
  { value: null, label: '전체' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'archived', label: '보관' },
] as const;

interface Props {
  currentStatus: string | null;
}

export function JobStatusFilter({ currentStatus }: Props) {
  const router = useRouter();

  return (
    <div className="mb-4 flex gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.value ?? 'all'}
          onClick={() =>
            router.push(f.value ? `/interviews?status=${f.value}` : '/interviews')
          }
          className={cn(
            'rounded-md px-3 py-1.5 text-xs transition-colors',
            currentStatus === f.value
              ? 'bg-iv-accent/10 text-iv-accent'
              : 'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 개발 서버 확인**

Run: `pnpm dev` → `http://localhost:3000/interviews` 접속
Expected: JD 목록 페이지 렌더링 (빈 상태 또는 시드 데이터 표시)

- [ ] **Step 4: 커밋**

```bash
git add src/app/interviews/page.tsx src/components/interviews/sidebar-nav.tsx src/components/interviews/job-status-filter.tsx
git commit -m "feat: JD 목록 페이지, 상태 필터, sidebar-nav 활성화 수정"
```

---

## Task 7: JD 생성/수정 폼 + 페이지

**Files:**

- Create: `src/components/interviews/job-form.tsx`
- Create: `src/app/interviews/jobs/new/page.tsx`
- Create: `src/app/interviews/jobs/[id]/edit/page.tsx`

- [ ] **Step 1: job-form 구현**

```typescript
// src/components/interviews/job-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createJobAction, updateJobAction } from '@/actions/job-actions';
import type { JobDescription } from '@/data-access/types';

interface Props {
  job?: JobDescription;
}

export function JobForm({ job }: Props) {
  const router = useRouter();
  const isEdit = !!job;
  const [companyName, setCompanyName] = useState(job?.companyName ?? '');
  const [positionTitle, setPositionTitle] = useState(job?.positionTitle ?? '');
  const [memo, setMemo] = useState(job?.memo ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !positionTitle.trim()) {
      setError('회사명과 포지션은 필수 입력입니다');
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateJobAction({
            id: job.id,
            companyName: companyName.trim(),
            positionTitle: positionTitle.trim(),
            memo: memo.trim() || null,
          });
          router.push(`/interviews/jobs/${job.id}`);
        } else {
          const result = await createJobAction({
            companyName: companyName.trim(),
            positionTitle: positionTitle.trim(),
            memo: memo.trim() || null,
          });
          router.push(`/interviews/jobs/${result.id}`);
        }
      } catch {
        setError('저장에 실패했습니다. 다시 시도해주세요.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className="text-iv-text3 mb-1.5 block text-xs font-medium">
          회사명 <span className="text-iv-red">*</span>
        </label>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="예: 카카오"
          disabled={isPending}
          className="bg-iv-bg2 border-iv-border"
        />
      </div>

      <div>
        <label className="text-iv-text3 mb-1.5 block text-xs font-medium">
          포지션 <span className="text-iv-red">*</span>
        </label>
        <Input
          value={positionTitle}
          onChange={(e) => setPositionTitle(e.target.value)}
          placeholder="예: 프론트엔드 시니어"
          disabled={isPending}
          className="bg-iv-bg2 border-iv-border"
        />
      </div>

      <div>
        <label className="text-iv-text3 mb-1.5 block text-xs font-medium">메모 (선택)</label>
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="JD에 대한 메모"
          rows={3}
          disabled={isPending}
          className="bg-iv-bg2 border-iv-border resize-none"
        />
      </div>

      {error && <p className="text-iv-red text-xs">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? '저장 중...' : isEdit ? '수정' : '생성'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
          className="border-iv-border text-iv-text2"
        >
          취소
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: JD 생성 페이지**

```typescript
// src/app/interviews/jobs/new/page.tsx
import { JobForm } from '@/components/interviews/job-form';

export default function NewJobPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-iv-text text-lg font-medium">새 JD 만들기</h2>
        <p className="text-iv-text3 mt-1 text-sm">면접 준비할 JD 정보를 입력하세요.</p>
      </div>
      <JobForm />
    </div>
  );
}
```

- [ ] **Step 3: JD 수정 페이지**

```typescript
// src/app/interviews/jobs/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { JobForm } from '@/components/interviews/job-form';
import { getJobById } from '@/data-access/jobs';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditJobPage({ params }: Props) {
  const { id } = await params;
  const job = getJobById(Number(id));
  if (!job) notFound();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-iv-text text-lg font-medium">JD 수정</h2>
        <p className="text-iv-text3 mt-1 text-sm">
          {job.companyName} — {job.positionTitle}
        </p>
      </div>
      <JobForm job={job} />
    </div>
  );
}
```

- [ ] **Step 4: 개발 서버 확인**

Run: `pnpm dev` → `/interviews/jobs/new` 접속
Expected: 생성 폼 렌더링, 입력 후 생성 시 상세 페이지로 이동

- [ ] **Step 5: 커밋**

```bash
git add src/components/interviews/job-form.tsx src/app/interviews/jobs/
git commit -m "feat: JD 생성/수정 폼 및 페이지"
```

---

## Task 8: JD 상세 페이지 + 질문 가져오기 모달

**Files:**

- Create: `src/components/interviews/import-modal.tsx`
- Create: `src/app/interviews/jobs/[id]/page.tsx`

- [ ] **Step 1: import-modal 구현**

```typescript
// src/components/interviews/import-modal.tsx
'use client';

import { useState, useTransition } from 'react';
import { Download, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { importQuestionsAction } from '@/actions/import-actions';
import { cn } from '@/lib/utils';
import type { InterviewQuestion, InterviewCategory } from '@/data-access/types';

interface Props {
  jdId: number;
  libraryQuestions: InterviewQuestion[];
  categories: InterviewCategory[];
  /** origin_question_id가 이미 JD에 있는 질문 ID 배열 (Server→Client 직렬화 가능) */
  importedOriginIds: number[];
}

export function ImportModal({
  jdId,
  libraryQuestions,
  categories,
  importedOriginIds: importedOriginIdsArray,
}: Props) {
  const importedOriginIds = new Set(importedOriginIdsArray);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = filterCategoryId
    ? libraryQuestions.filter((q) => q.categoryId === filterCategoryId)
    : libraryQuestions;

  function toggleQuestion(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const available = filtered.filter((q) => !importedOriginIds.has(q.id));
    const allSelected = available.every((q) => selectedIds.has(q.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(available.map((q) => q.id)));
    }
  }

  function handleImport() {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      try {
        await importQuestionsAction({
          jdId,
          questionIds: Array.from(selectedIds),
        });
        setSelectedIds(new Set());
        setError(null);
        setOpen(false);
      } catch {
        setError('가져오기에 실패했습니다. 다시 시도해주세요.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-iv-border text-iv-text2">
          <Download className="size-4" />
          질문 가져오기
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-iv-bg border-iv-border max-h-[80vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-iv-text">공통 라이브러리에서 질문 가져오기</DialogTitle>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 py-2">
          <button
            onClick={() => setFilterCategoryId(null)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs transition-colors',
              filterCategoryId === null
                ? 'bg-iv-accent/10 text-iv-accent'
                : 'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3'
            )}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategoryId(cat.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs transition-colors',
                filterCategoryId === cat.id
                  ? 'bg-iv-accent/10 text-iv-accent'
                  : 'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3'
              )}
            >
              {cat.icon} {cat.displayLabel}
            </button>
          ))}
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto border-iv-border space-y-1 border-t pt-3">
          {filtered.map((q) => {
            const isImported = importedOriginIds.has(q.id);
            return (
              <label
                key={q.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer',
                  isImported
                    ? 'opacity-50 cursor-default'
                    : 'hover:bg-iv-bg3'
                )}
              >
                <Checkbox
                  checked={isImported || selectedIds.has(q.id)}
                  onCheckedChange={() => !isImported && toggleQuestion(q.id)}
                  disabled={isImported}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-iv-text text-sm leading-relaxed">{q.question}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {q.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-iv-text3 bg-iv-bg3 border-iv-border rounded border px-1.5 py-0.5 text-[10px]"
                      >
                        {kw}
                      </span>
                    ))}
                    {isImported && (
                      <Badge variant="outline" className="text-iv-green border-iv-green/20 text-[10px]">
                        <Check className="mr-0.5 size-2.5" />
                        가져옴
                      </Badge>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        {error && <p className="text-iv-red text-xs">{error}</p>}
        <div className="border-iv-border flex items-center justify-between border-t pt-3">
          <button
            onClick={toggleAll}
            className="text-iv-text3 hover:text-iv-text text-xs transition-colors"
          >
            {filtered.filter((q) => !importedOriginIds.has(q.id)).every((q) => selectedIds.has(q.id))
              ? '전체 해제'
              : '전체 선택'}
          </button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={isPending || selectedIds.size === 0}
          >
            {isPending
              ? '가져오는 중...'
              : `${selectedIds.size}개 가져오기`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: JD 상세 페이지 구현**

```typescript
// src/app/interviews/jobs/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobStatusBadge } from '@/components/interviews/job-status-badge';
import { QuestionTable } from '@/components/interviews/question-table';
import { QuestionEditDrawer } from '@/components/interviews/question-edit-drawer';
import { ImportModal } from '@/components/interviews/import-modal';
import { getJobById } from '@/data-access/jobs';
import { getQuestionsByJdId } from '@/data-access/questions';
import { getCategoriesByJdId, getGlobalCategories } from '@/data-access/categories';
import { getLibraryQuestions } from '@/data-access/questions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = getJobById(Number(id));
  if (!job) notFound();

  const jdQuestions = getQuestionsByJdId(job.id);
  const jdCategories = getCategoriesByJdId(job.id);

  // import-modal에 필요한 데이터
  const libraryQuestions = getLibraryQuestions();
  const globalCategories = getGlobalCategories();
  const importedOriginIds = jdQuestions
    .filter((q) => q.originQuestionId !== null)
    .map((q) => q.originQuestionId as number);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-iv-text text-lg font-medium">{job.companyName}</h2>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-iv-text2 mt-1 text-sm">{job.positionTitle}</p>
          {job.memo && <p className="text-iv-text3 mt-2 text-xs">{job.memo}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ImportModal
            jdId={job.id}
            libraryQuestions={libraryQuestions}
            categories={globalCategories}
            importedOriginIds={importedOriginIds}
          />
          <Button asChild variant="outline" size="sm" className="border-iv-border text-iv-text2">
            <Link href={`/interviews/jobs/${job.id}/edit`}>
              <Pencil className="size-4" />
              수정
            </Link>
          </Button>
        </div>
      </div>

      {/* Questions */}
      <QuestionTable questions={jdQuestions} />

      {/* Edit Drawer */}
      <QuestionEditDrawer questions={jdQuestions} categories={jdCategories} />
    </div>
  );
}
```

- [ ] **Step 3: 개발 서버 확인**

Run: `pnpm dev` → JD 생성 → 상세 페이지 접속 → 질문 가져오기 모달 테스트
Expected: 모달 열기, 질문 선택, 가져오기 동작, "가져옴" 뱃지 표시

- [ ] **Step 4: 커밋**

```bash
git add src/components/interviews/import-modal.tsx src/app/interviews/jobs/
git commit -m "feat: JD 상세 페이지 및 질문 가져오기 모달"
```

---

## Task 9: /study 페이지 JD 선택 통합

**Files:**

- Modify: `src/components/study/sidebar.tsx`
- Modify: `src/app/study/page.tsx`

- [ ] **Step 1: sidebar에 JD 선택 드롭다운 추가**

`src/components/study/sidebar.tsx` 상단에 JD 선택 추가. props로 `jobs` 배열을 받고, 선택 시 `router.push('/study?jdId=N')` 호출.

sidebar.tsx 상단에 추가할 코드:

```typescript
// sidebar.tsx에 추가할 import
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JobDescription } from '@/data-access/types';

// Props 확장
interface SidebarProps {
  categories: InterviewCategory[];
  jobs: JobDescription[];
}

// 컴포넌트 내부 상단에 JD 선택 드롭다운 추가
export function Sidebar({ categories, jobs }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentJdId = searchParams.get('jdId');
  // ... 기존 코드 유지

  // JSX 최상단, "전체" 버튼 위에:
  // <Select
  //   value={currentJdId ?? ''}
  //   onValueChange={(value) => {
  //     if (value === '') router.push('/study');
  //     else router.push(`/study?jdId=${value}`);
  //   }}
  // >
  //   <SelectTrigger className="mb-3 h-8 bg-iv-bg border-iv-border text-xs">
  //     <SelectValue placeholder="공통 라이브러리" />
  //   </SelectTrigger>
  //   <SelectContent>
  //     <SelectItem value="">공통 라이브러리</SelectItem>
  //     {jobs.map((job) => (
  //       <SelectItem key={job.id} value={String(job.id)}>
  //         {job.companyName} — {job.positionTitle}
  //       </SelectItem>
  //     ))}
  //   </SelectContent>
  // </Select>
}
```

주의: `Select`의 `value=""`는 shadcn/radix에서 문제될 수 있음. `value="library"`로 대체하고 조건 분기 처리.

- [ ] **Step 2: /study/page.tsx searchParams 기반 데이터 fetch**

```typescript
// src/app/study/page.tsx
import { InterviewHeader } from '@/components/study/interview-header';
import { QAList } from '@/components/study/qa-list';
import { SearchInput } from '@/components/study/search-input';
import { Sidebar } from '@/components/study/sidebar';
import {
  getLibraryQuestions,
  getGlobalCategories,
  getQuestionsByJdId,
  getCategoriesByJdId,
} from '@/data-access';
import { getAllJobs } from '@/data-access/jobs';

interface Props {
  searchParams: Promise<{ jdId?: string }>;
}

export default async function StudyPage({ searchParams }: Props) {
  const { jdId } = await searchParams;
  const jdIdNum = jdId ? Number(jdId) : null;

  const items =
    jdIdNum !== null
      ? getQuestionsByJdId(jdIdNum)
      : getLibraryQuestions();

  const categories =
    jdIdNum !== null
      ? getCategoriesByJdId(jdIdNum)
      : getGlobalCategories();

  const jobs = getAllJobs();
  const allItemIds = items.map((item) => item.id);

  return (
    <div className="bg-iv-bg text-iv-text min-h-screen">
      <InterviewHeader totalCount={items.length} allItemIds={allItemIds} />
      <div className="grid min-h-[calc(100vh-57px)] grid-cols-[230px_1fr]">
        <Sidebar categories={categories} jobs={jobs} />
        <main className="overflow-y-auto p-6">
          <SearchInput />
          <QAList items={items} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: data-access/index.ts에 필요한 export 확인**

`getQuestionsByJdId`, `getCategoriesByJdId`가 index.ts에서 re-export 되는지 확인. 필요하면 추가.

- [ ] **Step 4: 개발 서버 확인**

Run: `pnpm dev` → `/study` → JD 드롭다운 선택 → 질문 리스트 변경 확인
Expected: JD 선택 시 URL에 `?jdId=N` 추가, 해당 JD 질문만 표시

- [ ] **Step 5: 커밋**

```bash
git add src/components/study/sidebar.tsx src/app/study/page.tsx
git commit -m "feat: /study 페이지 JD 선택 드롭다운 통합"
```

---

## Task 10: 전체 테스트 + 빌드 검증

- [ ] **Step 1: 전체 테스트 실행**

Run: `pnpm test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 빌드 검증**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 3: 최종 커밋 (필요 시)**

미처 커밋하지 못한 변경사항이 있으면 커밋.
