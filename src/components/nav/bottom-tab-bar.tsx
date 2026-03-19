'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileMenuDrawer } from './mobile-menu-drawer';
import { bottomTabItems } from './nav-config';

export function BottomTabBar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="border-iv-border bg-iv-bg fixed inset-x-0 bottom-0 z-50 flex border-t md:hidden">
        {bottomTabItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              aria-disabled={item.disabled}
              onClick={item.disabled ? (e) => e.preventDefault() : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
                isActive ? 'text-iv-accent' : 'text-iv-text3',
                item.disabled && 'opacity-40'
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-iv-text3 flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]"
        >
          <Menu className="size-5" />
          <span>더보기</span>
        </button>
      </nav>
      <MobileMenuDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
