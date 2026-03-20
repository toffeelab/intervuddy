import { SessionCreateForm } from '@/components/session/session-create-form';
import { getGlobalCategories, getAllJobs } from '@/data-access';
import { getCurrentUserId } from '@/lib/auth';

export default async function NewSessionPage() {
  const userId = await getCurrentUserId();
  const [categories, jobs] = await Promise.all([getGlobalCategories(userId), getAllJobs(userId)]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-iv-text text-lg font-medium">새 모의면접 세션</h2>
        <p className="text-iv-text3 mt-1 text-sm">세션 정보를 입력하고 모의면접을 시작하세요.</p>
      </div>

      <div className="max-w-lg">
        <SessionCreateForm categories={categories} jobs={jobs} />
      </div>
    </div>
  );
}
