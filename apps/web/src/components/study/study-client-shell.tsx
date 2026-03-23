'use client';

import { useState } from 'react';
import type { InterviewCategory, InterviewQuestion, JobDescription } from '@intervuddy/shared';
import { QAList } from '@/components/study/qa-list';
import { SearchInput } from '@/components/study/search-input';
import { MobileSidebar, Sidebar } from '@/components/study/sidebar';
import { StudyPageHeader } from '@/components/study/study-page-header';

interface Props {
  items: InterviewQuestion[];
  categories: InterviewCategory[];
  jobs: JobDescription[];
  allItemIds: string[];
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
      <div className="flex flex-1 overflow-hidden">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <SearchInput />
          <QAList items={items} />
        </main>
      </div>
    </>
  );
}
