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

  const linkClassName = cn(
    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
    isCollapsed && 'justify-center px-0',
    isActive
      ? 'bg-iv-accent/10 text-iv-accent font-medium'
      : 'text-iv-text2 hover:bg-iv-bg3 hover:text-iv-text',
    item.disabled && 'pointer-events-none opacity-40'
  );

  const children = (
    <>
      <Icon className="size-[18px] shrink-0" />
      {!isCollapsed && <span>{item.label}</span>}
    </>
  );

  if (item.disabled) {
    const disabledContent = (
      <span className={linkClassName} role="link" aria-disabled="true" tabIndex={-1}>
        {children}
      </span>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className={linkClassName} role="link" aria-disabled="true" tabIndex={-1} />
            }
          >
            {children}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return disabledContent;
  }

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<Link href={item.href} className={linkClassName} />}>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} className={linkClassName}>
      {children}
    </Link>
  );
}
