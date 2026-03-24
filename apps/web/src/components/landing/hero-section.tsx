import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 px-6 pt-32 pb-20 text-center">
      <div className="border-iv-border2 bg-iv-bg2 text-iv-text2 flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
        <span className="bg-iv-accent inline-block size-2 animate-pulse rounded-full" />
        면접 준비 도우미
      </div>

      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
        <span className="from-iv-accent to-iv-accent2 bg-gradient-to-r bg-clip-text text-transparent">
          Intervuddy
        </span>
      </h1>

      <p className="text-iv-text text-lg font-medium sm:text-xl">AI 시대의 면접 준비, 체계적으로</p>

      <p className="text-iv-text2 max-w-xl text-sm leading-relaxed sm:text-base">
        카테고리별 Q&A, 꼬리질문 대비, 핵심 키워드 정리까지.
        <br className="hidden sm:block" />
        개발자 면접에 필요한 모든 것을 한 곳에서 관리하세요.
      </p>

      <Link
        href="/study"
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium shadow-sm transition-colors"
      >
        면접 가이드 시작하기 →
      </Link>
    </section>
  );
}
