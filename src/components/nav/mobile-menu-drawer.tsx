'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { navGroups, navItems, settingsItem } from './nav-config';

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuDrawer({ open, onOpenChange }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const allItems = [...navItems, settingsItem];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>전체 메뉴</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          {navGroups.map((group) => {
            const groupItems = allItems.filter((item) => item.group === group.key);
            return (
              <div key={group.key} className="mb-4">
                <p className="text-iv-text3 mb-2 font-mono text-[10px] tracking-wider uppercase">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {groupItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;

                    if (item.disabled) {
                      return (
                        <span
                          key={item.href}
                          role="link"
                          aria-disabled="true"
                          tabIndex={-1}
                          className="bg-iv-bg2 text-iv-text2 flex items-center gap-2 rounded-lg p-3 text-sm opacity-40"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg p-3 text-sm transition-colors',
                          isActive
                            ? 'bg-iv-accent/10 text-iv-accent font-medium'
                            : 'bg-iv-bg2 text-iv-text2'
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
