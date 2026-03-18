import { InterviewHeader } from '@/components/study/interview-header';
import { QAList } from '@/components/study/qa-list';
import { SearchInput } from '@/components/study/search-input';
import { Sidebar } from '@/components/study/sidebar';
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
    <div className="bg-iv-bg text-iv-text min-h-screen">
      <InterviewHeader totalCount={items.length} allItemIds={allItemIds} />
      <div className="grid min-h-[calc(100vh-57px)] grid-cols-[230px_1fr]">
        <Sidebar categories={categories} jobs={jobs} />
        <main className="overflow-y-auto p-6">
          <SearchInput />
          <QAList items={items} />
        </main>
      </div>
    </div>
  );
}
