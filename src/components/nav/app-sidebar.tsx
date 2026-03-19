'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';
import { navGroups, navItems, settingsItem } from './nav-config';
import { SidebarNavGroup } from './sidebar-nav-group';
import { SidebarNavItem } from './sidebar-nav-item';

export function AppSidebar() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'border-iv-border bg-iv-bg2 hidden flex-col border-r transition-[width] duration-200 md:flex',
          isCollapsed ? 'w-[60px]' : 'w-[240px]'
        )}
      >
        {/* Logo + Toggle */}
        <div
          className={cn(
            'border-iv-border flex items-center border-b px-3 py-3',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-iv-accent flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white">
                IV
              </div>
              <span className="text-iv-text text-sm font-semibold">Intervuddy</span>
            </div>
          )}
          {isCollapsed && (
            <div className="bg-iv-accent flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white">
              IV
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 rounded-md p-1 transition-colors',
              isCollapsed && 'mt-2'
            )}
            aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navGroups.map((group, groupIdx) => {
            const groupItems = navItems.filter((item) => item.group === group.key);
            return (
              <div key={group.key}>
                <SidebarNavGroup group={group} isCollapsed={isCollapsed} isFirst={groupIdx === 0} />
                {groupItems.map((item) => (
                  <SidebarNavItem key={item.href} item={item} isCollapsed={isCollapsed} />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Bottom: Settings + Theme */}
        <div className="border-iv-border border-t p-2">
          <SidebarNavItem item={settingsItem} isCollapsed={isCollapsed} />
          {!isCollapsed && (
            <div className="mt-1 px-2.5">
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
