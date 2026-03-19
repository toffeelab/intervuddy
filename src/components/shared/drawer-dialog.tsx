'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface DrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  dialogClassName?: string;
  drawerClassName?: string;
}

export function DrawerDialog({
  open,
  onOpenChange,
  title,
  children,
  dialogClassName,
  drawerClassName,
}: DrawerDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={dialogClassName}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn('max-h-[85vh]', drawerClassName)}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
