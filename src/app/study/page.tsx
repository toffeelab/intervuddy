import { InterviewHeader } from '@/components/study/interview-header';
import { QAList } from '@/components/study/qa-list';
import { SearchInput } from '@/components/study/search-input';
import { Sidebar } from '@/components/study/sidebar';
import { getLibraryQuestions, getGlobalCategories } from '@/data-access';

export default function StudyPage() {
  const items = getLibraryQuestions();
  const categories = getGlobalCategories();

  const allItemIds = items.map((item) => item.id);

  return (
    <div className="bg-iv-bg text-iv-text min-h-screen">
      <InterviewHeader totalCount={items.length} allItemIds={allItemIds} />
      <div className="grid min-h-[calc(100vh-57px)] grid-cols-[230px_1fr]">
        <Sidebar categories={categories} />
        <main className="overflow-y-auto p-6">
          <SearchInput />
          <QAList items={items} />
        </main>
      </div>
    </div>
  );
}
