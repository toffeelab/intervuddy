import {
  getLibraryQuestions,
  getGlobalCategories,
  getAllJobs,
  getCategoriesByJdId,
  getQuestionsByJdId,
} from '@intervuddy/database';
import { StudyClientShell } from '@/components/study/study-client-shell';
import { getDb } from '@/db';
import { getCurrentUserId } from '@/lib/auth';

interface StudyPageProps {
  searchParams: Promise<{ jdId?: string }>;
}

export default async function StudyPage({ searchParams }: StudyPageProps) {
  const userId = await getCurrentUserId();
  const { jdId } = await searchParams;
  const validJdId = jdId || null;
  const db = getDb();

  const [items, categories, jobs] = await Promise.all([
    validJdId !== null
      ? getQuestionsByJdId(db, userId, validJdId)
      : getLibraryQuestions(db, userId),
    validJdId !== null
      ? getCategoriesByJdId(db, userId, validJdId)
      : getGlobalCategories(db, userId),
    getAllJobs(db, userId),
  ]);
  const allItemIds = items.map((item) => item.id);

  return (
    <StudyClientShell items={items} categories={categories} jobs={jobs} allItemIds={allItemIds} />
  );
}
