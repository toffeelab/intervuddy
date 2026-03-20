# Phase A: 멀티유저 인증 + 데이터 격리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NextAuth(Auth.js v5)로 Google/GitHub OAuth + 매직 링크 인증을 추가하고, 모든 data-access 함수에 userId 파라미터를 도입하여 멀티유저 데이터 격리를 구현한다.

**Architecture:** Auth.js v5의 JWT 세션 전략을 사용하여 인증하고, middleware.ts로 라우트를 보호한다. 모든 data-access 함수에 userId 첫 파라미터를 추가하고, Server Actions/Components에서 세션의 userId를 전달한다. DEFAULT_USER_ID 하드코딩을 제거한다.

**Tech Stack:** Auth.js v5 (@auth/core, next-auth), @auth/drizzle-adapter, Resend (매직 링크), Google/GitHub OAuth

**Spec:** `docs/superpowers/specs/2026-03-20-database-migration-multiuser-design.md` 섹션 4-5

---

## 파일 구조 맵

### 새로 생성할 파일

| 파일                                      | 책임                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| `src/auth.ts`                             | Auth.js v5 설정 (providers, adapter, callbacks)             |
| `src/middleware.ts`                       | 라우트 보호 (인증 필수 경로 정의)                           |
| `src/app/login/page.tsx`                  | 로그인 페이지 (소셜 + 매직 링크)                            |
| `src/app/login/layout.tsx`                | 로그인 레이아웃 (인증 시 리다이렉트)                        |
| `src/lib/auth.ts`                         | 세션 헬퍼 (getCurrentUserId 등)                             |
| `src/data-access/templates.ts`            | 시스템 템플릿 조회/import 함수                              |
| `src/components/shared/user-menu.tsx`     | 유저 아바타 + 드롭다운 메뉴 (Client Component + useSession) |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js API Route 핸들러                                    |
| `src/types/next-auth.d.ts`                | Auth.js 타입 확장 (session.user.id 타입)                    |

### 수정할 파일

| 파일                            | 변경 내용                                                              |
| ------------------------------- | ---------------------------------------------------------------------- |
| `package.json`                  | next-auth, @auth/drizzle-adapter, resend 추가                          |
| `src/db/schema.ts`              | Auth.js adapter 호환 확인 (이미 테이블 있음)                           |
| `src/data-access/jobs.ts`       | 모든 함수에 userId 첫 파라미터 추가                                    |
| `src/data-access/categories.ts` | 모든 함수에 userId 첫 파라미터 추가                                    |
| `src/data-access/questions.ts`  | 모든 함수에 userId 첫 파라미터 추가                                    |
| `src/data-access/followups.ts`  | 모든 함수에 userId 첫 파라미터 추가                                    |
| `src/data-access/import.ts`     | userId 파라미터 추가                                                   |
| `src/data-access/cleanup.ts`    | purgeAllExpiredItems (서버용) + purgeExpiredItemsForUser (유저용) 분리 |
| `src/instrumentation.ts`        | purgeAllExpiredItems 호출로 변경                                       |
| `src/actions/*.ts`              | 세션에서 userId 추출 → data-access에 전달                              |
| `src/app/interviews/**/*.tsx`   | 세션에서 userId 추출 → data-access에 전달                              |
| `src/app/study/page.tsx`        | 세션에서 userId 추출                                                   |
| `src/app/interviews/layout.tsx` | UserMenu 컴포넌트 추가                                                 |
| `src/test/helpers/db.ts`        | userId 파라미터 반영                                                   |
| `src/**/*.test.ts`              | userId 파라미터 추가                                                   |
| `.env.local`                    | AUTH_SECRET, OAuth 키 추가                                             |
| `.env.example`                  | 인증 환경변수 템플릿 추가                                              |
| `next.config.ts`                | Auth.js 관련 설정 (필요 시)                                            |

### 삭제할 코드

- `src/db/constants.ts`의 `DEFAULT_USER_ID` 사용처 전부 제거 (상수 자체는 시드/테스트에서만 유지)

---

## Task 1: Auth.js v5 + Resend 의존성 설치

**Files:**

- Modify: `package.json`
- Modify: `.env.local`
- Modify: `.env.example`

- [ ] **Step 1: 패키지 설치**

```bash
pnpm add next-auth@beta @auth/drizzle-adapter resend
```

Note: Auth.js v5는 `next-auth@beta`로 설치. `@auth/drizzle-adapter`는 Drizzle ORM 용 공식 어댑터.

- [ ] **Step 2: AUTH_SECRET 생성**

```bash
npx auth secret
```

생성된 시크릿을 `.env.local`에 추가.

- [ ] **Step 3: .env.local에 인증 환경변수 추가**

```env
# 기존
DATABASE_URL=postgresql://intervuddy:intervuddy@localhost:5433/intervuddy

# Auth.js
AUTH_SECRET=<생성된 시크릿>
AUTH_GOOGLE_ID=<Google Cloud Console에서 생성>
AUTH_GOOGLE_SECRET=<Google Cloud Console에서 생성>
AUTH_GITHUB_ID=<GitHub Settings > Developer settings에서 생성>
AUTH_GITHUB_SECRET=<GitHub Settings에서 생성>

# Resend (매직 링크)
AUTH_RESEND_KEY=<Resend Dashboard에서 생성>
AUTH_RESEND_FROM=noreply@intervuddy.com
```

Note: OAuth 키는 나중에 실제 값으로 교체. 일단 더미 값으로 설정해도 됨.

- [ ] **Step 4: .env.example 업데이트**

```env
DATABASE_URL=postgresql://intervuddy:intervuddy@localhost:5433/intervuddy
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_RESEND_KEY=
AUTH_RESEND_FROM=noreply@intervuddy.com
```

- [ ] **Step 5: 커밋**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add next-auth, drizzle-adapter, resend dependencies"
```

---

## Task 2: Auth.js 설정 + Drizzle Adapter

**Files:**

- Create: `src/auth.ts`
- Create: `src/lib/auth.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/db/schema.ts` (필요 시 adapter 호환 조정)

- [ ] **Step 1: src/auth.ts 생성**

Auth.js v5 설정 파일. 핵심:

- providers: Google, GitHub, Resend (매직 링크)
- adapter: @auth/drizzle-adapter (Drizzle + pg 연결)
- session: { strategy: "jwt" }
- callbacks: jwt에 user.id 포함, session에 user.id 노출

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDb } from '@/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb()),
  session: { strategy: 'jwt' },
  providers: [Google, GitHub, Resend({ from: 'noreply@intervuddy.com' })],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

주의: `@auth/drizzle-adapter`가 현재 스키마의 테이블 이름/컬럼과 호환되는지 확인 필요. Auth.js는 기본적으로 `users`, `accounts`, `sessions`, `verification_tokens` 테이블을 기대함. 현재 스키마에 이미 있으므로 호환될 것이나, 컬럼 이름 매핑이 필요할 수 있음.

DrizzleAdapter에 명시적 스키마 매핑이 **필수**:

```typescript
import { users, accounts, verificationTokens } from '@/db/schema';
DrizzleAdapter(getDb(), {
  usersTable: users,
  accountsTable: accounts,
  verificationTokensTable: verificationTokens,
});
```

Auth.js v5 + Drizzle Adapter 공식 문서를 반드시 확인하여 정확한 API 사용. 컬럼 이름이 camelCase(Drizzle)인지 snake_case(DB)인지 매핑이 맞는지 검증.

- [ ] **Step 1.5: src/types/next-auth.d.ts 생성**

Auth.js의 Session 타입에 user.id를 추가:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

이 파일이 없으면 `session.user.id`에서 TypeScript 에러 발생.

- [ ] **Step 2: src/lib/auth.ts 생성**

Server Component/Action에서 사용할 헬퍼:

```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

export async function getOptionalUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
```

- [ ] **Step 3: API Route 핸들러 생성**

Auth.js v5는 API Route가 필요:

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

- [ ] **Step 4: 스키마 호환성 확인**

`@auth/drizzle-adapter`가 현재 `src/db/schema.ts`의 테이블과 호환되는지 확인. 특히:

- `users` 테이블의 컬럼 이름
- `accounts` 테이블의 컬럼 이름
- `verificationTokens` 테이블 (sessions 테이블은 JWT 전략이라 불필요)

호환되지 않으면 adapter에 테이블 매핑 전달.

- [ ] **Step 5: 커밋**

```bash
git add src/auth.ts src/lib/auth.ts src/app/api/auth/
git commit -m "feat: configure Auth.js v5 with Google, GitHub, Resend providers"
```

---

## Task 3: 미들웨어 + 로그인 페이지

**Files:**

- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/layout.tsx`

- [ ] **Step 1: src/middleware.ts 생성**

```typescript
export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/interviews/:path*', '/study/:path*'],
};
```

이렇게 하면 `/interviews/*`와 `/study/*`에 접근 시 인증이 필요하고, 미인증 시 `/login`으로 리다이렉트됨.
`/` (랜딩)과 `/login`은 인증 불문 접근 가능.

Auth.js v5의 `authorized` 콜백이 필요할 수 있음:

```typescript
// src/auth.ts에 추가
callbacks: {
  authorized({ auth, request: { nextUrl } }) {
    const isLoggedIn = !!auth?.user;
    const isProtected = nextUrl.pathname.startsWith('/interviews') || nextUrl.pathname.startsWith('/study');
    if (isProtected && !isLoggedIn) return false; // → /login 리다이렉트
    if (nextUrl.pathname === '/login' && isLoggedIn) {
      return Response.redirect(new URL('/interviews', nextUrl)); // 인증 시 /interviews로
    }
    return true;
  },
}
```

- [ ] **Step 2: src/app/login/page.tsx 생성**

로그인 페이지 UI:

- "Continue with Google" 버튼
- "Continue with GitHub" 버튼
- 이메일 입력 + "매직 링크 보내기" 버튼
- 앱 로고/타이틀

shadcn/ui의 Button, Input, Card 컴포넌트 사용. signIn() 호출.

```typescript
import { signIn } from '@/auth';

// Google 로그인
<form action={async () => { 'use server'; await signIn('google'); }}>
  <Button type="submit">Continue with Google</Button>
</form>

// GitHub 로그인
<form action={async () => { 'use server'; await signIn('github'); }}>
  <Button type="submit">Continue with GitHub</Button>
</form>

// 매직 링크
<form action={async (formData) => {
  'use server';
  await signIn('resend', formData);
}}>
  <Input type="email" name="email" placeholder="이메일 주소" />
  <Button type="submit">매직 링크 보내기</Button>
</form>
```

- [ ] **Step 3: src/app/login/layout.tsx 생성**

인증된 유저가 /login에 접근하면 /interviews로 리다이렉트:

```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function LoginLayout({ children }) {
  const session = await auth();
  if (session?.user) redirect('/interviews');
  return <>{children}</>;
}
```

- [ ] **Step 4: 개발 서버에서 로그인 페이지 확인**

Run: `pnpm dev`

- `/login` 접근 → 로그인 페이지 표시
- `/interviews` 접근 → `/login`으로 리다이렉트

- [ ] **Step 5: 커밋**

```bash
git add src/middleware.ts src/app/login/
git commit -m "feat: add login page with Google, GitHub, Resend providers"
```

---

## Task 4: data-access 함수에 userId 파라미터 추가

**Files:**

- Modify: `src/data-access/jobs.ts`
- Modify: `src/data-access/categories.ts`
- Modify: `src/data-access/questions.ts`
- Modify: `src/data-access/followups.ts`
- Modify: `src/data-access/import.ts`
- Modify: `src/data-access/cleanup.ts`

- [ ] **Step 1: jobs.ts — 모든 함수에 userId 첫 파라미터 추가**

변경 패턴:

```typescript
// Before
export async function getAllJobs(): Promise<JobDescription[]> {
  // ... eq(jobDescriptions.userId, DEFAULT_USER_ID) ...

// After
export async function getAllJobs(userId: string): Promise<JobDescription[]> {
  // ... eq(jobDescriptions.userId, userId) ...
```

모든 함수 목록:

- `getAllJobs(userId)` — WHERE userId 필터
- `getJobById(userId, id)` — WHERE userId AND id
- `createJob(userId, input)` — INSERT에 userId
- `updateJob(userId, input)` — WHERE userId AND id
- `updateJobStatus(userId, id, status)` — WHERE userId AND id
- `softDeleteJob(userId, id)` — WHERE userId AND id
- `restoreJob(userId, id)` — WHERE userId AND id
- `softDeleteJobWithQuestions(userId, id)` — 트랜잭션 내 WHERE userId
- `restoreJobWithQuestions(userId, id)` — 트랜잭션 내 WHERE userId
- `getDeletedJobs(userId)` — WHERE userId 필터

`DEFAULT_USER_ID` import를 제거.

- [ ] **Step 2: categories.ts — 동일 패턴**

- `getGlobalCategories(userId)` → `getLibraryCategories(userId)` (이름 변경: 더 이상 "글로벌"이 아님)
- `getCategoriesByJdId(userId, jdId)`
- `createCategory(userId, input)`
- `updateCategory(userId, id, input)`
- `softDeleteCategory(userId, id)`
- `restoreCategory(userId, id)`

- [ ] **Step 3: questions.ts — 동일 패턴**

- `getLibraryQuestions(userId)`
- `getQuestionsByJdId(userId, jdId)`
- `getQuestionsByCategory(userId, categoryId)`
- `createQuestion(userId, input)`
- `updateQuestion(userId, input)`
- `updateQuestionKeywords(userId, id, keywords)`
- `softDeleteQuestion(userId, id)`
- `restoreQuestion(userId, id)`
- `getDeletedQuestions(userId, jdId?)`

- [ ] **Step 4: followups.ts — 동일 패턴**

- `getFollowupsByQuestionId(userId, questionId)` — userId는 소유권 확인용
- `createFollowup(userId, input)`
- `updateFollowup(userId, input)`
- `softDeleteFollowup(userId, id)`
- `restoreFollowup(userId, id)`

- [ ] **Step 5: import.ts — userId 추가**

- `importQuestionsToJob(userId, params)` — 복제 시 새 질문/followup에 userId 설정

- [ ] **Step 6: cleanup.ts — 함수 분리**

두 가지 함수로 분리:

- `purgeAllExpiredItems(retentionDays?)` — 모든 유저의 만료 데이터 정리 (서버 관리용, instrumentation.ts에서 호출)
- `purgeExpiredItemsForUser(userId, retentionDays?)` — 특정 유저의 만료 데이터만 정리

`src/instrumentation.ts`에서 `purgeExpiredItems()` → `purgeAllExpiredItems()`로 변경.

- [ ] **Step 6.5: 쓰기 함수의 IDOR 방어**

UPDATE/DELETE 쿼리에서 반드시 userId 조건 포함. 예:

```typescript
// 안전: userId + id 모두 WHERE 조건
await getDb()
  .update(jobDescriptions)
  .set(updates)
  .where(and(eq(jobDescriptions.id, input.id), eq(jobDescriptions.userId, userId)));

// 위험: id만으로 조회 (다른 유저의 데이터 수정 가능)
await getDb().update(jobDescriptions).set(updates).where(eq(jobDescriptions.id, input.id));
```

모든 updateJob, softDeleteJob, restoreJob 등 쓰기 함수에서 WHERE 조건에 `userId` 포함 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/data-access/
git commit -m "refactor: add userId parameter to all data-access functions"
```

---

## Task 5: Server Actions 세션 연동

**Files:**

- Modify: `src/actions/job-actions.ts`
- Modify: `src/actions/category-actions.ts`
- Modify: `src/actions/question-actions.ts`
- Modify: `src/actions/followup-actions.ts`
- Modify: `src/actions/import-actions.ts`

- [ ] **Step 1: 모든 Server Action에서 세션 userId 추출**

패턴:

```typescript
import { getCurrentUserId } from '@/lib/auth';

export async function createJobAction(input: CreateJobInput) {
  const userId = await getCurrentUserId();
  return createJob(userId, input);
}
```

모든 action 파일에 이 패턴 적용. `getCurrentUserId()`는 세션이 없으면 `/login`으로 리다이렉트.

- [ ] **Step 2: 커밋**

```bash
git add src/actions/
git commit -m "refactor: inject userId from session into all Server Actions"
```

---

## Task 6: Server Components 세션 연동

**Files:**

- Modify: `src/app/interviews/page.tsx`
- Modify: `src/app/interviews/questions/page.tsx`
- Modify: `src/app/interviews/jobs/[id]/page.tsx`
- Modify: `src/app/interviews/jobs/[id]/edit/page.tsx`
- Modify: `src/app/interviews/jobs/new/page.tsx`
- Modify: `src/app/interviews/trash/page.tsx`
- Modify: `src/app/study/page.tsx`

- [ ] **Step 1: 모든 Server Component에서 userId 전달**

패턴:

```typescript
import { getCurrentUserId } from '@/lib/auth';

export default async function InterviewsPage() {
  const userId = await getCurrentUserId();
  const jobs = await getAllJobs(userId);
  return <JobList jobs={jobs} />;
}
```

모든 page.tsx에 이 패턴 적용.

- [ ] **Step 2: 커밋**

```bash
git add src/app/
git commit -m "refactor: inject userId from session into all Server Components"
```

---

## Task 7: UserMenu 컴포넌트 + 레이아웃 업데이트

**Files:**

- Create: `src/components/shared/user-menu.tsx`
- Modify: `src/app/interviews/layout.tsx`

- [ ] **Step 1: src/components/shared/user-menu.tsx 생성**

유저 아바타 + 드롭다운:

- 유저 이미지/이름 표시
- "로그아웃" 버튼 (signOut 호출)

**Client Component 방식 채택** — 현재 `interviews/layout.tsx`가 `'use client'`이므로 `useSession` 훅을 사용하는 Client Component로 구현.

```typescript
'use client';
import { useSession, signOut } from 'next-auth/react';
// shadcn/ui DropdownMenu, Avatar 사용
```

이를 위해 `SessionProvider`를 root layout 또는 interviews layout에 추가해야 함.

- [ ] **Step 2: interviews/layout.tsx에 UserMenu 추가**

헤더 영역에 UserMenu 배치.

- [ ] **Step 3: 커밋**

```bash
git add src/components/shared/user-menu.tsx src/app/interviews/layout.tsx
git commit -m "feat: add UserMenu component with logout"
```

---

## Task 8: 시스템 템플릿 data-access (신규)

**Files:**

- Create: `src/data-access/templates.ts`
- Modify: `src/data-access/index.ts`

- [ ] **Step 1: src/data-access/templates.ts 생성**

시스템 템플릿(user_id = 'system') 조회 및 유저 라이브러리로 import:

```typescript
import { SYSTEM_USER_ID } from '@/db/constants';

// 시스템 카테고리 조회 (읽기 전용)
export async function getSystemCategories(): Promise<InterviewCategory[]>;

// 시스템 질문 조회 (읽기 전용)
export async function getSystemQuestions(): Promise<InterviewQuestion[]>;

// 시스템 카테고리별 질문 조회
export async function getSystemQuestionsByCategory(
  categoryId: number
): Promise<InterviewQuestion[]>;

// 시스템 템플릿 → 유저 라이브러리로 복제
export async function importSystemToLibrary(
  userId: string,
  params: {
    categoryIds?: number[];
    questionIds?: number[];
  }
): Promise<{ importedCategories: number; importedQuestions: number }>;
```

- [ ] **Step 2: index.ts에 re-export 추가**

```typescript
export * from './templates';
```

- [ ] **Step 3: 커밋**

```bash
git add src/data-access/templates.ts src/data-access/index.ts
git commit -m "feat: add system template data-access functions"
```

---

## Task 9: 테스트 업데이트

**Files:**

- Modify: `src/test/helpers/db.ts`
- Modify: `src/data-access/*.test.ts`
- Modify: `src/actions/*.test.ts`

- [ ] **Step 1: 테스트 헬퍼에서 userId 사용 패턴 정리**

테스트에서는 `DEFAULT_USER_ID`를 유지하되, data-access 함수 호출 시 명시적으로 전달:

```typescript
import { DEFAULT_USER_ID } from '@/db/constants';

// Before
const jobs = await getAllJobs();

// After
const jobs = await getAllJobs(DEFAULT_USER_ID);
```

- [ ] **Step 2: data-access 테스트 업데이트**

모든 data-access 테스트 파일에서 함수 호출에 `DEFAULT_USER_ID` 추가.

- [ ] **Step 3: 유저 격리 테스트 추가 (스펙 6.4)**

다른 유저의 데이터에 접근할 수 없음을 검증하는 테스트:

```typescript
it('다른 유저의 JD를 조회할 수 없다', async () => {
  await createJob('user-a', { companyName: 'A사', positionTitle: '개발자' });
  const jobs = await getAllJobs('user-b');
  expect(jobs).toHaveLength(0);
});

it('다른 유저의 JD를 수정할 수 없다', async () => {
  const id = await createJob('user-a', { ... });
  await updateJob('user-b', { id, companyName: '변경' });
  const job = await getJobById('user-a', id);
  expect(job?.companyName).not.toBe('변경'); // 변경 안 됨
});
```

주요 data-access 파일에 대해 격리 테스트 추가.

- [ ] **Step 4: Server Action 테스트 업데이트**

Server Action 테스트에서는 `getCurrentUserId`를 모킹:

```typescript
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('local-user'),
}));
```

- [ ] **Step 4: 테스트 실행**

```bash
pnpm test
```

모든 테스트 통과 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/test/ src/**/*.test.ts src/**/*.test.tsx
git commit -m "refactor: update tests for userId parameter"
```

---

## Task 10: 시드 스크립트 + CLAUDE.md 업데이트

**Files:**

- Modify: `src/db/seed.ts` (시스템 템플릿 시드 추가)
- Modify: `CLAUDE.md`

- [ ] **Step 1: seed.ts에 시스템 템플릿 시드 추가**

기존 시드 데이터를 `DEFAULT_USER_ID` 대신 `SYSTEM_USER_ID`로도 시드하여 시스템 템플릿 생성. 또는 별도 시스템 템플릿 시드 데이터를 정의.

현재 seed.sample.ts의 6개 카테고리 + 9개 질문을 시스템 템플릿으로도 시드하면 유저가 가입 후 바로 import할 수 있음.

- [ ] **Step 2: CLAUDE.md 업데이트**

인증 관련 내용 추가:

- 기술 스택에 Auth.js v5 추가
- 인증 플로우 설명
- 환경변수 목록

- [ ] **Step 3: 커밋**

```bash
git add src/db/seed.ts CLAUDE.md
git commit -m "feat: add system template seeding and update CLAUDE.md for auth"
```

---

## Task 11: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 타입 검사**

Run: `pnpm tsc --noEmit`

- [ ] **Step 2: ESLint**

Run: `pnpm lint`

- [ ] **Step 3: 테스트**

Run: `pnpm test`

- [ ] **Step 4: 빌드**

Run: `pnpm build`

- [ ] **Step 5: 수동 테스트 (로컬)**

1. `pnpm dev` 실행
2. `/interviews` 접근 → `/login` 리다이렉트 확인
3. Google/GitHub 로그인 → `/interviews` 도착 확인
4. 데이터 CRUD 동작 확인 (로그인한 유저의 데이터만 보이는지)
5. 로그아웃 → `/login` 리다이렉트 확인

- [ ] **Step 6: 커밋 (수정 있으면)**

```bash
git add -A
git commit -m "fix: resolve issues found during final verification"
```
