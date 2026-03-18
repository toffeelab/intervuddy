import { FolderOpen } from 'lucide-react';

export default function InterviewsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-iv-text2">
      <FolderOpen className="size-12 opacity-30" />
      <div className="text-center">
        <p className="text-lg font-medium text-iv-text opacity-60">JD 관리 페이지</p>
        <p className="text-sm mt-1 opacity-50">준비 중입니다.</p>
      </div>
    </div>
  );
}
