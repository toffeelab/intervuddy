# Intervuddy - 테마 토글 / Q&A CRUD / JD 관리 설계 스펙

> 작성일: 2026-03-17
> 상태: Draft

---

## 1. 개요

Intervuddy에 다음 4가지 기능을 추가한다:

1. **테마 모드 토글** — dark / light / system 전환
2. **Q&A CRUD** — 질문/답변의 생성, 수정, 삭제, 복구
3. **JD(채용 공고) 관리** — JD를 독립 엔티티로 관리, 카테고리/질문 소속
4. **JD 상태 관리 + 소프트 삭제** — 진행중/완료/보관 상태, 휴지통 복구

---

## 2. 설계 결정 요약

| 결정 사항             | 선택                                               | 근거                                |
| --------------------- | -------------------------------------------------- | ----------------------------------- |
| JD 모델               | 특정 채용 공고를 독립 엔티티로 관리                | 회사명, 포지션 등 메타데이터 포함   |
| 카테고리 구조         | 공통 카테고리 풀 공유 + JD별 커스텀 추가           | 유연성과 재사용성 균형              |
| 라이브러리 ↔ JD 관계  | 복사(copy) 방식                                    | 면접 답변은 회사별로 커스텀해야 함  |
| CRUD UI 위치          | `/interviews/*` 관리 페이지 + `/study` 인라인 편집 | 읽기/편집 경험 분리                 |
| 인라인 편집 범위      | 루트 질문/답변/팁, 꼬리질문/답변 텍스트만          | 구조적 변경은 드로어에서            |
| 라이트 모드 톤        | 클린 화이트 (A)                                    | 가독성, 범용성                      |
| 휴지통                | 소속 기반 (각 컨텍스트 내 토글)                    | 삭제 위치에서 복구가 자연스러움     |
| 소프트 삭제 보관 기간 | 30일 기본, 파라미터화                              | 향후 요금제별 차별화 가능           |
| DB 접근법             | 스키마 리디자인 (v2)                               | 프로젝트 초기, 프로덕션 데이터 없음 |
| 테마 토글 위치        | 헤더 우측 상단 아이콘                              | 접근성, 일반적 패턴                 |

### 향후 확장 고려 사항 (이번 스펙 범위 밖)

- Prisma ORM + RDB 전환: data-access 추상화 레이어로 대비
- NextAuth: data-access 함수에 userId 파라미터 추가만으로 전환 가능
- Intl: 하드코딩 문자열을 상수 파일에 집중
- Monorepo: `@/` 경로 + 타입 분리 패턴 유지
- 커스텀 테마: CSS 변수 토큰 네이밍 안정적 유지

---

## 3. 데이터 모델 (DB 스키마 v2)

### 3.1 네이밍 원칙

| 기존                   | 변경                              | 근거                       |
| ---------------------- | --------------------------------- | -------------------------- |
| `jds`                  | `job_descriptions`                | 약어 → 도메인 전체 용어    |
| `categories`           | `interview_categories`            | 도메인 명시                |
| `qa_items`             | `interview_questions`             | 핵심 엔티티 명확화         |
| `qa_keywords`          | `question_keywords`               | 소속 엔티티 명확화         |
| `deep_qa`              | `followup_questions`              | 꼬리질문 도메인 용어       |
| `tag` / `tag_label`    | `slug` / `display_label`          | 역할 명확화                |
| `company` / `position` | `company_name` / `position_title` | 구체적 필드명              |
| `source_id`            | `origin_question_id`              | 복사 원본 추적 의미 명확화 |

### 3.2 제거되는 레거시 필드

- `is_jd` → `jd_id IS NOT NULL`로 대체
- `is_deep` → `followup_questions` 존재 여부로 대체
- `is_jd_group` → `interview_categories.jd_id IS NOT NULL`로 대체
- `jd_tip` → `tip`으로 통합

### 3.3 DDL

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 1. job_descriptions: 채용 공고
CREATE TABLE IF NOT EXISTS job_descriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name    TEXT    NOT NULL,
    position_title  TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'archived')),
    memo            TEXT,
    deleted_at      TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_status
    ON job_descriptions (status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_descriptions_deleted_at
    ON job_descriptions (deleted_at)
    WHERE deleted_at IS NOT NULL;

-- 2. interview_categories: 면접 질문 카테고리
CREATE TABLE IF NOT EXISTS interview_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    jd_id           INTEGER REFERENCES job_descriptions (id)
                    ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    slug            TEXT    NOT NULL,
    display_label   TEXT    NOT NULL,
    icon            TEXT    NOT NULL,
    display_order   INTEGER NOT NULL DEFAULT 0,
    deleted_at      TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (jd_id, name)
);

CREATE INDEX IF NOT EXISTS idx_interview_categories_jd_id
    ON interview_categories (jd_id)
    WHERE deleted_at IS NULL;

-- 공통 카테고리(jd_id IS NULL) 간 slug 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_categories_global_slug
    ON interview_categories (slug)
    WHERE jd_id IS NULL AND deleted_at IS NULL;

-- 공통 카테고리(jd_id IS NULL) 간 name 중복 방지
-- SQLite에서 UNIQUE(jd_id, name)은 NULL != NULL이므로 별도 partial index 필요
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_categories_global_name
    ON interview_categories (name)
    WHERE jd_id IS NULL AND deleted_at IS NULL;

-- 3. interview_questions: 면접 질문 & 답변
CREATE TABLE IF NOT EXISTS interview_questions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id         INTEGER NOT NULL REFERENCES interview_categories (id)
                        ON DELETE CASCADE,
    jd_id               INTEGER REFERENCES job_descriptions (id)
                        ON DELETE CASCADE,
    origin_question_id  INTEGER REFERENCES interview_questions (id)
                        ON DELETE SET NULL,
    question            TEXT    NOT NULL,
    answer              TEXT    NOT NULL DEFAULT '',
    tip                 TEXT,
    display_order       INTEGER NOT NULL DEFAULT 0,
    deleted_at          TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 무결성 규칙: interview_questions.jd_id와 category_id가 참조하는
-- interview_categories.jd_id는 일치해야 함 (공통 카테고리 jd_id=NULL은 예외적으로 허용)
-- SQLite CHECK 제약으로는 서브쿼리를 쓸 수 없으므로 data-access 레이어에서 검증
-- 예: 질문 생성/수정 시 category의 jd_id가 질문의 jd_id와 일치하거나 NULL인지 확인

CREATE INDEX IF NOT EXISTS idx_interview_questions_category_order
    ON interview_questions (category_id, display_order)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interview_questions_jd_id
    ON interview_questions (jd_id, category_id, display_order)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interview_questions_deleted_at
    ON interview_questions (deleted_at)
    WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_questions_origin
    ON interview_questions (origin_question_id)
    WHERE origin_question_id IS NOT NULL;

-- 4. followup_questions: 꼬리질문
CREATE TABLE IF NOT EXISTS followup_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     INTEGER NOT NULL REFERENCES interview_questions (id)
                    ON DELETE CASCADE,
    question        TEXT    NOT NULL,
    answer          TEXT    NOT NULL DEFAULT '',
    display_order   INTEGER NOT NULL DEFAULT 0,
    deleted_at      TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_followup_questions_parent_order
    ON followup_questions (question_id, display_order)
    WHERE deleted_at IS NULL;

-- 5. question_keywords: 질문 키워드/태그
CREATE TABLE IF NOT EXISTS question_keywords (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     INTEGER NOT NULL REFERENCES interview_questions (id)
                    ON DELETE CASCADE,
    keyword         TEXT    NOT NULL,
    UNIQUE (question_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_question_keywords_keyword
    ON question_keywords (keyword);
```

### 3.4 updated_at 자동 갱신 트리거

```sql
CREATE TRIGGER IF NOT EXISTS trg_job_descriptions_updated_at
    AFTER UPDATE ON job_descriptions
    FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE job_descriptions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_interview_questions_updated_at
    AFTER UPDATE ON interview_questions
    FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE interview_questions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_followup_questions_updated_at
    AFTER UPDATE ON followup_questions
    FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE followup_questions SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

### 3.5 소프트 삭제 정리 (앱 레벨)

앱 초기화 시(서버 시작) 1회 실행. 향후 서버 환경에서는 cron/스케줄러로 전환 가능.

```sql
-- :retention_days 파라미터화 (기본 30, 향후 요금제별 차별화)
DELETE FROM interview_questions
WHERE deleted_at IS NOT NULL
  AND deleted_at < datetime('now', '-' || :retention_days || ' days');

DELETE FROM followup_questions
WHERE deleted_at IS NOT NULL
  AND deleted_at < datetime('now', '-' || :retention_days || ' days');

DELETE FROM interview_categories
WHERE deleted_at IS NOT NULL
  AND deleted_at < datetime('now', '-' || :retention_days || ' days');

DELETE FROM job_descriptions
WHERE deleted_at IS NOT NULL
  AND deleted_at < datetime('now', '-' || :retention_days || ' days');
```

---

## 4. 라우팅 / 페이지 구조

### 4.1 라우트 맵

```
/                                  → 랜딩 페이지 (기존 유지)
/study                             → 학습 뷰 (인라인 편집 포함)

/interviews                        → JD 목록 대시보드
/interviews/questions              → 공통 질문 라이브러리
/interviews/jobs/new               → JD 신규 생성
/interviews/jobs/[id]              → JD 상세 (메타 + 질문 리스트)
/interviews/jobs/[id]/edit         → JD 메타정보 수정
```

### 4.2 각 페이지 역할

**`/interviews` (JD 대시보드)**

- JD 카드 목록 (회사명, 포지션, 상태 뱃지, 질문 수)
- 상태별 필터 (진행중 / 완료 / 보관)
- "삭제된 JD 보기" 토글 → 소프트 삭제된 JD 표시 + 복구 버튼
- "새 JD 만들기" 버튼

**`/interviews/questions` (공통 라이브러리)**

- 카테고리별 질문 리스트
- 질문 CRUD (추가/수정/삭제)
- "삭제된 질문 보기" 토글
- 카테고리 관리 (추가/수정/삭제)

**`/interviews/jobs/new` (JD 생성)**

- 메타정보 입력 (회사명, 포지션, 메모)
- "질문 가져오기" 스텝 (선택사항, 건너뛰기 가능)
  - 카테고리 필터 + 검색
  - 개별 질문 체크박스 선택
  - "카테고리 전체 가져오기" 버튼

**`/interviews/jobs/[id]` (JD 상세)**

- 상단: JD 메타정보 (회사명, 포지션, 상태, 메모)
- 본문: 카테고리별 질문 리스트
- "질문 가져오기" 버튼 → 라이브러리 모달 (이미 가져온 질문은 뱃지 표시)
- "커스텀 카테고리 추가" 버튼
- "삭제된 질문 보기" 토글
- 개별 질문 편집은 드로어

**`/study` (학습 뷰)**

- 기존 읽기 뷰 유지
- JD 선택 드롭다운 추가 (공통 라이브러리 / 각 JD)
- 간편 편집:
  - 루트 질문/답변/팁 인라인 수정
  - 개별 꼬리질문/답변 인라인 수정
- 간편 추가:
  - 카테고리 내 "+ 질문 추가" (질문 + 답변만)
  - QA 카드 내 "+ 꼬리질문 추가" (꼬리질문 + 답변만)

### 4.3 레이아웃 구조

**`/study` 레이아웃** — 독립 레이아웃 (기존 interview 레이아웃 계승)

```
┌─────────────────────────────────────────────┐
│ 헤더              [JD선택] [테마토글]         │
├──────────────┬──────────────────────────────┤
│ 카테고리      │                              │
│ 사이드바      │       Q&A 카드 리스트         │
│ (기존 유지)   │       (인라인 편집 포함)       │
│              │                              │
└──────────────┴──────────────────────────────┘
```

**`/interviews/*` 레이아웃** — 관리 전용 레이아웃 (별도)

```
┌─────────────────────────────────────────────┐
│ 헤더                    [테마토글] [사용자]   │
├──────────────┬──────────────────────────────┤
│ 사이드 네비   │                              │
│              │                              │
│ JD 목록      │        메인 콘텐츠            │
│ 공통 라이브러리│                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

두 레이아웃은 독립적이며, 공통 헤더 컴포넌트(테마 토글 포함)만 공유한다.
`/study`는 학습에 최적화된 카드 뷰, `/interviews/*`는 관리에 최적화된 리스트/테이블 뷰.

### 4.4 향후 확장 대비

```
현재:    /study, /interviews/*
Intl:    /[locale]/study, /[locale]/interviews/*
회사:    /interviews/companies, /interviews/companies/[id]
         (jobs는 기존 경로 유지, FK로 연결)
```

---

## 5. 컴포넌트 구조

### 5.1 디렉토리

```
src/components/
├── ui/                            # shadcn/ui (기존 + 신규)
│   ├── dialog.tsx                 # 가져오기 모달
│   ├── drawer.tsx                 # 전체 편집 드로어
│   ├── dropdown-menu.tsx          # 테마 선택, 상태 변경
│   ├── select.tsx                 # JD 선택 등
│   ├── textarea.tsx               # 답변 편집
│   ├── tabs.tsx                   # 관리 페이지 탭
│   └── (기존 badge, button, card, input, scroll-area)
│
├── shared/
│   ├── logo-dot.tsx               # 기존 유지
│   ├── theme-toggle.tsx           # 테마 토글 버튼 (Sun/Moon)
│   └── inline-edit.tsx            # 인라인 편집 공통 컴포넌트
│
├── study/                         # /study (기존 interview/ 리네임)
│   ├── qa-card.tsx                # 기존 + 간편편집
│   ├── qa-list.tsx                # 기존 + JD 필터
│   ├── sidebar.tsx                # 기존 + JD 선택 드롭다운
│   ├── followup-item.tsx          # 꼬리질문 개별 항목 (간편편집)
│   ├── quick-add-form.tsx         # 질문/꼬리질문 빠른 추가
│   └── (나머지 기존 컴포넌트)
│
├── interviews/                    # /interviews/* 관리 페이지
│   ├── job-card.tsx               # JD 카드 (목록용)
│   ├── job-form.tsx               # JD 생성/수정 폼
│   ├── job-status-badge.tsx       # 상태 뱃지
│   ├── question-table.tsx         # 질문 리스트 (관리용)
│   ├── question-edit-drawer.tsx   # 전체 편집 드로어
│   ├── import-modal.tsx           # 라이브러리에서 질문 가져오기
│   ├── category-manager.tsx       # 카테고리 CRUD
│   └── trash-list.tsx             # 삭제 항목 + 복구
│
└── landing/                       # 기존 유지
```

### 5.2 인라인 편집 상세

**간편 편집 모드 (루트 질문)**

- 질문/답변/팁 텍스트를 클릭 → 편집 모드 전환
- 편집 완료: blur 또는 Ctrl+Enter로 저장
- 취소: Escape

**간편 편집 모드 (꼬리질문)**

- 개별 꼬리질문/답변 텍스트에 동일 패턴 적용
- 상위 질문의 편집과 독립적으로 동작

**전체 편집 (드로어)**

- 질문/답변/팁 + 키워드 태그 편집 + 꼬리질문 추가/삭제/순서변경 + 카테고리 변경

---

## 6. 상태 관리

### 6.1 아키텍처

```
DB (SQLite) ← data-access ← Server Actions ← Components
                                    ↕ revalidatePath
                              Server Components (fetch → props)
                                    ↓
                              Client Components
                                    ↕
                              Zustand (UI 상태만)
```

### 6.2 Zustand 스토어

| 스토어        | 상태                                                     | 용도                               |
| ------------- | -------------------------------------------------------- | ---------------------------------- |
| `study-store` | activeCategory, searchQuery, expandedCards, selectedJdId | 학습 뷰 UI                         |
| `theme-store` | mode (dark/light/system), resolvedTheme                  | 테마, localStorage + cookie 동기화 |
| `edit-store`  | editingItemId, drawerOpen, drawerTarget                  | 편집 UI 상태                       |

### 6.3 Server Actions

```
src/actions/
├── question-actions.ts      # create, update, softDelete, restore
├── followup-actions.ts      # create, update, softDelete, restore
├── job-actions.ts           # create, update, softDelete, restore, updateStatus
├── category-actions.ts      # create, update, softDelete
└── import-actions.ts        # importQuestionsToJob
```

### 6.4 테마 구현

1. `theme-store`에서 mode 관리 (dark / light / system)
2. `localStorage`에 저장 (새로고침 유지)
3. cookie에 동기화 (SSR 깜빡임 방지)
4. `<html>` 태그의 `class="dark"` / `class="light"` 토글
5. `globals.css`에 `:root` (light) + `.dark` 변수 정의
6. CSS 변수 토큰명(`--iv-*`) 안정 유지 → 커스텀 테마 확장 대비

### 6.5 라이트 모드 색상 (클린 화이트)

```css
:root {
  --iv-bg: #ffffff;
  --iv-bg2: #f3f4f6;
  --iv-bg3: #e5e7eb;
  --iv-border: rgba(0, 0, 0, 0.08);
  --iv-border2: rgba(0, 0, 0, 0.15);
  --iv-text: #1a1a2e;
  --iv-text2: #4b5563;
  --iv-text3: #9ca3af;
  --iv-accent: #4f8ef7;
  --iv-accent2: #7c6cf0;
  /* 태그 색상은 다크/라이트 동일하게 유지 */
}
```

---

## 7. 병렬 작업 계획

### 7.1 의존성 그래프

```
feature/theme-mode-toggle (독립)    feature/interview-schema-v2 (기반)
         │                                      │
         │                          feature/question-crud-actions
         │                                      │
         │                          ┌───────────┴──────────┐
         │                    /study 인라인 편집    /interviews/questions
         │                          └───────────┬──────────┘
         │                                      │
         │                          feature/job-description-management
         │                                      │
         │                          feature/soft-delete-and-recovery
         ↓                                      ↓
      develop에 머지                          develop에 순차 머지
```

### 7.2 브랜치 및 머지 순서

| 순서 | 브랜치                               |   병렬 가능   | 설명                        |
| :--: | ------------------------------------ | :-----------: | --------------------------- |
|  1   | `feature/theme-mode-toggle`          | A 그룹 (독립) | 테마 토글 UI + CSS 변수     |
|  2   | `feature/interview-schema-v2`        |  B 그룹 선행  | 스키마 + data-access 재구성 |
|  3   | `feature/question-crud-actions`      | B-2 (2 이후)  | Server Actions + CRUD UI    |
|  4   | `feature/job-description-management` | B-3 (3 이후)  | JD CRUD + 가져오기          |
|  5   | `feature/soft-delete-and-recovery`   | B-4 (4 이후)  | 소프트 삭제 + 휴지통 복구   |

### 7.3 병렬 실행

```
워크트리 A: [1. theme-mode-toggle ──────]
워크트리 B: [2. interview-schema-v2][3. question-crud-actions ──]
                                   [4. job-description-management ──]
                                   [5. soft-delete-and-recovery ────]
```

---

## 8. 리네이밍 계획

기존 코드의 리네이밍은 `feature/interview-schema-v2`에서 일괄 처리:

| 기존                            | 변경                        |
| ------------------------------- | --------------------------- |
| `src/app/interview/`            | `src/app/study/`            |
| `src/components/interview/`     | `src/components/study/`     |
| `src/stores/interview-store.ts` | `src/stores/study-store.ts` |
| data-access 타입/함수           | 새 스키마에 맞게 재구성     |
