'use client';

import { useState } from 'react';
import { QAList } from '@/components/study/qa-list';
import { SearchInput } from '@/components/study/search-input';
import { MobileSidebar, Sidebar } from '@/components/study/sidebar';
import { StudyPageHeader } from '@/components/study/study-page-header';
import type { InterviewCategory, InterviewQuestion, JobDescription } from '@/data-access/types';

interface Props {
  items: InterviewQuestion[];
  categories: InterviewCategory[];
  jobs: JobDescription[];
  allItemIds: number[];
}

export function StudyClientShell({ items, categories, jobs, allItemIds }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <StudyPageHeader
        totalCount={items.length}
        allItemIds={allItemIds}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div className="min-h-[calc(100vh-57px)] md:grid md:grid-cols-[230px_1fr]">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar categories={categories} jobs={jobs} />
        </div>

        {/* Mobile sidebar drawer */}
        <MobileSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          categories={categories}
          jobs={jobs}
        />

        <main className="overflow-y-auto p-4 md:p-6">
          <SearchInput />
          <QAList items={items} />
        </main>
      </div>
    </>
  );
}
