import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { JobCard } from '@/components/interviews/job-card';
import { JobStatusFilter } from '@/components/interviews/job-status-filter';
import { getAllJobs } from '@/data-access/jobs';

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function InterviewsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const allJobs = getAllJobs();
  const jobs = status ? allJobs.filter((j) => j.status === status) : allJobs;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-iv-text text-lg font-medium">JD 관리</h2>
          <p className="text-iv-text3 mt-1 text-sm">
            면접 대상 JD를 관리하고 질문을 맞춤 구성합니다.
          </p>
        </div>
        <Link href="/interviews/jobs/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="size-4" />
          새 JD
        </Link>
      </div>

      <JobStatusFilter currentStatus={status ?? null} />

      {jobs.length === 0 ? (
        <div className="text-iv-text3 flex flex-col items-center justify-center py-16 text-sm">
          <p>등록된 JD가 없습니다.</p>
          <p className="mt-1 text-xs">새 JD를 추가하여 면접을 준비하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
