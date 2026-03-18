import { FolderOpen } from 'lucide-react';

export default function InterviewsPage() {
  return (
    <div className="text-iv-text2 flex h-full min-h-[60vh] flex-col items-center justify-center gap-4">
      <FolderOpen className="size-12 opacity-30" />
      <div className="text-center">
        <p className="text-iv-text text-lg font-medium opacity-60">JD 관리 페이지</p>
        <p className="mt-1 text-sm opacity-50">준비 중입니다.</p>
      </div>
    </div>
  );
}
