# UserMenu + ThemeToggle 통합 디자인 스펙

## 배경

글로벌 네비게이션 PR (#23)에서 기존 `InterviewHeader`를 `AppSidebar` + `PageHeader`로 교체하면서, 헤더에 있던 `ThemeToggle`과 멀티유저 인증 PR (#25)에서 추가된 `UserMenu`가 레이아웃에서 누락됨.

- `ThemeToggle`: 사이드바 하단에 펼친 상태에서만 노출 (접힘/모바일에서 접근 불가)
- `UserMenu`: `user-menu.tsx` 파일은 존재하나 어디서도 렌더링되지 않음

## 목표

- ThemeToggle과 UserMenu를 업계 표준 패턴으로 통합 배치
- 데스크탑(펼침/접힘)/모바일 모든 상태에서 접근 가능하게 보장

## 디자인 결정

### 핵심 원칙: 아바타 하나로 통합

독립된 ThemeToggle 버튼을 UI에 노출하지 않고, UserMenu 드롭다운 안에 테마 선택을 통합한다. GitHub, Notion, Linear 등 최신 업계 표준을 따름.

### 드롭다운 구조

```
┌─────────────────────┐
│  사용자 이름         │  ← 프로필 섹션
│  user@email.com     │
├─────────────────────┤
│  테마                │  ← 라벨
│  [☀️ 라이트] [🌙 다크] [💻 시스템] │  ← 커스텀 segmented control (plain buttons)
├─────────────────────┤
│  🚪 로그아웃         │
└─────────────────────┘
```

### 상태별 배치

#### 데스크탑 펼침 (lg+, ≥1024px)

- **위치**: AppSidebar 하단, 설정 아이템 아래
- **표시**: 아바타 + 이름 + 이메일 카드 형태
- **동작**: 클릭 → DropdownMenu (`side="right"`, `sideOffset={8}`)

#### 데스크탑/태블릿 접힘 (md~lg, 768px~1024px)

- **위치**: AppSidebar 하단, 설정 아이콘 아래
- **표시**: 아바타 아이콘만 (32px 원형)
- **동작**: 클릭 → 동일한 DropdownMenu (`side="right"`, `align="end"`, `sideOffset={8}`)

#### 모바일 (~md, <768px)

- **위치**: MobileHeader 우측
- **표시**: 아바타 아이콘 (28px 원형)
- **동작**: 클릭 → 동일한 DropdownMenu (align="end")

## 엣지 케이스

### 미인증 상태

인증된 라우트(`/interviews`, `/study` 등)는 proxy.ts에서 `/login`으로 리다이렉트하므로, UserMenu가 렌더링되는 페이지에서 미인증 상태는 사실상 발생하지 않는다. 방어적으로 `session`이 없으면 UserMenu 트리거를 렌더링하지 않는다.

### 세션 로딩 상태

`useSession()`이 `loading` 상태일 때 아바타 자리에 원형 skeleton placeholder(아바타와 동일한 크기, `animate-pulse bg-iv-bg3 rounded-full`)를 표시하여 레이아웃 시프트를 방지한다. 별도 Skeleton 컴포넌트는 추가하지 않는다.

### 프로필 이미지 로드 실패

OAuth provider의 이미지 URL이 만료/실패할 경우, `<img onError>` + `useState` 패턴으로 이니셜 fallback(이름 첫 글자)을 표시한다. 이미지가 아예 없는 경우 Lucide `User` 아이콘을 표시한다. Next.js `Image` 컴포넌트는 외부 도메인 설정 복잡도를 피하기 위해 사용하지 않는다.

### 드롭다운 동작

- 테마 선택 후 드롭다운은 **열린 상태 유지** (GitHub/Linear 패턴). 로그아웃 클릭, 외부 클릭, Escape 키로만 닫힌다.
- 긴 이메일/이름은 `truncate`로 말줄임 처리 (기존 user-menu.tsx 패턴 유지).

## 컴포넌트 변경 계획

### 새로 만들 것

없음. 기존 `user-menu.tsx`를 리팩토링.

### 수정할 파일

1. **`src/components/shared/user-menu.tsx`**
   - 테마 segmented control 추가 (useThemeStore 연동) — plain `<button>` + `onClick`으로 구현 (ToggleGroup 사용하지 않음, DropdownMenu 내부 포커스 충돌 방지)
   - 펼침/접힘에 따른 트리거 표시 분기
   - `variant` prop: `'expanded'` (아바타+이름+이메일), `'collapsed'` (아바타만), `'mobile'` (아바타만, 작은 사이즈)
   - `DropdownMenuContent`에 `className="w-auto min-w-[220px]"` 지정하여 `w-(--anchor-width)` 기본값 오버라이드 (작은 트리거에서 드롭다운 깨짐 방지)

2. **`src/components/nav/app-sidebar.tsx`**
   - 하단 영역에서 기존 `ThemeToggle` 제거
   - `UserMenu` 추가 (펼침: `variant="expanded"`, 접힘: `variant="collapsed"`)

3. **`src/components/nav/mobile-header.tsx`**
   - `'use client'` 디렉티브 추가 (usePathname 사용하므로 필수, 현재 누락되어 있음)
   - 우측에 `UserMenu variant="mobile"` 추가

4. **`src/components/shared/theme-toggle.tsx`**
   - 더 이상 독립 컴포넌트로 사용하지 않음
   - `ThemeSegmentedControl` 같은 내부 컴포넌트로 전환하거나,
     UserMenu 내부에 인라인으로 구현 후 파일 삭제

### 삭제할 것

- `app-sidebar.tsx`에서 `ThemeToggle` import 및 렌더링 제거
- `theme-toggle.tsx` 파일 삭제 (segmented control은 UserMenu 내부로 이동)

### 건드리지 않을 것

- `ThemeProvider`, `ThemeScript`, `theme-store.ts` — 테마 인프라는 그대로 유지
- `PageHeader` — actions prop 활용하지 않음 (아바타는 사이드바/MobileHeader에만)
- `BottomTabBar`, `MobileMenuDrawer` — 변경 없음. 모바일에서 테마/로그아웃은 MobileHeader 아바타를 통해서만 접근. MobileMenuDrawer는 네비게이션 전용으로 유지.

## 데이터 흐름

```
UserMenu 컴포넌트
├── useSession() → 프로필 정보 (이름, 이메일, 이미지)
├── useThemeStore() → mode, resolvedTheme, setMode
└── signOut() → 로그아웃 액션
```

## 접근성

- DropdownMenu는 shadcn/ui 기반으로 키보드 접근성 기본 제공
- 아바타 버튼: `aria-label="사용자 메뉴"`
- 테마 segmented control: plain `<button>` + `role="radiogroup"` / `role="radio"` + `aria-checked` 패턴. ToggleGroup은 DropdownMenu 내부 포커스 충돌 문제로 사용하지 않음.
- 로그아웃: 명확한 텍스트 라벨

## 테스트 계획

- UserMenu 렌더링 테스트 (3가지 variant)
- 테마 변경 동작 테스트 (segmented control 클릭 → store 업데이트)
- 로그아웃 호출 테스트
