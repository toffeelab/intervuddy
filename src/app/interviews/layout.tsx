import Link from 'next/link';
import { ArrowLeft, FolderOpen, LayoutList } from 'lucide-react';

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-iv-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-iv-border bg-iv-bg2 px-4 py-3 flex items-center gap-3">
        <Link
          href="/study"
          className="flex items-center gap-1.5 text-iv-text2 hover:text-iv-text transition-colors text-sm"
        >
          <ArrowLeft className="size-4" />
          <span>스터디로 돌아가기</span>
        </Link>
        <div className="h-4 w-px bg-iv-border" />
        <h1 className="text-iv-text font-medium text-sm">면접 관리</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 border-r border-iv-border bg-iv-bg2 flex flex-col gap-1 p-3 shrink-0">
          <Link
            href="/interviews"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text transition-colors"
          >
            <FolderOpen className="size-4 shrink-0" />
            <span>JD 관리</span>
          </Link>
          <Link
            href="/interviews/questions"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text transition-colors"
          >
            <LayoutList className="size-4 shrink-0" />
            <span>공통 라이브러리</span>
          </Link>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
