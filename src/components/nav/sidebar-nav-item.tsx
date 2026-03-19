'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NavItem } from './nav-config';

interface SidebarNavItemProps {
  item: NavItem;
  isCollapsed: boolean;
}

export function SidebarNavItem({ item, isCollapsed }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  const content = (
    <Link
      href={item.disabled ? '#' : item.href}
      aria-disabled={item.disabled}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
        isCollapsed && 'justify-center px-0',
        isActive
          ? 'bg-iv-accent/10 text-iv-accent font-medium'
          : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text',
        item.disabled && 'pointer-events-none opacity-40'
      )}
      onClick={item.disabled ? (e) => e.preventDefault() : undefined}
    >
      <Icon className="size-[18px] shrink-0" />
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={content} />
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
