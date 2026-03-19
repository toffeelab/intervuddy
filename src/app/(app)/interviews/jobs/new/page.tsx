import { JobForm } from '@/components/interviews/job-form';

export default function NewJobPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-iv-text text-lg font-medium">채용공고 추가</h2>
        <p className="text-iv-text3 mt-1 text-sm">면접 준비할 회사와 포지션 정보를 입력하세요.</p>
      </div>
      <JobForm />
    </div>
  );
}
