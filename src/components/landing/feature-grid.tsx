const features = [
  {
    icon: '📋',
    title: '카테고리별 Q&A',
    description: '공통 질문부터 JD 맞춤 질문까지 체계적으로 분류',
  },
  {
    icon: '🔗',
    title: '꼬리질문 대비',
    description: '면접관의 심화 질문에 대한 답변도 준비',
  },
  {
    icon: '🏷️',
    title: '키워드 정리',
    description: '답변에 반드시 포함해야 할 핵심 키워드 가이드',
  },
  {
    icon: '💡',
    title: '면접 팁',
    description: '실전에서 유용한 면접 노하우 제공',
  },
  {
    icon: '💾',
    title: '데이터 영속성',
    description: 'SQLite 기반으로 데이터가 안전하게 보존',
  },
  {
    icon: '🔍',
    title: '검색 & 필터',
    description: '원하는 질문을 빠르게 찾아 준비',
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16">
      <h2 className="text-iv-text3 mb-10 text-center text-sm font-medium tracking-widest uppercase">
        주요 기능
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="border-iv-border bg-iv-bg2 hover:border-iv-border2 rounded-xl border p-5 transition-colors"
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              {feature.icon}
            </span>
            <h3 className="text-iv-text mt-3 text-sm font-semibold">{feature.title}</h3>
            <p className="text-iv-text2 mt-1.5 text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
