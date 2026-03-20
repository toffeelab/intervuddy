'use client';

import { LogOut, User } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="text-iv-text2 hover:text-iv-text hover:bg-iv-bg3 flex size-7 items-center justify-center rounded-full transition-colors outline-none"
        aria-label="사용자 메뉴"
      >
        {session?.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? '사용자'}
            className="size-7 rounded-full object-cover"
          />
        ) : (
          <User className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {session?.user && (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                {session.user.name && (
                  <span className="truncate text-sm font-medium">{session.user.name}</span>
                )}
                {session.user.email && (
                  <span className="text-iv-text2 truncate text-xs">{session.user.email}</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 size-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
