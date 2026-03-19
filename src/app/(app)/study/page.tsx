import { StudyClientShell } from '@/components/study/study-client-shell';
import { getLibraryQuestions, getGlobalCategories, getAllJobs } from '@/data-access';
import { getCategoriesByJdId } from '@/data-access/categories';
import { getQuestionsByJdId } from '@/data-access/questions';

interface StudyPageProps {
  searchParams: Promise<{ jdId?: string }>;
}

export default async function StudyPage({ searchParams }: StudyPageProps) {
  const { jdId } = await searchParams;
  const jdIdNum = jdId ? Number(jdId) : null;

  const items =
    jdIdNum !== null && !Number.isNaN(jdIdNum)
      ? getQuestionsByJdId(jdIdNum)
      : getLibraryQuestions();

  const categories =
    jdIdNum !== null && !Number.isNaN(jdIdNum)
      ? getCategoriesByJdId(jdIdNum)
      : getGlobalCategories();

  const jobs = getAllJobs();
  const allItemIds = items.map((item) => item.id);

  return (
    <StudyClientShell items={items} categories={categories} jobs={jobs} allItemIds={allItemIds} />
  );
}
