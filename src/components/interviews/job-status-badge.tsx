import { Badge } from '@/components/ui/badge';
import type { JobDescriptionStatus } from '@/data-access/types';

const STATUS_CONFIG: Record<
  JobDescriptionStatus,
  { label: string; className: string }
> = {
  in_progress: {
    label: '진행중',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  completed: {
    label: '완료',
    className: 'bg-iv-green/10 text-iv-green border-iv-green/20',
  },
  archived: {
    label: '보관',
    className: 'bg-iv-text3/10 text-iv-text3 border-iv-text3/20',
  },
};

export function JobStatusBadge({ status }: { status: JobDescriptionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
