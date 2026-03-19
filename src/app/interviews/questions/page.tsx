import { CategoryManager } from '@/components/interviews/category-manager';
import { QuestionEditDrawer } from '@/components/interviews/question-edit-drawer';
import { QuestionTable } from '@/components/interviews/question-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getGlobalCategories, getLibraryQuestions } from '@/data-access';

export default function InterviewQuestionsPage() {
  const categories = getGlobalCategories();
  const questions = getLibraryQuestions();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-iv-text text-lg font-medium">공통 라이브러리</h2>
        <p className="text-iv-text3 mt-1 text-sm">
          모든 면접에 공통으로 사용되는 질문과 카테고리를 관리합니다.
        </p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="questions">질문 관리</TabsTrigger>
          <TabsTrigger value="categories">카테고리 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <QuestionTable questions={questions} />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager categories={categories} />
        </TabsContent>
      </Tabs>

      {/* Drawer rendered at page level — receives all questions & categories */}
      <QuestionEditDrawer questions={questions} categories={categories} />
    </div>
  );
}
