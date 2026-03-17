export const categories = [
  { name: '자기소개/커리어', slug: 'self-intro', displayLabel: '자기소개', icon: '👤', displayOrder: 1 },
  { name: '기술역량', slug: 'tech', displayLabel: '기술', icon: '⚙️', displayOrder: 2 },
  { name: '리더십/팀', slug: 'lead', displayLabel: '리더십', icon: '🤝', displayOrder: 3 },
  { name: '프로젝트 심화', slug: 'proj', displayLabel: '프로젝트', icon: '🔬', displayOrder: 4 },
  { name: '커리어 방향성', slug: 'career', displayLabel: '커리어', icon: '🚀', displayOrder: 5 },
  { name: '조직/문화핏', slug: 'culture', displayLabel: '문화핏', icon: '🌱', displayOrder: 6 },
];

export const questions = [
  // ─── 자기소개/커리어 ───
  {
    cat: '자기소개/커리어',
    q: '간단하게 자기소개 해주세요.',
    a: '안녕하세요, 프론트엔드 개발자 홍길동입니다.\n\n지난 3년간 스타트업에서 React 기반의 B2B SaaS 제품을 개발해 왔습니다. 주로 대시보드, 데이터 시각화, 실시간 알림 시스템을 담당했으며, 사용자 경험 개선을 통해 고객 이탈률을 30% 감소시킨 경험이 있습니다.\n\n최근에는 Next.js App Router와 TypeScript를 활용한 프로젝트를 리드하며 SSR/ISR 기반의 성능 최적화에 집중하고 있습니다.',
    tip: '1~2분 안에 핵심만 전달하세요. 지원 회사와의 연결 포인트를 마지막에 언급하면 좋습니다.',
    keywords: ['3년 경력', 'React', 'B2B SaaS', '성능 최적화'],
    followups: [],
  },
  {
    cat: '자기소개/커리어',
    q: '현재까지 가장 자랑스러운 성과는?',
    a: '레거시 jQuery 기반 어드민 시스템을 React + TypeScript로 전면 재작성한 프로젝트입니다.\n\n6개월간 진행하며 서비스 중단 없이 점진적 마이그레이션을 완료했고, 결과적으로 페이지 로딩 속도 60% 개선, 버그 리포트 40% 감소를 달성했습니다. 이 과정에서 팀 내 코드리뷰 문화를 정착시키고 CI/CD 파이프라인도 구축했습니다.',
    tip: '성과는 반드시 수치로 표현하세요. before/after가 명확할수록 좋습니다.',
    keywords: ['레거시 마이그레이션', '점진적 전환', '60% 성능 개선', 'CI/CD'],
    followups: [],
  },
  {
    cat: '자기소개/커리어',
    q: '강점과 약점은 무엇인가요?',
    a: '강점: 문제를 발견하면 끝까지 파고드는 집요함입니다. 프로덕션에서 발생한 메모리 릭 이슈를 Chrome DevTools Profiler로 추적해 React의 불필요한 클로저 참조를 제거한 경험이 대표적입니다.\n\n약점: 완벽주의 성향이 있어 초기에는 코드리뷰에서 지나치게 세세한 피드백을 주는 경향이 있었습니다. 현재는 "blocking vs non-blocking" 피드백을 구분하는 습관을 들여 팀의 개발 속도와 코드 품질 사이의 균형을 맞추고 있습니다.',
    tip: '약점은 "이미 개선 중"이라는 메시지를 반드시 포함하세요.',
    keywords: ['디버깅 능력', '메모리 릭', '코드리뷰', '균형 감각'],
    followups: [],
  },

  // ─── 기술역량 ───
  {
    cat: '기술역량',
    q: 'React의 렌더링 최적화 전략을 설명해주세요.',
    a: '세 가지 레벨로 나눠서 접근합니다.\n\n1) 컴포넌트 레벨: React.memo로 props가 변경되지 않은 컴포넌트의 리렌더를 방지합니다.\n\n2) 상태 레벨: 상태를 가능한 한 사용하는 컴포넌트에 가까이 배치합니다. Zustand의 selector 패턴이 이를 잘 지원합니다.\n\n3) 연산 레벨: useMemo로 비용이 큰 계산을 캐싱하고, useCallback으로 자식 컴포넌트에 전달하는 함수의 참조 안정성을 유지합니다.',
    tip: '면접관이 "실제로 적용해본 적 있는가"를 물어볼 수 있으니 구체적 사례를 준비하세요.',
    keywords: ['React.memo', 'useMemo', 'useCallback', 'selector 패턴', '리렌더 최적화'],
    followups: [
      {
        q: 'React 19의 React Compiler는 이런 최적화를 어떻게 바꾸나요?',
        a: 'React Compiler(이전 React Forget)는 useMemo, useCallback, React.memo를 자동으로 적용해주는 빌드 타임 최적화입니다.\n\n핵심 변화: "최적화를 기본값으로" 만드는 방향. 개발자는 최적화보다 비즈니스 로직에 집중할 수 있게 됩니다.',
      },
      {
        q: 'Virtual DOM diffing의 한계와 대안은?',
        a: 'Virtual DOM의 핵심 한계는 전체 트리를 비교하는 O(n) 비용입니다.\n\n대안:\n- Signals (Solid.js): 변경된 노드만 직접 업데이트\n- Fine-grained reactivity (Svelte): 컴파일 타임에 결정\n- React의 접근: Concurrent Mode + Suspense로 체감 성능 개선\n\n실무에서는 react-window 같은 가상화 라이브러리가 가장 효과적입니다.',
      },
    ],
  },
  {
    cat: '기술역량',
    q: 'TypeScript의 타입 시스템을 활용한 실무 패턴을 설명해주세요.',
    a: '자주 사용하는 세 가지 패턴이 있습니다.\n\n1) Discriminated Union: API 응답의 성공/실패를 타입으로 분기합니다.\n\n2) Generic + Constraints: 데이터 fetching 함수를 제네릭으로 추상화하되, extends로 제약을 걸어 타입 안전성을 유지합니다.\n\n3) Zod + infer: 런타임 유효성 검증과 컴파일 타임 타입을 단일 소스에서 관리합니다.',
    tip: null,
    keywords: ['Discriminated Union', 'Generic', 'Zod', 'infer', '타입 추론'],
    followups: [
      {
        q: 'any, unknown, never의 차이를 설명해주세요.',
        a: 'any: 모든 타입을 허용하고 타입 검사를 건너뜀.\n\nunknown: 모든 값을 받지만 사용 전 반드시 타입 좁히기가 필요. any보다 안전한 대안.\n\nnever: 절대 발생하지 않는 값의 타입. switch문의 exhaustive check에서 활용.',
      },
    ],
  },
  {
    cat: '기술역량',
    q: 'Git 브랜치 전략은 어떻게 운영하나요?',
    a: '팀 규모와 배포 주기에 따라 다르게 적용합니다.\n\n소규모 팀: GitHub Flow 기반으로 main + feature branch만 운영.\n중규모 팀: Git Flow를 간소화해 main, develop, feature, hotfix.\n\n공통 원칙: feature 브랜치는 최대 3일 이내 머지, squash merge로 깔끔한 히스토리.',
    tip: null,
    keywords: ['GitHub Flow', 'Git Flow', 'PR 리뷰', 'squash merge'],
    followups: [],
  },

  // ─── 리더십/팀 ───
  {
    cat: '리더십/팀',
    q: '팀원과 기술적 의견 충돌이 있었을 때 어떻게 해결했나요?',
    a: 'CSS-in-JS vs Tailwind CSS 선택에서 의견이 갈렸던 사례가 있습니다.\n\n감정이 아닌 데이터로 판단하자는 원칙을 세웠습니다. 두 방식으로 동일한 컴포넌트를 구현해 번들 크기, DX, 빌드 성능을 비교했습니다.\n\n핵심은 "팀에 최선인 결정"을 찾는 것이었습니다.',
    tip: '"나의 의견이 채택되지 않았을 때도 결정에 따랐다"는 메시지가 중요합니다.',
    keywords: ['데이터 기반 의사결정', 'POC 비교', '팀 합의'],
    followups: [],
  },
  {
    cat: '리더십/팀',
    q: '코드리뷰를 어떻게 진행하나요?',
    a: '세 가지 원칙을 지킵니다.\n\n1) Blocking vs Non-blocking 구분\n2) "왜"에 집중\n3) 긍정적 피드백 포함',
    tip: null,
    keywords: ['Blocking vs Non-blocking', '코드리뷰 문화', '건설적 피드백'],
    followups: [],
  },

  // ─── 프로젝트 심화 ───
  {
    cat: '프로젝트 심화',
    q: '가장 복잡했던 기술적 문제와 해결 과정을 설명해주세요.',
    a: 'SaaS 대시보드에서 10만 행 이상의 테이블을 렌더링해야 하는 요구사항이 있었습니다.\n\n해결: react-window + Web Worker + debounce + ResizeObserver\n결과: 10만 행에서도 스크롤 60fps, 검색 응답 200ms 이내.',
    tip: '문제 → 원인 분석 → 해결 → 결과의 4단계로 구조화하세요.',
    keywords: ['react-window', 'Web Worker', '가상화', 'ResizeObserver', '성능 최적화'],
    followups: [],
  },

  // ─── 커리어 방향성 ───
  {
    cat: '커리어 방향성',
    q: '앞으로 어떤 개발자가 되고 싶으신가요?',
    a: '"기술로 문제를 정의하고 해결하는 개발자"가 되고 싶습니다.\n\n단기: 프론트엔드 아키텍처에 깊이를 더하고\n장기: 기술 리더로서 팀의 방향 설정 + 주니어 성장 지원',
    tip: null,
    keywords: ['기술 리더', '문제 정의', '프론트엔드 아키텍처'],
    followups: [],
  },

  // ─── 조직/문화핏 ───
  {
    cat: '조직/문화핏',
    q: '어떤 개발 문화를 선호하나요?',
    a: '"심리적 안전감이 있는 빠른 실험 문화"를 선호합니다.\n\n이전 팀에서 ADR(Architecture Decision Record)을 도입해 기술 선택의 맥락을 기록했고, 신규 팀원 온보딩 시간을 크게 줄일 수 있었습니다.',
    tip: null,
    keywords: ['심리적 안전감', 'ADR', '회고 문화', '코드리뷰'],
    followups: [],
  },
];
