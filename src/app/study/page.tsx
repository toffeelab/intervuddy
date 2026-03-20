import { StudyClientShell } from '@/components/study/study-client-shell';
import { getLibraryQuestions, getGlobalCategories, getAllJobs } from '@/data-access';
import { getCategoriesByJdId } from '@/data-access/categories';
import { getQuestionsByJdId } from '@/data-access/questions';
import { getCurrentUserId } from '@/lib/auth';

interface StudyPageProps {
  searchParams: Promise<{ jdId?: string }>;
}

export default async function StudyPage({ searchParams }: StudyPageProps) {
  const userId = await getCurrentUserId();
  const { jdId } = await searchParams;
  const validJdId = jdId || null;

  const [items, categories, jobs] = await Promise.all([
    validJdId !== null
      ? getQuestionsByJdId(userId, validJdId)
      : getLibraryQuestions(userId),
    validJdId !== null
      ? getCategoriesByJdId(userId, validJdId)
      : getGlobalCategories(userId),
    getAllJobs(userId),
  ]);
  const allItemIds = items.map((item) => item.id);

  return (
    <StudyClientShell items={items} categories={categories} jobs={jobs} allItemIds={allItemIds} />
  );
}
