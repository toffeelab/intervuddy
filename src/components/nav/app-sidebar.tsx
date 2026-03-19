'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';
import { navGroups, navItems, settingsItem } from './nav-config';
import { SidebarNavGroup } from './sidebar-nav-group';
import { SidebarNavItem } from './sidebar-nav-item';

export function AppSidebar() {
  const userCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Tablet (md~lg): always collapsed. Desktop (lg+): user preference.
  const isCollapsed = isDesktop ? userCollapsed : true;
  const showToggle = isDesktop;

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'border-iv-border bg-iv-bg hidden flex-col border-r transition-[width] duration-200 md:flex',
          isCollapsed ? 'w-[60px]' : 'w-[240px]'
        )}
      >
        {/* Logo + Toggle */}
        <div
          className={cn(
            'border-iv-border flex h-[53px] items-center border-b px-3',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {isCollapsed ? (
            <div className="bg-iv-accent flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white">
              IV
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-iv-accent flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white">
                IV
              </div>
              <span className="text-iv-text text-sm font-semibold">Intervuddy</span>
            </div>
          )}
          {showToggle && !isCollapsed && (
            <button
              onClick={toggleCollapsed}
              className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 rounded-md p-1 transition-colors"
              aria-label="사이드바 접기"
            >
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav aria-label="메인 메뉴" className="flex-1 overflow-y-auto p-2">
          {showToggle && isCollapsed && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={toggleCollapsed}
                    className="text-iv-text3 hover:text-iv-text hover:bg-iv-bg3 mb-1 flex w-full items-center justify-center rounded-md p-1.5 transition-colors"
                  />
                }
              >
                <PanelLeftOpen className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                사이드바 펼치기
              </TooltipContent>
            </Tooltip>
          )}
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
