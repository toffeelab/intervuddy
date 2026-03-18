import { getLibraryQuestions, getGlobalCategories } from '@/data-access';
import { InterviewHeader } from '@/components/study/interview-header';
import { Sidebar } from '@/components/study/sidebar';
import { SearchInput } from '@/components/study/search-input';
import { QAList } from '@/components/study/qa-list';

export default function StudyPage() {
  const items = getLibraryQuestions();
  const categories = getGlobalCategories();

  const allItemIds = items.map((item) => item.id);

  return (
    <div className="min-h-screen bg-iv-bg text-iv-text">
      <InterviewHeader totalCount={items.length} allItemIds={allItemIds} />
      <div className="grid grid-cols-[230px_1fr] min-h-[calc(100vh-57px)]">
        <Sidebar categories={categories} />
        <main className="p-6 overflow-y-auto">
          <SearchInput />
          <QAList items={items} />
        </main>
      </div>
    </div>
  );
}
