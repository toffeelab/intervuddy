'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarNav() {
  const pathname = usePathname();
  const isQuestions = pathname.startsWith('/interviews/questions');

  return (
    <nav className="w-52 border-r border-iv-border bg-iv-bg2 flex flex-col gap-1 p-3 shrink-0">
      <Link
        href="/interviews"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          !isQuestions
            ? 'bg-iv-accent/10 text-iv-accent'
            : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
        )}
      >
        <FolderOpen className="size-4 shrink-0" />
        <span>JD 관리</span>
      </Link>
      <Link
        href="/interviews/questions"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isQuestions
            ? 'bg-iv-accent/10 text-iv-accent'
            : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
        )}
      >
        <LayoutList className="size-4 shrink-0" />
        <span>공통 라이브러리</span>
      </Link>
    </nav>
  );
}
