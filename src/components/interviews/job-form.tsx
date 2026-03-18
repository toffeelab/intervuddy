'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createJobAction, updateJobAction } from '@/actions/job-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { JobDescription } from '@/data-access/types';

interface Props {
  job?: JobDescription;
}

export function JobForm({ job }: Props) {
  const router = useRouter();
  const isEdit = !!job;
  const [companyName, setCompanyName] = useState(job?.companyName ?? '');
  const [positionTitle, setPositionTitle] = useState(job?.positionTitle ?? '');
  const [memo, setMemo] = useState(job?.memo ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !positionTitle.trim()) {
      setError('회사명과 포지션은 필수 입력입니다');
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateJobAction({
            id: job.id,
            companyName: companyName.trim(),
            positionTitle: positionTitle.trim(),
            memo: memo.trim() || null,
          });
          router.push(`/interviews/jobs/${job.id}`);
        } else {
          const result = await createJobAction({
            companyName: companyName.trim(),
            positionTitle: positionTitle.trim(),
            memo: memo.trim() || null,
          });
          router.push(`/interviews/jobs/${result.id}`);
        }
      } catch {
        setError('저장에 실패했습니다. 다시 시도해주세요.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className="text-iv-text3 mb-1.5 block text-xs font-medium">
          회사명 <span className="text-iv-red">*</span>
        </label>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="예: 카카오"
          disabled={isPending}
          className="bg-iv-bg2 border-iv-border"
        />
      </div>

      <div>
        <label className="text-iv-text3 mb-1.5 block text-xs font-medium">
          포지션 <span className="text-iv-red">*</span>
        </label>
        <Input
          value={positionTitle}
          onChange={(e) => setPositionTitle(e.target.value)}
          placeholder="예: 프론트엔드 시니어"
          disabled={isPending}
          className="bg-iv-bg2 border-iv-border"
        />
      </div>

      <div>
        <label className="text-iv-text3 mb-1.5 block text-xs font-medium">메모 (선택)</label>
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="JD에 대한 메모"
          rows={3}
          disabled={isPending}
          className="bg-iv-bg2 border-iv-border resize-none"
        />
      </div>

      {error && <p className="text-iv-red text-xs">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? '저장 중...' : isEdit ? '수정' : '생성'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
          className="border-iv-border text-iv-text2"
        >
          취소
        </Button>
      </div>
    </form>
  );
}
