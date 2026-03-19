'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, FileText, MoreHorizontal } from 'lucide-react';
import { deleteJobAction } from '@/actions/job-actions';
import { JobStatusBadge } from '@/components/interviews/job-status-badge';
import { useConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { JobDescription } from '@/data-access/types';
import { cn } from '@/lib/utils';

interface Props {
  job: JobDescription;
}

export function JobCard({ job }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  function handleDelete() {
    confirm({
      title: 'JD 삭제',
      description: `"${job.companyName} — ${job.positionTitle}" JD를 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteJobAction(job.id);
          } catch {
            setError('삭제에 실패했습니다');
          }
        });
      },
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
        'border-iv-border bg-iv-bg hover:bg-iv-bg3 cursor-pointer rounded-lg border p-4 transition-colors',
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                title="더보기"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-3.5" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-iv-text3 mt-3 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <FileText className="size-3" />
          질문 {job.questionCount}개
        </span>
        <span>{new Date(job.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
      {error && <p className="text-iv-red mt-2 text-xs">{error}</p>}
      {dialog}
    </div>
  );
}
