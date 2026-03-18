import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SidebarNav } from '@/components/interviews/sidebar-nav';

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
        <SidebarNav />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
