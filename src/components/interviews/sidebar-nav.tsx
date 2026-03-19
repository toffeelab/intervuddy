'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, LayoutList, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  className?: string;
  onNavigate?: () => void;
}

export function SidebarNav({ className, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const isJdSection = pathname === '/interviews' || pathname.startsWith('/interviews/jobs');
  const isQuestions = pathname.startsWith('/interviews/questions');
  const isTrash = pathname.startsWith('/interviews/trash');

  return (
    <nav
      className={cn(
        'border-iv-border bg-iv-bg2 flex w-52 shrink-0 flex-col gap-1 border-r p-3',
        className
      )}
    >
      <Link
        href="/interviews"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isJdSection
            ? 'bg-iv-accent/10 text-iv-accent'
            : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
        )}
      >
        <FolderOpen className="size-4 shrink-0" />
        <span>채용공고</span>
      </Link>
      <Link
        href="/interviews/questions"
        onClick={onNavigate}
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

      <div className="border-iv-border my-1 border-t" />

      <Link
        href="/interviews/trash"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isTrash
            ? 'bg-iv-accent/10 text-iv-accent'
            : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text'
        )}
      >
        <Trash2 className="size-4 shrink-0" />
        <span>휴지통</span>
      </Link>
    </nav>
  );
}
