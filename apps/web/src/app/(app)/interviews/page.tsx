import Link from 'next/link';
import { getAllJobs } from '@intervuddy/database';
import { Plus } from 'lucide-react';
import { JobCard } from '@/components/interviews/job-card';
import { JobStatusFilter } from '@/components/interviews/job-status-filter';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function InterviewsPage({ searchParams }: Props) {
  const userId = await getCurrentUserId();
  const { status } = await searchParams;
  const allJobs = await getAllJobs(getDb(), userId);
  const jobs = status ? allJobs.filter((j) => j.status === status) : allJobs;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-iv-text text-lg font-medium">채용공고</h2>
          <p className="text-iv-text3 mt-1 text-sm">채용공고를 관리하고 질문을 맞춤 구성합니다.</p>
        </div>
        <Link
          href="/interviews/jobs/new"
          className="bg-iv-accent text-iv-accent-foreground hover:bg-iv-accent/90 inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors"
        >
          <Plus className="size-4" />
          공고 추가
        </Link>
      </div>

      <JobStatusFilter currentStatus={status ?? null} />

      {jobs.length === 0 ? (
        <div className="text-iv-text3 flex flex-col items-center justify-center py-16 text-sm">
          <p>등록된 채용공고가 없습니다.</p>
          <p className="mt-1 text-xs">공고를 추가하여 면접 준비를 시작하세요.</p>
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
