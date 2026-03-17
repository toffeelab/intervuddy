export const categories = [
  { name: '자기소개/커리어', tag: 'intro', tagLabel: '자기소개', icon: '👤', isJdGroup: false, displayOrder: 1 },
  { name: '기술역량', tag: 'tech', tagLabel: '기술', icon: '⚙️', isJdGroup: false, displayOrder: 2 },
  { name: '리더십/팀', tag: 'lead', tagLabel: '리더십', icon: '🤝', isJdGroup: false, displayOrder: 3 },
  { name: '프로젝트 심화', tag: 'proj', tagLabel: '프로젝트', icon: '🔬', isJdGroup: false, displayOrder: 4 },
  { name: '커리어 방향성', tag: 'career', tagLabel: '커리어', icon: '🚀', isJdGroup: false, displayOrder: 5 },
  { name: '조직/문화핏', tag: 'culture', tagLabel: '문화핏', icon: '🌱', isJdGroup: false, displayOrder: 6 },
  { name: 'JD-프론트엔드', tag: 'jd', tagLabel: 'JD맞춤', icon: '🎨', isJdGroup: true, displayOrder: 7 },
  { name: 'JD-백엔드/인프라', tag: 'jd', tagLabel: 'JD맞춤', icon: '🔧', isJdGroup: true, displayOrder: 8 },
];

export const qaItems = [
  // ─── 자기소개/커리어 ───
  {
    cat: '자기소개/커리어', isJD: false, isDeep: false,
    q: '간단하게 자기소개 해주세요.',
    a: '안녕하세요, 프론트엔드 개발자 홍길동입니다.\n\n지난 3년간 스타트업에서 React 기반의 B2B SaaS 제품을 개발해 왔습니다. 주로 대시보드, 데이터 시각화, 실시간 알림 시스템을 담당했으며, 사용자 경험 개선을 통해 고객 이탈률을 30% 감소시킨 경험이 있습니다.\n\n최근에는 Next.js App Router와 TypeScript를 활용한 프로젝트를 리드하며 SSR/ISR 기반의 성능 최적화에 집중하고 있습니다.',
    tip: '1~2분 안에 핵심만 전달하세요. 지원 회사와의 연결 포인트를 마지막에 언급하면 좋습니다.',
    jdTip: null,
    keywords: ['3년 경력', 'React', 'B2B SaaS', '성능 최적화'],
    deepQA: [],
  },
  {
    cat: '자기소개/커리어', isJD: false, isDeep: false,
    q: '현재까지 가장 자랑스러운 성과는?',
    a: '레거시 jQuery 기반 어드민 시스템을 React + TypeScript로 전면 재작성한 프로젝트입니다.\n\n6개월간 진행하며 서비스 중단 없이 점진적 마이그레이션을 완료했고, 결과적으로 페이지 로딩 속도 60% 개선, 버그 리포트 40% 감소를 달성했습니다. 이 과정에서 팀 내 코드리뷰 문화를 정착시키고 CI/CD 파이프라인도 구축했습니다.',
    tip: '성과는 반드시 수치로 표현하세요. before/after가 명확할수록 좋습니다.',
    jdTip: null,
    keywords: ['레거시 마이그레이션', '점진적 전환', '60% 성능 개선', 'CI/CD'],
    deepQA: [],
  },
  {
    cat: '자기소개/커리어', isJD: false, isDeep: false,
    q: '강점과 약점은 무엇인가요?',
    a: '강점: 문제를 발견하면 끝까지 파고드는 집요함입니다. 프로덕션에서 발생한 메모리 릭 이슈를 Chrome DevTools Profiler로 추적해 React의 불필요한 클로저 참조를 제거한 경험이 대표적입니다.\n\n약점: 완벽주의 성향이 있어 초기에는 코드리뷰에서 지나치게 세세한 피드백을 주는 경향이 있었습니다. 현재는 "blocking vs non-blocking" 피드백을 구분하는 습관을 들여 팀의 개발 속도와 코드 품질 사이의 균형을 맞추고 있습니다.',
    tip: '약점은 "이미 개선 중"이라는 메시지를 반드시 포함하세요.',
    jdTip: null,
    keywords: ['디버깅 능력', '메모리 릭', '코드리뷰', '균형 감각'],
    deepQA: [],
  },

  // ─── 기술역량 ───
  {
    cat: '기술역량', isJD: false, isDeep: true,
    q: 'React의 렌더링 최적화 전략을 설명해주세요.',
    a: '세 가지 레벨로 나눠서 접근합니다.\n\n1) 컴포넌트 레벨: React.memo로 props가 변경되지 않은 컴포넌트의 리렌더를 방지합니다. 단, shallow comparison 비용이 리렌더 비용보다 큰 경우는 오히려 역효과이므로 실제 측정이 중요합니다.\n\n2) 상태 레벨: 상태를 가능한 한 사용하는 컴포넌트에 가까이 배치합니다. 전역 상태가 불필요하게 넓은 범위를 리렌더시키는 것을 방지합니다. Zustand의 selector 패턴이 이를 잘 지원합니다.\n\n3) 연산 레벨: useMemo로 비용이 큰 계산을 캐싱하고, useCallback으로 자식 컴포넌트에 전달하는 함수의 참조 안정성을 유지합니다.',
    tip: '면접관이 "실제로 적용해본 적 있는가"를 물어볼 수 있으니 구체적 사례를 준비하세요.',
    jdTip: null,
    keywords: ['React.memo', 'useMemo', 'useCallback', 'selector 패턴', '리렌더 최적화'],
    deepQA: [
      {
        q: 'React 19의 React Compiler는 이런 최적화를 어떻게 바꾸나요?',
        a: 'React Compiler(이전 React Forget)는 useMemo, useCallback, React.memo를 자동으로 적용해주는 빌드 타임 최적화입니다.\n\n컴파일러가 컴포넌트의 의존성을 분석해 자동으로 메모이제이션을 삽입하므로, 개발자가 수동으로 최적화 훅을 작성할 필요가 줄어듭니다. 다만 모든 케이스를 커버하지는 못하므로, 성능 크리티컬한 부분은 여전히 수동 최적화가 필요할 수 있습니다.\n\n핵심 변화: "최적화를 기본값으로" 만드는 방향. 개발자는 최적화보다 비즈니스 로직에 집중할 수 있게 됩니다.',
      },
      {
        q: 'Virtual DOM diffing의 한계와 대안은?',
        a: 'Virtual DOM의 핵심 한계는 전체 트리를 비교하는 O(n) 비용입니다. 대규모 리스트나 빈번한 업데이트에서 병목이 될 수 있습니다.\n\n대안:\n- Signals (Solid.js, Preact Signals): 변경된 노드만 직접 업데이트. Virtual DOM 비교 과정 자체를 건너뜀\n- Fine-grained reactivity (Svelte): 컴파일 타임에 어떤 DOM이 업데이트되어야 하는지 결정\n- React의 접근: Concurrent Mode + Suspense로 렌더링 우선순위를 제어해 체감 성능을 개선\n\n실무에서는 react-window 같은 가상화 라이브러리로 DOM 노드 수 자체를 줄이는 것이 가장 효과적입니다.',
      },
    ],
  },
  {
    cat: '기술역량', isJD: false, isDeep: true,
    q: 'TypeScript의 타입 시스템을 활용한 실무 패턴을 설명해주세요.',
    a: '자주 사용하는 세 가지 패턴이 있습니다.\n\n1) Discriminated Union: API 응답의 성공/실패를 타입으로 분기합니다.\ntype Result<T> = { ok: true; data: T } | { ok: false; error: string }\nif (result.ok) 이후 자동으로 data 타입이 추론됩니다.\n\n2) Generic + Constraints: 데이터 fetching 함수를 제네릭으로 추상화하되, extends로 제약을 걸어 타입 안전성을 유지합니다.\n\n3) Zod + infer: 런타임 유효성 검증과 컴파일 타임 타입을 단일 소스에서 관리합니다. API 응답 파싱에 특히 유용합니다.',
    tip: null,
    jdTip: null,
    keywords: ['Discriminated Union', 'Generic', 'Zod', 'infer', '타입 추론'],
    deepQA: [
      {
        q: 'any, unknown, never의 차이를 설명해주세요.',
        a: 'any: 모든 타입을 허용하고 타입 검사를 건너뜀. TypeScript의 이점을 포기하는 것.\n\nunknown: 모든 값을 받지만 사용 전 반드시 타입 좁히기(type narrowing)가 필요. any보다 안전한 대안.\n\nnever: 절대 발생하지 않는 값의 타입. switch문의 exhaustive check에서 활용합니다.\n\nfunction assertNever(x: never): never {\n  throw new Error(`Unexpected: ${x}`);\n}\n\n실무 규칙: any 대신 unknown을 쓰고, Zod로 런타임 검증 후 타입을 좁히는 것이 가장 안전합니다.',
      },
    ],
  },
  {
    cat: '기술역량', isJD: false, isDeep: false,
    q: 'Git 브랜치 전략은 어떻게 운영하나요?',
    a: '팀 규모와 배포 주기에 따라 다르게 적용합니다.\n\n소규모 팀(2~4명): GitHub Flow 기반으로 main + feature branch만 운영합니다. PR 머지 시 자동 배포(Vercel Preview → main 머지 시 프로덕션).\n\n중규모 팀(5명+): Git Flow를 간소화해 main, develop, feature, hotfix 브랜치를 운영합니다. release 브랜치는 별도로 두지 않고 develop에서 main으로 직접 머지합니다.\n\n공통 원칙: feature 브랜치는 최대 3일 이내 머지, PR은 반드시 1명 이상 리뷰, squash merge로 커밋 히스토리를 깔끔하게 유지합니다.',
    tip: null,
    jdTip: null,
    keywords: ['GitHub Flow', 'Git Flow', 'PR 리뷰', 'squash merge'],
    deepQA: [],
  },

  // ─── 리더십/팀 ───
  {
    cat: '리더십/팀', isJD: false, isDeep: false,
    q: '팀원과 기술적 의견 충돌이 있었을 때 어떻게 해결했나요?',
    a: 'CSS-in-JS vs Tailwind CSS 선택에서 의견이 갈렸던 사례가 있습니다.\n\n감정이 아닌 데이터로 판단하자는 원칙을 세웠습니다. 두 방식으로 동일한 컴포넌트를 구현해 번들 크기, DX, 빌드 성능을 비교했습니다. 결과적으로 팀의 기존 코드베이스와 호환성, 신규 팀원 온보딩 속도를 종합적으로 고려해 Tailwind를 선택했습니다.\n\n핵심은 "내 의견이 맞다"가 아니라 "팀에 최선인 결정"을 찾는 것이었습니다. 선택되지 않은 의견의 장점도 인정하고 기록으로 남겼습니다.',
    tip: '"나의 의견이 채택되지 않았을 때도 결정에 따랐다"는 메시지가 중요합니다.',
    jdTip: null,
    keywords: ['데이터 기반 의사결정', 'POC 비교', '팀 합의'],
    deepQA: [],
  },
  {
    cat: '리더십/팀', isJD: false, isDeep: false,
    q: '코드리뷰를 어떻게 진행하나요?',
    a: '세 가지 원칙을 지킵니다.\n\n1) Blocking vs Non-blocking 구분: 버그, 보안 이슈는 blocking으로 반드시 수정 요청. 네이밍, 코드 스타일은 suggestion으로 제안.\n\n2) "왜"에 집중: "이렇게 바꿔라"가 아니라 "이 방식이 더 나은 이유"를 설명합니다. 리뷰이도 학습할 수 있도록.\n\n3) 긍정적 피드백 포함: 잘 작성된 부분에도 코멘트를 남깁니다. 리뷰가 "지적"이 아니라 "대화"가 되도록.',
    tip: null,
    jdTip: null,
    keywords: ['Blocking vs Non-blocking', '코드리뷰 문화', '건설적 피드백'],
    deepQA: [],
  },

  // ─── 프로젝트 심화 ───
  {
    cat: '프로젝트 심화', isJD: false, isDeep: false,
    q: '가장 복잡했던 기술적 문제와 해결 과정을 설명해주세요.',
    a: 'SaaS 대시보드에서 10만 행 이상의 테이블을 렌더링해야 하는 요구사항이 있었습니다.\n\n문제: DOM 노드 수 폭발로 스크롤 시 프레임 드롭(15fps)이 발생.\n\n해결 과정:\n1. react-window로 가상화 적용 → 60fps 확보\n2. 검색/정렬 시 Web Worker에서 처리 → 메인 스레드 블로킹 제거\n3. debounce(300ms) + AbortController로 연속 입력 시 이전 연산 취소\n4. 컬럼 너비 자동 계산을 ResizeObserver로 처리\n\n결과: 10만 행에서도 스크롤 60fps, 검색 응답 200ms 이내를 달성했습니다.',
    tip: '문제 → 원인 분석 → 해결 → 결과의 4단계로 구조화하세요.',
    jdTip: null,
    keywords: ['react-window', 'Web Worker', '가상화', 'ResizeObserver', '성능 최적화'],
    deepQA: [],
  },
  {
    cat: '프로젝트 심화', isJD: false, isDeep: false,
    q: '테스트 전략은 어떻게 세우나요?',
    a: '테스팅 트로피 모델을 기반으로 합니다.\n\n1) Static Analysis (최하위): TypeScript strict mode + ESLint로 타입 에러와 코드 스멜을 잡습니다.\n\n2) Integration Tests (가장 많이): Testing Library로 "유저가 실제로 하는 행동"을 테스트합니다. 버튼 클릭 → API 호출 → 화면 업데이트 흐름을 검증.\n\n3) Unit Tests (필요한 곳만): 복잡한 비즈니스 로직, 유틸 함수에 한정. 구현 디테일이 아닌 입출력을 테스트.\n\n4) E2E Tests (크리티컬 플로우만): Playwright로 로그인 → 결제 → 확인 같은 핵심 사용자 여정만.',
    tip: null,
    jdTip: null,
    keywords: ['테스팅 트로피', 'Testing Library', 'Playwright', 'Integration Test'],
    deepQA: [],
  },

  // ─── 커리어 방향성 ───
  {
    cat: '커리어 방향성', isJD: false, isDeep: false,
    q: '앞으로 어떤 개발자가 되고 싶으신가요?',
    a: '"기술로 문제를 정의하고 해결하는 개발자"가 되고 싶습니다.\n\n코드를 잘 짜는 것을 넘어, 비즈니스 맥락에서 진짜 문제가 무엇인지 파악하고, 적절한 기술적 해결책을 제시할 수 있는 역량을 키우고 있습니다.\n\n단기적으로는 프론트엔드 아키텍처(디자인 시스템, 모노레포, 성능 최적화)에 깊이를 더하고, 장기적으로는 기술 리더로서 팀의 기술적 방향을 설정하고 주니어 개발자를 성장시키는 역할을 하고 싶습니다.',
    tip: null,
    jdTip: null,
    keywords: ['기술 리더', '문제 정의', '프론트엔드 아키텍처'],
    deepQA: [],
  },

  // ─── 조직/문화핏 ───
  {
    cat: '조직/문화핏', isJD: false, isDeep: false,
    q: '어떤 개발 문화를 선호하나요?',
    a: '"심리적 안전감이 있는 빠른 실험 문화"를 선호합니다.\n\n좋은 팀의 기준:\n- 코드리뷰가 "지적"이 아니라 "학습의 기회"인 환경\n- 실패를 비난하지 않고 회고에서 교훈을 추출하는 문화\n- 기술 의사결정이 문서화되어 "왜 이렇게 했는지"를 추적할 수 있는 환경\n\n이전 팀에서 ADR(Architecture Decision Record)을 도입해 기술 선택의 맥락을 기록했고, 신규 팀원 온보딩 시간을 크게 줄일 수 있었습니다.',
    tip: null,
    jdTip: null,
    keywords: ['심리적 안전감', 'ADR', '회고 문화', '코드리뷰'],
    deepQA: [],
  },

  // ─── JD-프론트엔드 ───
  {
    cat: 'JD-프론트엔드', isJD: true, isDeep: true,
    q: 'Next.js App Router와 Pages Router의 차이를 설명해주세요.',
    a: '핵심 차이는 React Server Components(RSC) 도입 여부입니다.\n\nPages Router:\n- 모든 컴포넌트가 기본 클라이언트 컴포넌트\n- getServerSideProps/getStaticProps로 데이터 패칭\n- _app.tsx, _document.tsx로 레이아웃 관리\n\nApp Router:\n- 기본이 서버 컴포넌트 ("use client" 명시 필요)\n- fetch는 서버에서 직접 수행, 자동 캐싱/중복 제거\n- layout.tsx로 중첩 레이아웃, loading.tsx/error.tsx로 상태 관리\n- Streaming + Suspense로 점진적 페이지 로딩\n\n실무 선택 기준: 신규 프로젝트는 App Router. 기존 Pages Router 프로젝트는 급하게 마이그레이션하기보다 새 기능부터 App Router로 작성하는 점진적 전환을 추천합니다.',
    tip: '"use client" 경계를 잘못 설정하면 클라이언트 번들이 오히려 커질 수 있다는 점도 언급하세요.',
    jdTip: null,
    keywords: ['App Router', 'RSC', 'Streaming', 'layout.tsx', '점진적 전환'],
    deepQA: [
      {
        q: 'SSR, SSG, ISR의 차이와 선택 기준은?',
        a: 'SSR: 요청마다 서버에서 HTML 생성. 실시간 데이터나 유저별 개인화가 필요한 페이지.\nSSG: 빌드 시 HTML 생성. 변경이 거의 없는 마케팅 페이지, 문서.\nISR: SSG + 주기적 재생성. 블로그, 상품 목록처럼 데이터가 변하지만 실시간은 아닌 경우.\n\nApp Router에서는 fetch의 cache/next.revalidate 옵션으로 라우트가 아닌 데이터 단위로 캐싱 전략을 설정할 수 있어 더 세밀한 제어가 가능합니다.',
      },
    ],
  },
  {
    cat: 'JD-프론트엔드', isJD: true, isDeep: false,
    q: '디자인 시스템 구축 경험이 있나요?',
    a: '사내 UI 라이브러리를 Storybook + shadcn/ui 기반으로 구축했습니다.\n\n핵심 결정:\n- shadcn/ui를 기반 레이어로 선택한 이유: 복사 기반이라 커스터마이징에 제약이 없음\n- Design Token을 CSS Variables로 관리해 다크/라이트 테마 전환 지원\n- Storybook으로 컴포넌트 문서화 + Chromatic으로 시각적 회귀 테스트\n\n결과: 신규 페이지 개발 시간 40% 단축, 디자이너-개발자 간 커뮤니케이션 비용 감소.',
    tip: null,
    jdTip: null,
    keywords: ['shadcn/ui', 'Storybook', 'Design Token', 'Chromatic'],
    deepQA: [],
  },

  // ─── JD-백엔드/인프라 ───
  {
    cat: 'JD-백엔드/인프라', isJD: true, isDeep: true,
    q: 'CI/CD 파이프라인을 어떻게 구성하나요?',
    a: 'GitHub Actions 기반으로 구성합니다.\n\nPR 생성 시:\n1. lint + type-check (병렬)\n2. unit + integration test (병렬)\n3. Vercel Preview 배포 → PR 코멘트에 URL 자동 첨부\n\nmain 머지 시:\n1. 위 검증 재실행\n2. E2E 테스트 (Playwright)\n3. Vercel Production 배포\n4. Sentry 릴리즈 생성 + 소스맵 업로드\n\n최적화:\n- paths-filter로 변경된 패키지만 테스트\n- pnpm cache로 의존성 설치 시간 80% 단축\n- Playwright shard 2개 병렬로 E2E 시간 50% 감소',
    tip: null,
    jdTip: null,
    keywords: ['GitHub Actions', 'Vercel', 'Playwright', 'paths-filter', 'pnpm cache'],
    deepQA: [
      {
        q: 'Monorepo에서 CI 최적화는 어떻게 하나요?',
        a: 'Turborepo의 캐싱과 GitHub Actions의 paths-filter를 조합합니다.\n\n1. Turborepo Remote Cache: 변경되지 않은 패키지의 빌드/테스트를 스킵\n2. paths-filter: 변경된 앱만 식별해 해당 앱의 파이프라인만 실행\n3. pnpm의 --filter 플래그로 영향받는 패키지만 선별\n\n결과: 전체 빌드 15분 → 변경 영역만 3~5분으로 단축. CI 비용도 크게 절감됩니다.',
      },
    ],
  },
  {
    cat: 'JD-백엔드/인프라', isJD: true, isDeep: false,
    q: 'JWT 기반 인증의 보안 고려사항을 설명해주세요.',
    a: '핵심 보안 원칙 5가지:\n\n1. Access Token은 짧게(15분), Refresh Token은 길게(7~30일)\n2. Refresh Token Rotation: 매 갱신 시 새 RT 발급, 이전 RT 즉시 무효화 → 탈취 감지 가능\n3. httpOnly Cookie로 RT 저장 → XSS로 JS에서 접근 불가\n4. CSRF 방어: SameSite=Strict 또는 CSRF 토큰\n5. JWT Payload에 민감정보 절대 금지 (base64 디코딩으로 누구나 읽을 수 있음)\n\n추가: HS256(대칭키)보다 RS256(비대칭키)이 마이크로서비스 환경에서 안전합니다. 서비스 간 공개키만 공유하면 검증 가능하기 때문입니다.',
    tip: 'JWT를 단순히 "사용했다"가 아니라 보안 원리를 이해하고 있음을 보여주세요.',
    jdTip: null,
    keywords: ['JWT', 'Refresh Token Rotation', 'httpOnly', 'RS256', 'XSS/CSRF'],
    deepQA: [],
  },
];
