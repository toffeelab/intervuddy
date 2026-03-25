import { cn } from '@/lib/utils';
import type { NavGroup } from './nav-config';

interface SidebarNavGroupProps {
  group: NavGroup;
  isCollapsed: boolean;
  isFirst?: boolean;
}

export function SidebarNavGroup({ group, isCollapsed, isFirst }: SidebarNavGroupProps) {
  if (isCollapsed) {
    if (isFirst) return null;
    return <div className="border-iv-border mx-2 my-2 border-t" />;
  }

  return (
    <p
      className={cn(
        'text-iv-text3 px-2.5 pb-1.5 font-mono text-[10px] tracking-wider uppercase',
        isFirst ? 'pt-0' : 'pt-3'
      )}
    >
      {group.label}
    </p>
  );
}
