'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu } from 'lucide-react';
import { SidebarNav } from '@/components/interviews/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-iv-bg flex min-h-screen flex-col">
      <header className="border-iv-border bg-iv-bg2 flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden"
        >
          <Menu className="size-5" />
        </Button>
        <Link
          href="/study"
          className="text-iv-text2 hover:text-iv-text flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">스터디로 돌아가기</span>
        </Link>
        <div className="bg-iv-border h-4 w-px" />
        <h1 className="text-iv-text text-sm font-medium">면접 관리</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <SidebarNav className="hidden md:flex" />

        {/* Mobile Sidebar Drawer */}
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
          <DrawerContent className="bg-iv-bg2 w-[240px] p-0">
            <DrawerHeader className="border-iv-border border-b px-3 py-3">
              <DrawerTitle className="text-iv-text text-sm">메뉴</DrawerTitle>
            </DrawerHeader>
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </DrawerContent>
        </Drawer>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
