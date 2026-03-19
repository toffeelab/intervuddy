import { cn } from '@/lib/utils';

interface PageHeaderBadge {
  label: string;
  variant?: 'default' | 'accent' | 'muted';
}

interface PageHeaderProps {
  title: string;
  badges?: PageHeaderBadge[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const badgeStyles: Record<string, string> = {
  default: 'bg-iv-bg3 text-iv-text2',
  accent: 'bg-iv-accent/12 text-iv-accent border-iv-accent/25 border',
  muted: 'bg-iv-jd/12 text-iv-jd border-iv-jd/25 border',
};

export function PageHeader({ title, badges, actions, children }: PageHeaderProps) {
  return (
    <header className="border-iv-border bg-iv-bg/80 sticky top-0 z-30 hidden h-[53px] items-center border-b px-6 backdrop-blur-md md:flex">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-iv-text text-base font-semibold">{title}</h1>
          {badges?.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px]',
                badgeStyles[badge.variant ?? 'default']
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
