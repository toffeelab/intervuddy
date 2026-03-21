import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { ImportModal } from '@/components/interviews/import-modal';
import { JobStatusBadge } from '@/components/interviews/job-status-badge';
import { QuestionEditDrawer } from '@/components/interviews/question-edit-drawer';
import { QuestionTable } from '@/components/interviews/question-table';
import { getCategoriesByJdId, getGlobalCategories } from '@/data-access/categories';
import { getJobById } from '@/data-access/jobs';
import { getQuestionsByJdId, getLibraryQuestions } from '@/data-access/questions';
import { getCurrentUserId } from '@/lib/auth';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  const job = await getJobById(userId, id);
  if (!job) notFound();

  const [jdQuestions, jdCategories, libraryQuestions, globalCategories] = await Promise.all([
    getQuestionsByJdId(userId, job.id),
    getCategoriesByJdId(userId, job.id),
    getLibraryQuestions(userId),
    getGlobalCategories(userId),
  ]);
  const importedOriginIds = jdQuestions
    .filter((q) => q.originQuestionId !== null)
    .map((q) => q.originQuestionId as string);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-iv-text text-lg font-medium">{job.companyName}</h2>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-iv-text2 mt-1 text-sm">{job.positionTitle}</p>
          {job.memo && <p className="text-iv-text3 mt-2 text-xs">{job.memo}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ImportModal
            jdId={job.id}
            libraryQuestions={libraryQuestions}
            categories={globalCategories}
            importedOriginIds={importedOriginIds}
          />
          <Link
            href={`/interviews/jobs/${job.id}/edit`}
            className="border-iv-border text-iv-text2 hover:bg-iv-bg3 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors"
          >
            <Pencil className="size-4" />
            수정
          </Link>
        </div>
      </div>

      <QuestionTable questions={jdQuestions} />
      <QuestionEditDrawer questions={jdQuestions} categories={jdCategories} />
    </div>
  );
}
