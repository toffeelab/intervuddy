import { notFound } from 'next/navigation';
import { JobForm } from '@/components/interviews/job-form';
import { getJobById } from '@/data-access/jobs';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditJobPage({ params }: Props) {
  const { id } = await params;
  const job = getJobById(Number(id));
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
