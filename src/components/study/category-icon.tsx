import {
  Cog,
  FlaskConical,
  Handshake,
  LayoutList,
  type LucideIcon,
  Rocket,
  Sprout,
  UserRound,
} from 'lucide-react';
import { CATEGORY_ICON_BG, CATEGORY_LUCIDE_ICON } from '@/lib/constants';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutList,
  UserRound,
  Cog,
  Handshake,
  FlaskConical,
  Rocket,
  Sprout,
};

interface CategoryIconProps {
  categoryName: string;
  emojiIcon?: string;
  className?: string;
}

export function CategoryIcon({ categoryName, emojiIcon, className }: CategoryIconProps) {
  const lucideIconName = CATEGORY_LUCIDE_ICON[categoryName];
  const Icon = lucideIconName ? ICON_MAP[lucideIconName] : null;
  const bg = CATEGORY_ICON_BG[categoryName] ?? 'bg-iv-bg3';

  return (
    <span className={cn('flex h-5 w-5 items-center justify-center rounded', bg, className)}>
      {Icon ? <Icon className="size-3" /> : <span className="text-[11px]">{emojiIcon}</span>}
    </span>
  );
}
