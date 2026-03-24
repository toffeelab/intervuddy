import { notFound } from 'next/navigation';
import { getJobById } from '@intervuddy/database';
import { JobForm } from '@/components/interviews/job-form';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditJobPage({ params }: Props) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const job = await getJobById(getDb(), userId, id);
  if (!job) notFound();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-iv-text text-lg font-medium">공고 수정</h2>
        <p className="text-iv-text3 mt-1 text-sm">
          {job.companyName} — {job.positionTitle}
        </p>
      </div>
      <JobForm job={job} />
    </div>
  );
}
