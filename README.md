# Intervuddy

면접 예상 Q&A를 체계적으로 관리하고 준비할 수 있는 웹 애플리케이션입니다.

카테고리별 질문 분류, 꼬리질문 대비, 키워드 가이드, 면접 팁 등을 제공하며, JD(직무기술서) 맞춤 질문도 별도로 관리할 수 있습니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: Zustand (UI 상태 전용)
- **Database**: SQLite (better-sqlite3) — 서버 재시작 후에도 데이터 유지
- **Font**: Noto Sans KR + JetBrains Mono

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 랜딩 페이지 (브랜딩/기능 소개)
│   ├── globals.css           # 다크 테마 + Tailwind 설정
│   └── interview/
│       └── page.tsx          # 메인 Q&A 인터뷰 페이지
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── landing/              # 랜딩 페이지 컴포넌트
│   └── interview/            # 인터뷰 페이지 컴포넌트
├── db/                       # SQLite 연결 및 스키마
├── data-access/              # 데이터 접근 추상화 레이어
├── stores/                   # Zustand 상태 관리
└── lib/                      # 유틸리티 및 상수
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- pnpm

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 데이터베이스 시드 (최초 1회, 아래 둘 중 택 1)
pnpm db:seed:sample   # 샘플 데이터로 시작 (처음 사용자 권장)
pnpm db:seed           # 개인 데이터 시드 (data/seed.ts 필요)

# 개발 서버 실행
pnpm dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### 나만의 면접 데이터 추가하기

1. `data/seed.sample.ts`를 복사해 `data/seed.ts`를 만듭니다.
2. 카테고리와 Q&A 항목을 본인의 면접 내용으로 수정합니다.
3. `pnpm db:seed`를 실행하면 개인 데이터가 DB에 반영됩니다.

> `data/seed.ts`는 `.gitignore`에 포함되어 있어 개인 데이터가 커밋되지 않습니다.

### 빌드

```bash
pnpm build
pnpm start
```

## 주요 기능

- **카테고리별 Q&A**: 자기소개/커리어, 기술역량, 리더십/팀, 프로젝트 심화, 커리어 방향성, 조직/문화핏
- **JD 맞춤 질문**: 직무기술서 기반 맞춤 질문 (실시간/통신, 백오피스/UI, TypeScript/보안 등)
- **꼬리질문 대비**: 면접관의 심화 질문과 답변 가이드
- **키워드 가이드**: 답변에 포함해야 할 핵심 키워드
- **면접 팁**: 실전 면접 노하우
- **검색 & 필터**: 질문, 답변, 키워드 기반 검색
- **데이터 영속성**: SQLite 기반으로 서버 재시작 후에도 데이터 보존

## 아키텍처 설계 원칙

### Server / Client 분리
- **Server Component**: 데이터 fetching, 정적 UI (통계, 키워드 태그)
- **Client Component**: 사용자 인터랙션 (카테고리 선택, 검색, 카드 펼치기/접기)

### 상태 관리 전략
- **Zustand**: UI 상태 (activeCategory, searchQuery, expandedCards) — 여러 컴포넌트에서 동시 소비
- **Server Props**: QA 데이터 — Server Component에서 fetch 후 props로 전달
- **추후 확장**: API Route + React Query로 전환 시 data-access 레이어만 교체

### 데이터 접근 추상화
`src/data-access/qa.ts`의 함수들이 SQLite를 직접 호출합니다. 추후 백엔드 API가 추가되면:
1. API Route Handler 생성 (`/api/qa`)
2. Client에서 `useQuery`로 호출
3. 나머지 컴포넌트 로직은 변경 없음
