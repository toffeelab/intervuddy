'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { SidebarNav } from '@/components/interviews/sidebar-nav';
import { PageHeader } from '@/components/nav/page-header';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="border-iv-border bg-iv-bg/80 sticky top-0 z-30 flex items-center gap-3 border-b px-3 py-2 backdrop-blur-md md:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(true)}
          aria-label="서브 메뉴 열기"
        >
          <Menu className="size-5" />
        </Button>
        <h1 className="text-iv-text text-sm font-medium">채용공고 관리</h1>
      </header>

      {/* Desktop header */}
      <PageHeader title="채용공고 관리" />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <SidebarNav className="hidden md:flex" />

        {/* Mobile Sidebar Drawer */}
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
          <DrawerContent className="bg-iv-bg2 w-[min(240px,85vw)] p-0">
            <DrawerHeader className="border-iv-border border-b px-3 py-3">
              <DrawerTitle className="text-iv-text text-sm">메뉴</DrawerTitle>
            </DrawerHeader>
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </DrawerContent>
        </Drawer>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </>
  );
}
