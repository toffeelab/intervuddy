# 소프트 삭제 & 복구 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소프트 삭제된 JD/질문을 `/interviews/trash` 페이지에서 복구하고, 보관 기간 만료 항목을 앱 시작 시 자동 정리한다.

**Architecture:** JD cascade soft delete/restore로 하위 질문 동기화. `purgeExpiredItems`로 만료 항목 영구 삭제. `/interviews/trash` Server Component 페이지 + `TrashSection` Client Component로 복구 UI 제공.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript 5, SQLite (better-sqlite3), Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-soft-delete-and-recovery-design.md`

---

## 파일 맵

| 액션   | 파일                                          | 역할                                                         |
| ------ | --------------------------------------------- | ------------------------------------------------------------ |
| Create | `src/data-access/cleanup.ts`                  | 만료 항목 영구 삭제                                          |
| Create | `src/data-access/cleanup.test.ts`             | 정리 로직 테스트                                             |
| Modify | `src/data-access/jobs.ts`                     | `softDeleteJobWithQuestions`, `restoreJobWithQuestions` 추가 |
| Modify | `src/data-access/jobs.test.ts`                | cascade 삭제/복구 테스트 추가                                |
| Modify | `src/actions/job-actions.ts`                  | `deleteJobAction` 변경 + `restoreJobAction` 추가             |
| Modify | `src/actions/job-actions.test.ts`             | restoreJobAction 테스트 추가                                 |
| Modify | `src/actions/question-actions.ts`             | delete/restore에 `/interviews/trash` revalidate 추가         |
| Modify | `src/actions/followup-actions.ts`             | delete/restore에 `/interviews/trash` revalidate 추가         |
| Modify | `src/actions/category-actions.ts`             | delete/restore에 `/interviews/trash` revalidate 추가         |
| Create | `src/components/interviews/trash-section.tsx` | 삭제 항목 리스트 + 복구 버튼                                 |
| Create | `src/app/interviews/trash/page.tsx`           | 휴지통 페이지                                                |
| Modify | `src/components/interviews/sidebar-nav.tsx`   | 휴지통 링크 추가                                             |
| Create | `src/db/startup.ts`                           | 앱 시작 시 만료 항목 정리                                    |
| Modify | `src/db/index.ts`                             | startup 호출 추가                                            |

---

## Task 1: JD cascade soft delete/restore (TDD)

**Files:**

- Modify: `src/data-access/jobs.ts`
- Modify: `src/data-access/jobs.test.ts`

- [ ] **Step 1: cascade 삭제/복구 테스트 추가**

`src/data-access/jobs.test.ts` 하단에 추가:

기존 test 파일 상단 import에 추가:

- `seedTestQuestions`를 `@/test/helpers/db`에서 import
- `softDeleteJobWithQuestions`, `restoreJobWithQuestions`를 `./jobs`에서 import
- `getQuestionsByJdId`, `getDeletedQuestions`를 `./questions`에서 static import

```typescript
describe('softDeleteJobWithQuestions', () => {
  it('JD 삭제 시 하위 질문도 함께 소프트 삭제', () => {
    seedTestQuestions(db); // category 1, question 1
    seedTestJobDescription(db); // jd 1
    // question 1을 jd 1에 연결
    db.prepare('UPDATE interview_questions SET jd_id = 1 WHERE id = 1').run();

    softDeleteJobWithQuestions(1);

    // JD 삭제됨
    expect(getAllJobs()).toHaveLength(0);
    expect(getDeletedJobs()).toHaveLength(1);

    // 하위 질문도 삭제됨
    expect(getQuestionsByJdId(1)).toHaveLength(0);
    expect(getDeletedQuestions(1)).toHaveLength(1);
  });
});

describe('restoreJobWithQuestions', () => {
  it('JD 복구 시 함께 삭제된 질문도 복구', () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);
    db.prepare('UPDATE interview_questions SET jd_id = 1 WHERE id = 1').run();

    softDeleteJobWithQuestions(1);
    restoreJobWithQuestions(1);

    expect(getAllJobs()).toHaveLength(1);
    expect(getQuestionsByJdId(1)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/jobs.test.ts`
Expected: FAIL — `softDeleteJobWithQuestions` not found

- [ ] **Step 3: cascade 함수 구현**

`src/data-access/jobs.ts` 하단에 추가:

```typescript
export function softDeleteJobWithQuestions(id: number): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    // JD soft delete
    db.prepare(`UPDATE job_descriptions SET deleted_at = datetime('now') WHERE id = ?`).run(id);
    // 해당 JD의 활성 질문 모두 soft delete (같은 시간으로)
    db.prepare(
      `UPDATE interview_questions SET deleted_at = datetime('now') WHERE jd_id = ? AND deleted_at IS NULL`
    ).run(id);
  });
  transaction();
}

export function restoreJobWithQuestions(id: number): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    // JD의 deleted_at 시간 조회
    const job = db.prepare(`SELECT deleted_at FROM job_descriptions WHERE id = ?`).get(id) as
      | { deleted_at: string | null }
      | undefined;

    // JD restore
    db.prepare(`UPDATE job_descriptions SET deleted_at = NULL WHERE id = ?`).run(id);

    // JD와 동일 시점에 삭제된 질문들 복구 (±1초 허용)
    if (job?.deleted_at) {
      db.prepare(
        `UPDATE interview_questions SET deleted_at = NULL
         WHERE jd_id = ? AND deleted_at IS NOT NULL
         AND abs(julianday(deleted_at) - julianday(?)) < (1.0 / 86400.0)`
      ).run(id, job.deleted_at);
    }
  });
  transaction();
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/jobs.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/jobs.ts src/data-access/jobs.test.ts
git commit -m "feat: JD cascade soft delete/restore 구현"
```

---

## Task 2: 영구 삭제 정리 로직 (TDD)

**Files:**

- Create: `src/data-access/cleanup.ts`
- Create: `src/data-access/cleanup.test.ts`

- [ ] **Step 1: cleanup 테스트 작성**

```typescript
// src/data-access/cleanup.test.ts
import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestDb,
  cleanupTestDb,
  seedTestQuestions,
  seedTestJobDescription,
} from '@/test/helpers/db';
import { purgeExpiredItems } from './cleanup';
import { softDeleteQuestion, getDeletedQuestions } from './questions';
import { softDeleteFollowup } from './followups';
import { softDeleteJob, getDeletedJobs } from './jobs';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  cleanupTestDb(db);
});

describe('purgeExpiredItems', () => {
  it('보관 기간 만료 항목 영구 삭제', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    // deleted_at을 31일 전으로 조작
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.questions).toBe(1);
    expect(getDeletedQuestions()).toHaveLength(0);
  });

  it('보관 기간 내 항목은 유지', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    // deleted_at을 29일 전으로 조작
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-29 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.questions).toBe(0);
    expect(getDeletedQuestions()).toHaveLength(1);
  });

  it('JD 만료 시 영구 삭제', () => {
    seedTestJobDescription(db);
    softDeleteJob(1);
    db.prepare(
      "UPDATE job_descriptions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.jobs).toBe(1);
    expect(getDeletedJobs()).toHaveLength(0);
  });

  it('만료된 followup도 영구 삭제', () => {
    seedTestQuestions(db); // question 1 + followup 1
    softDeleteFollowup(1);
    db.prepare(
      "UPDATE followup_questions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(30);
    expect(purged.followups).toBe(1);
  });

  it('retentionDays 미지정 시 DEFAULT_RETENTION_DAYS 사용', () => {
    seedTestQuestions(db);
    softDeleteQuestion(1);
    db.prepare(
      "UPDATE interview_questions SET deleted_at = datetime('now', '-31 days') WHERE id = 1"
    ).run();

    const purged = purgeExpiredItems(); // default = 30
    expect(purged.questions).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/data-access/cleanup.test.ts`
Expected: FAIL

- [ ] **Step 3: cleanup 구현**

```typescript
// src/data-access/cleanup.ts
import { getDb } from '@/db/index';
import { DEFAULT_RETENTION_DAYS } from '@/lib/retention-policy';

interface PurgeResult {
  questions: number;
  followups: number;
  categories: number;
  jobs: number;
}

export function purgeExpiredItems(retentionDays: number = DEFAULT_RETENTION_DAYS): PurgeResult {
  const db = getDb();
  const param = `-${retentionDays} days`;

  let followups = 0;
  let questions = 0;
  let categories = 0;
  let jobs = 0;

  const transaction = db.transaction(() => {
    // 순서 중요: FK 의존성 (자식 → 부모)
    // question_keywords는 ON DELETE CASCADE로 자동 삭제
    followups = db
      .prepare(
        "DELETE FROM followup_questions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;

    questions = db
      .prepare(
        "DELETE FROM interview_questions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;

    categories = db
      .prepare(
        "DELETE FROM interview_categories WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;

    jobs = db
      .prepare(
        "DELETE FROM job_descriptions WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)"
      )
      .run(param).changes;
  });

  transaction();

  return { questions, followups, categories, jobs };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/data-access/cleanup.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/data-access/cleanup.ts src/data-access/cleanup.test.ts
git commit -m "feat: 보관 기간 만료 항목 영구 삭제 로직"
```

---

## Task 3: Server Actions 수정 (restoreJobAction + revalidate 경로)

**Files:**

- Modify: `src/actions/job-actions.ts`
- Modify: `src/actions/job-actions.test.ts`
- Modify: `src/actions/question-actions.ts`
- Modify: `src/actions/followup-actions.ts`
- Modify: `src/actions/category-actions.ts`

- [ ] **Step 1: job-actions.test.ts에 restoreJobAction 테스트 추가**

기존 테스트 파일 하단에 추가:

```typescript
describe('restoreJobAction', () => {
  it('JD + 하위 질문 복구 + revalidate', async () => {
    seedTestQuestions(db);
    seedTestJobDescription(db);
    db.prepare('UPDATE interview_questions SET jd_id = 1 WHERE id = 1').run();

    // cascade 삭제 (static import 사용)
    softDeleteJobWithQuestions(1);
    expect(getAllJobs()).toHaveLength(0);

    await restoreJobAction(1);

    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/interviews/trash');
    expect(getAllJobs()).toHaveLength(1);

    // 하위 질문도 복구됨
    const { getQuestionsByJdId } = await import('@/data-access/questions');
    expect(getQuestionsByJdId(1)).toHaveLength(1);
  });
});
```

> 기존 import에 추가할 것:
>
> - `restoreJobAction`을 `./job-actions`에서 import
> - `seedTestQuestions`를 `@/test/helpers/db`에서 import
> - `softDeleteJobWithQuestions`를 `@/data-access/jobs`에서 import
> - `getQuestionsByJdId`는 테스트 내에서 dynamic import 사용 (action test에서는 data-access를 mock하지 않으므로 OK)

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/actions/job-actions.test.ts`
Expected: FAIL — `restoreJobAction` not found

- [ ] **Step 3: job-actions.ts 수정**

```typescript
// src/actions/job-actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import {
  createJob,
  updateJob,
  updateJobStatus,
  softDeleteJobWithQuestions,
  restoreJobWithQuestions,
} from '@/data-access/jobs';
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
  softDeleteJobWithQuestions(id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
}

export async function restoreJobAction(id: number) {
  restoreJobWithQuestions(id);
  revalidatePath('/interviews');
  revalidatePath('/interviews/trash');
  revalidatePath(`/interviews/jobs/${id}`);
}
```

- [ ] **Step 4: 기존 actions에 `/interviews/trash` revalidate 추가**

`src/actions/question-actions.ts` — `deleteQuestionAction`과 `restoreQuestionAction`에 `revalidatePath('/interviews/trash')` 추가.

`src/actions/followup-actions.ts` — `deleteFollowupAction`과 `restoreFollowupAction`에 `revalidatePath('/interviews/trash')` 추가.

`src/actions/category-actions.ts` — `deleteCategoryAction`과 `restoreCategoryAction`에 `revalidatePath('/interviews/trash')` 추가.

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test src/actions/job-actions.test.ts`
Expected: PASS

- [ ] **Step 6: 전체 테스트**

Run: `pnpm test`
Expected: 모든 테스트 PASS

- [ ] **Step 7: 커밋**

```bash
git add src/actions/
git commit -m "feat: restoreJobAction + 모든 delete/restore action에 /interviews/trash revalidate 추가"
```

---

## Task 4: 휴지통 컴포넌트 + 페이지

**Files:**

- Create: `src/components/interviews/trash-section.tsx`
- Create: `src/app/interviews/trash/page.tsx`

- [ ] **Step 1: trash-section 컴포넌트 구현**

```typescript
// src/components/interviews/trash-section.tsx
'use client';

import { useState, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TrashItem {
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

function getRemainingDays(deletedAt: string, retentionDays: number): number {
  const deletedDate = new Date(deletedAt + 'Z');
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, retentionDays - elapsed);
}

function TrashItemRow({
  item,
  onRestore,
  retentionDays,
}: {
  item: TrashItem;
  onRestore: (id: number) => Promise<void>;
  retentionDays: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const remaining = getRemainingDays(item.deletedAt, retentionDays);

  function handleRestore() {
    startTransition(async () => {
      try {
        await onRestore(item.id);
      } catch {
        setError('복구에 실패했습니다');
      }
    });
  }

  return (
    <div
      className={cn(
        'border-iv-border flex items-center gap-3 rounded-lg border px-4 py-3',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-iv-text truncate text-sm">{item.title}</p>
        {item.subtitle && (
          <p className="text-iv-text3 mt-0.5 truncate text-xs">{item.subtitle}</p>
        )}
        <p className="text-iv-text3 mt-1 text-[10px]">
          {remaining > 0 ? (
            <span className="text-iv-amber">{remaining}일 후 영구 삭제</span>
          ) : (
            <span className="text-iv-red">곧 영구 삭제됨</span>
          )}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestore}
        disabled={isPending}
        className="border-iv-border text-iv-text2 shrink-0"
      >
        <RotateCcw className="size-3.5" />
        {isPending ? '복구 중...' : '복구'}
      </Button>
      {error && <p className="text-iv-red text-xs">{error}</p>}
    </div>
  );
}

export function TrashSection({
  label,
  icon,
  items,
  onRestore,
  retentionDays,
}: TrashSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-iv-text text-sm font-medium">{label}</h3>
        <span className="text-iv-text3 text-xs">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <TrashItemRow
            key={`${item.type}-${item.id}`}
            item={item}
            onRestore={onRestore}
            retentionDays={retentionDays}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 휴지통 페이지 구현**

```typescript
// src/app/interviews/trash/page.tsx
import { Trash2, FolderOpen, FileText } from 'lucide-react';
import { TrashSection } from '@/components/interviews/trash-section';
import { getDeletedJobs } from '@/data-access/jobs';
import { getDeletedQuestions } from '@/data-access/questions';
import { restoreJobAction } from '@/actions/job-actions';
import { restoreQuestionAction } from '@/actions/question-actions';
import { DEFAULT_RETENTION_DAYS } from '@/lib/retention-policy';
import type { TrashItem } from '@/components/interviews/trash-section';

export default function TrashPage() {
  const deletedJobs = getDeletedJobs();
  const deletedQuestions = getDeletedQuestions();

  const jobItems: TrashItem[] = deletedJobs.map((j) => ({
    id: j.id,
    type: 'job' as const,
    title: j.companyName,
    subtitle: j.positionTitle,
    deletedAt: j.deletedAt!,
  }));

  const questionItems: TrashItem[] = deletedQuestions.map((q) => ({
    id: q.id,
    type: 'question' as const,
    title: q.question,
    subtitle: q.categoryDisplayLabel,
    deletedAt: q.deletedAt!,
  }));

  const isEmpty = jobItems.length === 0 && questionItems.length === 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Trash2 className="text-iv-text3 size-5" />
          <h2 className="text-iv-text text-lg font-medium">휴지통</h2>
        </div>
        <p className="text-iv-text3 mt-1 text-sm">
          삭제된 항목은 {DEFAULT_RETENTION_DAYS}일간 보관 후 영구 삭제됩니다.
        </p>
      </div>

      {isEmpty ? (
        <div className="text-iv-text3 flex flex-col items-center justify-center py-16 text-sm">
          <Trash2 className="mb-3 size-10 opacity-20" />
          <p>삭제된 항목이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <TrashSection
            label="삭제된 JD"
            icon={<FolderOpen className="text-iv-text3 size-4" />}
            items={jobItems}
            onRestore={restoreJobAction}
            retentionDays={DEFAULT_RETENTION_DAYS}
          />
          <TrashSection
            label="삭제된 질문"
            icon={<FileText className="text-iv-text3 size-4" />}
            items={questionItems}
            onRestore={restoreQuestionAction}
            retentionDays={DEFAULT_RETENTION_DAYS}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add src/components/interviews/trash-section.tsx src/app/interviews/trash/
git commit -m "feat: 휴지통 페이지 및 TrashSection 컴포넌트"
```

---

## Task 5: sidebar-nav에 휴지통 링크 추가

**Files:**

- Modify: `src/components/interviews/sidebar-nav.tsx`

- [ ] **Step 1: sidebar-nav 수정**

```typescript
// src/components/interviews/sidebar-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, LayoutList, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarNav() {
  const pathname = usePathname();
  const isJdSection = pathname === '/interviews' || pathname.startsWith('/interviews/jobs');
  const isQuestions = pathname.startsWith('/interviews/questions');
  const isTrash = pathname.startsWith('/interviews/trash');

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

      {/* Divider */}
      <div className="border-iv-border my-1 border-t" />

      <Link
        href="/interviews/trash"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isTrash
            ? 'bg-iv-accent/10 text-iv-accent'
            : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
        )}
      >
        <Trash2 className="size-4 shrink-0" />
        <span>휴지통</span>
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add src/components/interviews/sidebar-nav.tsx
git commit -m "feat: sidebar-nav에 휴지통 링크 추가"
```

---

## Task 6: 앱 시작 시 만료 항목 정리

**Files:**

- Create: `src/db/startup.ts`
- Modify: `src/db/index.ts` (startup 호출 추가)

> `schema.ts`에 직접 추가하면 순환 의존 위험 + `createTestDb()`에서 매번 purge가 실행됨. 별도 `startup.ts`로 분리하여 프로덕션 DB 초기화 시에만 실행.

- [ ] **Step 1: startup 모듈 생성**

```typescript
// src/db/startup.ts
import { purgeExpiredItems } from '@/data-access/cleanup';

export function runStartupTasks(): void {
  purgeExpiredItems();
}
```

- [ ] **Step 2: db/index.ts에서 startup 호출**

`src/db/index.ts`에서 DB 초기화 후 `runStartupTasks()` 호출. 테스트 환경(`createTestDb`)은 `db/index.ts`의 default export를 사용하지 않고 `setDb()`로 직접 주입하므로 영향 없음.

`initializeDatabase()` 호출 뒤에 `runStartupTasks()` 추가:

```typescript
import { runStartupTasks } from './startup';

// 기존 initializeDatabase() 호출 뒤에:
runStartupTasks();
```

- [ ] **Step 3: 전체 테스트**

Run: `pnpm test`
Expected: 모든 테스트 PASS (테스트는 `createTestDb` → `setDb`로 별도 DB 사용, startup 미호출)

- [ ] **Step 4: 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add src/db/startup.ts src/db/index.ts
git commit -m "feat: 앱 시작 시 만료된 소프트 삭제 항목 자동 정리"
```

---

## Task 7: 전체 검증

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: 0 errors

- [ ] **Step 3: 빌드**

Run: `pnpm build`
Expected: 빌드 성공
