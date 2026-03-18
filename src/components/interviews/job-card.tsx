'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobStatusBadge } from '@/components/interviews/job-status-badge';
import { deleteJobAction } from '@/actions/job-actions';
import { cn } from '@/lib/utils';
import type { JobDescription } from '@/data-access/types';

interface Props {
  job: JobDescription;
}

export function JobCard({ job }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`"${job.companyName} — ${job.positionTitle}" JD를 삭제하시겠습니까?`))
      return;
    startTransition(async () => {
      try {
        await deleteJobAction(job.id);
      } catch {
        setError('삭제에 실패했습니다');
      }
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/interviews/jobs/${job.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/interviews/jobs/${job.id}`);
        }
      }}
      className={cn(
        'group border-iv-border bg-iv-bg hover:bg-iv-bg3 cursor-pointer rounded-lg border p-4 transition-colors',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-iv-text truncate text-sm font-medium">{job.companyName}</h3>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-iv-text2 mt-1 truncate text-xs">{job.positionTitle}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          title="삭제"
          className="opacity-0 group-hover:opacity-100 hover:text-iv-red hover:bg-iv-red/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="text-iv-text3 mt-3 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <FileText className="size-3" />
          질문 {job.questionCount}개
        </span>
        <span>{new Date(job.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
      {error && <p className="text-iv-red mt-2 text-xs">{error}</p>}
    </div>
  );
}
