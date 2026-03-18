import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { JobStatusBadge } from '@/components/interviews/job-status-badge';
import { QuestionTable } from '@/components/interviews/question-table';
import { QuestionEditDrawer } from '@/components/interviews/question-edit-drawer';
import { ImportModal } from '@/components/interviews/import-modal';
import { getJobById } from '@/data-access/jobs';
import { getQuestionsByJdId, getLibraryQuestions } from '@/data-access/questions';
import { getCategoriesByJdId, getGlobalCategories } from '@/data-access/categories';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = getJobById(Number(id));
  if (!job) notFound();

  const jdQuestions = getQuestionsByJdId(job.id);
  const jdCategories = getCategoriesByJdId(job.id);

  const libraryQuestions = getLibraryQuestions();
  const globalCategories = getGlobalCategories();
  const importedOriginIds = jdQuestions
    .filter((q) => q.originQuestionId !== null)
    .map((q) => q.originQuestionId as number);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-iv-text text-lg font-medium">{job.companyName}</h2>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-iv-text2 mt-1 text-sm">{job.positionTitle}</p>
          {job.memo && <p className="text-iv-text3 mt-2 text-xs">{job.memo}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ImportModal
            jdId={job.id}
            libraryQuestions={libraryQuestions}
            categories={globalCategories}
            importedOriginIds={importedOriginIds}
          />
          <Link
            href={`/interviews/jobs/${job.id}/edit`}
            className="border-iv-border text-iv-text2 hover:bg-iv-bg3 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors"
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
