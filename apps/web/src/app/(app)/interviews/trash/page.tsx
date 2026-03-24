import { getDeletedJobs, getDeletedQuestions } from '@intervuddy/database';
import { Trash2, FolderOpen, FileText } from 'lucide-react';
import { restoreJobAction } from '@/actions/job-actions';
import { restoreQuestionAction } from '@/actions/question-actions';
import { TrashSection } from '@/components/interviews/trash-section';
import type { TrashItem } from '@/components/interviews/trash-section';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';
import { DEFAULT_RETENTION_DAYS } from '@/lib/retention-policy';

export default async function TrashPage() {
  const userId = await getCurrentUserId();
  const db = getDb();
  const [deletedJobs, deletedQuestions] = await Promise.all([
    getDeletedJobs(db, userId),
    getDeletedQuestions(db, userId),
  ]);

  const jobItems: TrashItem[] = deletedJobs.map((j) => ({
    id: j.id,
    type: 'job' as const,
    title: j.companyName,
    subtitle: j.positionTitle,
    deletedAt: j.deletedAt!.toISOString(),
  }));

  const questionItems: TrashItem[] = deletedQuestions.map((q) => ({
    id: q.id,
    type: 'question' as const,
    title: q.question,
    subtitle: q.categoryDisplayLabel,
    deletedAt: q.deletedAt!.toISOString(),
  }));

  const isEmpty = jobItems.length === 0 && questionItems.length === 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Trash2 className="text-iv-text3 size-5" />
          <h2 className="text-iv-text text-lg font-medium">휴지통</h2>
        </div>
        <p className="text-iv-text3 mt-1 text-sm">
          삭제된 항목은 {DEFAULT_RETENTION_DAYS}일간 보관 후 영구 삭제됩니다.
        </p>
      </div>

      {isEmpty ? (
        <div className="text-iv-text3 flex flex-col items-center justify-center py-16 text-sm">
          <Trash2 className="mb-3 size-10 opacity-20" />
          <p>삭제된 항목이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <TrashSection
            label="삭제된 JD"
            icon={<FolderOpen className="text-iv-text3 size-4" />}
            items={jobItems}
            onRestore={restoreJobAction}
            retentionDays={DEFAULT_RETENTION_DAYS}
          />
          <TrashSection
            label="삭제된 질문"
            icon={<FileText className="text-iv-text3 size-4" />}
            items={questionItems}
            onRestore={restoreQuestionAction}
            retentionDays={DEFAULT_RETENTION_DAYS}
          />
        </div>
      )}
    </div>
  );
}
