import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SidebarNav } from '@/components/interviews/sidebar-nav';

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-iv-bg flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-iv-border bg-iv-bg2 flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/study"
          className="text-iv-text2 hover:text-iv-text flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>스터디로 돌아가기</span>
        </Link>
        <div className="bg-iv-border h-4 w-px" />
        <h1 className="text-iv-text text-sm font-medium">면접 관리</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <SidebarNav />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
