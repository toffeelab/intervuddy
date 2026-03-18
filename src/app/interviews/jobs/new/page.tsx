import { JobForm } from '@/components/interviews/job-form';

export default function NewJobPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-iv-text text-lg font-medium">새 JD 만들기</h2>
        <p className="text-iv-text3 mt-1 text-sm">면접 준비할 JD 정보를 입력하세요.</p>
      </div>
      <JobForm />
    </div>
  );
}
