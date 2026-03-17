import { getAllQAItems, getCategories } from '@/data-access';
import { InterviewHeader } from '@/components/interview/interview-header';
import { Sidebar } from '@/components/interview/sidebar';
import { SearchInput } from '@/components/interview/search-input';
import { QAList } from '@/components/interview/qa-list';

export default function InterviewPage() {
  const items = getAllQAItems();
  const categories = getCategories();

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
