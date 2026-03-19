'use client';

import { usePathname } from 'next/navigation';
import { navItems, settingsItem } from './nav-config';

function getPageTitle(pathname: string): string {
  const allItems = [...navItems, settingsItem];
  const match = allItems.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  return match?.label ?? 'Intervuddy';
}

interface MobileHeaderProps {
  actions?: React.ReactNode;
}

export function MobileHeader({ actions }: MobileHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="border-iv-border bg-iv-bg/80 sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <div className="bg-iv-accent flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold text-white">
          IV
        </div>
        <h1 className="text-iv-text text-sm font-semibold">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
