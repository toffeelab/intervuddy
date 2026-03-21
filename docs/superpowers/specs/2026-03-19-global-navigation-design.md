# 글로벌 네비게이션 & 앱 레이아웃 설계

## 1. 개요

### 문제

- 각 페이지마다 헤더가 제각각 (study는 InterviewHeader, interviews는 자체 헤더)
- /study에서 /interviews로 이동하는 경로 없음
- 랜딩 페이지(/)에서도 네비게이션 없이 "시작하기" 버튼만 존재
- 메뉴 8개 이상 확장을 고려한 구조 필요

### 목표

- 모든 주요 페이지 간 이동이 가능한 통합 네비게이션
- 8개 이상 메뉴를 그루핑으로 수용하는 확장 가능한 구조
- 모바일/데스크톱 각각 최적화된 네비게이션 패턴
- 기존 페이지별 내부 사이드바와 충돌 없는 구조

### 향후 확장 방향

앱은 개인 이력서/포트폴리오 관리 → JD 기반 추천 면접질문 생성 → 모의면접 방향으로 확장 예정. 메뉴 그룹: 준비(이력서, 채용공고, 질문 생성), 학습(Q&A, 모의면접, 대시보드), 관리(기업 리서치, 일정 관리) + 설정.

## 2. 레이아웃 아키텍처

### Route Group 분리

```
src/app/layout.tsx          — 루트 (ThemeProvider, 폰트만)
  ├─ /                      — 랜딩 페이지 (글로벌 네비 없음, 자체 헤더)
  └─ (app)/layout.tsx       — 앱 셸 (AppSidebar + BottomTabBar)
       ├─ /study            — Q&A 학습
       ├─ /interviews       — 면접 관리
       ├─ /resume           — 이력서/포폴 (향후)
       ├─ /mock-interview   — 모의면접 (향후)
       ├─ /dashboard        — 대시보드 (향후)
       └─ /settings         — 설정 (향후)
```

- 랜딩 페이지(/)는 공개 서비스용 마케팅 페이지로, 앱 내부 네비게이션과 분리
- `(app)` Route Group으로 앱 내부 페이지만 글로벌 네비게이션 적용

### 루트 레이아웃 (변경 없음)

`src/app/layout.tsx`는 현재처럼 ThemeProvider, 폰트, 메타데이터만 담당. 네비게이션 로직은 `(app)/layout.tsx`에 위임.

## 3. 데스크톱 네비게이션: Collapsible Sidebar

### 구조

- 왼쪽 고정 사이드바, 접기/펼치기 토글 지원
- 펼친 상태: ~240px (아이콘 + 텍스트)
- 접힌 상태: ~60px (아이콘 + 호버 툴팁)
- 접힘 상태는 Zustand + localStorage로 유지

### 사이드바 구성

```
┌─────────────────────────┐
│ [로고 아이콘] Intervuddy  ◀ │  ← 펼치기/접기 토글
├─────────────────────────┤
│ 준비                      │  ← 그룹 헤더
│  ○ 이력서/포폴  (FileUser) │
│  ○ 채용공고 관리 (Briefcase)│
│  ○ 질문 생성   (Sparkles) │
│                           │
│ 학습                      │
│  ● Q&A 학습   (BookOpen)  │  ← 활성 상태
│  ○ 모의면접    (Mic)      │
│  ○ 대시보드    (BarChart3) │
│                           │
│ 관리                      │
│  ○ 기업 리서치 (Building2) │
│  ○ 일정 관리   (Calendar) │
├─────────────────────────┤
│  ○ 설정       (Settings)  │  ← 하단 고정
└─────────────────────────┘
```

### 접힌 상태 동작

- 아이콘만 표시, 그룹 헤더는 구분선(divider)으로 대체
- **호버 시 툴팁**: 메뉴 이름이 아이콘 옆에 표시 (shadcn Tooltip 사용)
- 로고: InterVuddy 기반 로고 아이콘(약어 또는 심볼)으로 표시
- 펼치기 버튼: `▶` 아이콘, 접힌 상태에서 로고 아래 배치

### 아이콘 (Lucide)

| 메뉴          | 아이콘      | 비고             |
| ------------- | ----------- | ---------------- |
| 이력서/포폴   | `FileUser`  | 사람+문서 직관적 |
| 채용공고 관리 | `Briefcase` | 직장/채용 표준   |
| 질문 생성     | `Sparkles`  | AI/생성 의미     |
| Q&A 학습      | `BookOpen`  | 학습 표준        |
| 모의면접      | `Mic`       | 면접/발화        |
| 대시보드      | `BarChart3` | 통계/차트        |
| 기업 리서치   | `Building2` | 기업/회사        |
| 일정 관리     | `Calendar`  | 일정 표준        |
| 설정          | `Settings`  | 설정 표준        |

### 활성 상태 스타일링

- 활성 메뉴: `bg-iv-accent/10 text-iv-accent font-medium`
- 호버: `bg-iv-bg2`
- 비활성: `text-iv-text2`
- 활성 판별: `usePathname()` 기반, 해당 경로의 startsWith 매칭

## 4. 모바일 네비게이션: Bottom Tab Bar + Drawer

### 하단 탭 바 (md: 768px 미만에서 표시)

- 고정 하단, 5개 탭: 핵심 기능 4개 + "더보기"
- 데스크톱에서는 숨김 (`md:hidden`, 사이드바가 대체)

```
┌─────┬─────┬─────┬─────┬─────┐
│📝   │📖   │📋   │🎤   │ ☰   │
│이력서│학습  │관리  │면접  │더보기│
└─────┴─────┴─────┴─────┴─────┘
```

### 탭 바 매핑

| 탭     | 아이콘      | 경로            | 비고        |
| ------ | ----------- | --------------- | ----------- |
| 이력서 | `FileUser`  | /resume         | 향후        |
| 학습   | `BookOpen`  | /study          | 현재 주력   |
| 관리   | `Briefcase` | /interviews     | 현재 기능   |
| 면접   | `Mic`       | /mock-interview | 향후        |
| 더보기 | `Menu`      | -               | 드로어 열기 |

### "더보기" 드로어

- shadcn Drawer 컴포넌트 사용 (하단에서 슬라이드 업)
- 전체 메뉴를 그룹별 2열 그리드로 표시
- 현재 활성 메뉴 하이라이트
- 오버레이 클릭 또는 스와이프 다운으로 닫기

### 모바일 헤더

- 상단 고정: 로고 아이콘 + 페이지 제목 + 액션 버튼 (검색, 필터 등)
- 사이드바 대신 이 헤더가 현재 위치를 표시

## 5. PageHeader 통합 컴포넌트

기존 InterviewHeader와 interviews/layout.tsx의 인라인 헤더를 통합하는 범용 컴포넌트.

### Props

```typescript
interface PageHeaderProps {
  title: string;
  badges?: { label: string; variant?: 'default' | 'accent' | 'muted' }[];
  actions?: React.ReactNode; // 우측 액션 버튼 영역
  children?: React.ReactNode; // 추가 콘텐츠 (검색바 등)
}
```

### 동작

- 데스크톱: 메인 콘텐츠 영역 상단에 고정 (sticky)
- 모바일: 모바일 헤더에 통합 (로고 + 제목)
- 배지, 액션 버튼은 선택적 표시

## 6. 컴포넌트 파일 구조

### 새로 생성

```
src/components/nav/
  ├─ app-sidebar.tsx         — 데스크톱 사이드바 (Client Component)
  ├─ sidebar-nav-item.tsx    — 메뉴 아이템 (아이콘, 라벨, 활성 상태, 툴팁)
  ├─ sidebar-nav-group.tsx   — 그룹 헤더 (라벨 or 구분선)
  ├─ sidebar-toggle.tsx      — 접기/펼치기 토글 버튼
  ├─ bottom-tab-bar.tsx      — 모바일 하단 탭 (Client Component)
  ├─ mobile-menu-drawer.tsx  — 모바일 "더보기" 드로어
  ├─ mobile-header.tsx       — 모바일 상단 헤더
  ├─ page-header.tsx         — 범용 페이지 헤더
  └─ nav-config.ts           — 메뉴 정의 (라벨, 아이콘, 경로, 그룹)

src/app/(app)/layout.tsx     — 앱 셸 레이아웃

src/stores/sidebar-store.ts  — 사이드바 접힘 상태 (Zustand + localStorage)
```

### nav-config.ts 구조

```typescript
import {
  type LucideIcon,
  FileUser,
  Briefcase,
  Sparkles,
  BookOpen,
  Mic,
  BarChart3,
  Building2,
  Calendar,
  Settings,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: 'prepare' | 'study' | 'manage';
  disabled?: boolean; // 향후 기능은 disabled로 표시
}

interface NavGroup {
  key: string;
  label: string;
}

export const navGroups: NavGroup[] = [
  { key: 'prepare', label: '준비' },
  { key: 'study', label: '학습' },
  { key: 'manage', label: '관리' },
];

export const navItems: NavItem[] = [
  { label: '이력서/포폴', href: '/resume', icon: FileUser, group: 'prepare', disabled: true },
  { label: '채용공고 관리', href: '/interviews', icon: Briefcase, group: 'prepare' },
  { label: '질문 생성', href: '/generate', icon: Sparkles, group: 'prepare', disabled: true },
  { label: 'Q&A 학습', href: '/study', icon: BookOpen, group: 'study' },
  { label: '모의면접', href: '/mock-interview', icon: Mic, group: 'study', disabled: true },
  { label: '대시보드', href: '/dashboard', icon: BarChart3, group: 'study', disabled: true },
  { label: '기업 리서치', href: '/companies', icon: Building2, group: 'manage', disabled: true },
  { label: '일정 관리', href: '/schedule', icon: Calendar, group: 'manage', disabled: true },
];

export const bottomTabItems: NavItem[] = [
  navItems.find((i) => i.href === '/resume')!,
  navItems.find((i) => i.href === '/study')!,
  navItems.find((i) => i.href === '/interviews')!,
  navItems.find((i) => i.href === '/mock-interview')!,
];

export const settingsItem: NavItem = {
  label: '설정',
  href: '/settings',
  icon: Settings,
  group: 'manage',
  disabled: true,
};
```

## 7. 기존 코드 통합 전략

### 유지

- `src/components/study/sidebar.tsx` — study 내부 카테고리 사이드바, 메인 콘텐츠 영역 안에서 동작
- `src/components/interviews/sidebar-nav.tsx` — interviews 내부 서브 네비, 데스크톱에서만 표시
- `src/components/shared/theme-toggle.tsx` — 사이드바 하단 설정 영역으로 이동

### 변경

- `src/components/study/interview-header.tsx` → PageHeader로 교체. 통계 배지와 "전체 펼치기" 기능은 PageHeader의 badges/actions props로 전달
- `src/app/interviews/layout.tsx` — 인라인 헤더(뒤로가기+제목) 제거, 앱 셸 사이드바가 네비게이션 역할 대체. 내부 SidebarNav + children 구조만 유지
- `src/app/study/page.tsx` — 최상위 grid에서 InterviewHeader 제거, 글로벌 사이드바 제외한 내부 레이아웃만 유지

### 제거

- `src/app/interviews/layout.tsx`의 인라인 헤더 (Link + ArrowLeft + 제목)
- `src/app/study/page.tsx`에서의 InterviewHeader 직접 렌더링

### 파일 이동 (기존 페이지)

- `src/app/study/` → `src/app/(app)/study/`
- `src/app/interviews/` → `src/app/(app)/interviews/`
- `src/app/page.tsx` (랜딩) → 그대로 유지 (`(app)` 밖)

## 8. 반응형 브레이크포인트 전략

| 뷰포트                | 사이드바                 | 하단 탭 | 모바일 헤더 | PageHeader                |
| --------------------- | ------------------------ | ------- | ----------- | ------------------------- |
| < 768px (모바일)      | 숨김                     | 표시    | 표시        | 숨김 (모바일 헤더에 통합) |
| 768px~1023px (태블릿) | 접힌 상태 (60px)         | 숨김    | 숨김        | 표시                      |
| ≥ 1024px (데스크톱)   | 사용자 선택 (60px/240px) | 숨김    | 숨김        | 표시                      |

## 9. 상태 관리

### sidebar-store.ts

```typescript
interface SidebarState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}
```

- localStorage key: `iv-sidebar-collapsed`
- 태블릿(md)에서는 강제 접힘, 데스크톱(lg)에서만 사용자 선택 반영
- 모바일에서는 사이드바 자체가 렌더링되지 않음

## 10. 범위 밖 (이번 구현에서 제외)

- 로그인/인증 시스템 (향후 별도 설계)
- 알림 시스템
- 사용자 프로필 아바타
- 향후 메뉴의 실제 페이지 구현 (disabled 상태로만 표시)
- 로고 아이콘 디자인 (별도 작업, 임시 로고 사용)
