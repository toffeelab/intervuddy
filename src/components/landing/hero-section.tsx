import Link from "next/link";

export function HeroSection() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 px-6 pt-32 pb-20 text-center">
      <div className="flex items-center gap-2 rounded-full border border-iv-border2 bg-iv-bg2 px-4 py-1.5 text-sm text-iv-text2">
        <span className="inline-block size-2 rounded-full bg-iv-accent animate-pulse" />
        면접 준비 도우미
      </div>

      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
        <span className="bg-gradient-to-r from-iv-accent to-iv-accent2 bg-clip-text text-transparent">
          Intervuddy
        </span>
      </h1>

      <p className="text-lg font-medium text-iv-text sm:text-xl">
        AI 시대의 면접 준비, 체계적으로
      </p>

      <p className="max-w-xl text-sm leading-relaxed text-iv-text2 sm:text-base">
        카테고리별 Q&A, 꼬리질문 대비, 핵심 키워드 정리까지.
        <br className="hidden sm:block" />
        개발자 면접에 필요한 모든 것을 한 곳에서 관리하세요.
      </p>

      <Link
        href="/study"
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        면접 가이드 시작하기 →
      </Link>
    </section>
  );
}
