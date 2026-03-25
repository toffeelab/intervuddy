'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { InterviewCategory, JobDescription, SessionRole } from '@intervuddy/shared';
import { createSessionAction } from '@/actions/session-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Props {
  categories: InterviewCategory[];
  jobs: JobDescription[];
}

const roleOptions: { value: SessionRole; label: string; description: string }[] = [
  { value: 'interviewer', label: '면접관', description: '질문을 출제하고 피드백을 제공합니다' },
  { value: 'interviewee', label: '지원자', description: '질문에 답변하며 면접을 연습합니다' },
];

export function SessionCreateForm({ categories, jobs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [role, setRole] = useState<SessionRole>('interviewee');
  const [jdId, setJdId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      try {
        const result = await createSessionAction({
          title: title.trim(),
          role,
          jdId,
          categoryId,
        });
        router.push(`/interviews/sessions/${result.id}`);
      } catch {
        setError('세션 생성에 실패했습니다. 다시 시도해주세요.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="session-title" className="text-iv-text text-sm font-medium">
          세션 제목 <span className="text-iv-red">*</span>
        </label>
        <Input
          id="session-title"
          placeholder="예: 프론트엔드 개발자 모의면접"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>

      {/* Role */}
      <div className="space-y-2">
        <span className="text-iv-text text-sm font-medium">내 역할</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                role === option.value
                  ? 'border-iv-accent bg-iv-accent/5'
                  : 'border-iv-border bg-iv-bg hover:bg-iv-bg3'
              )}
            >
              <span
                className={cn(
                  'text-sm font-medium',
                  role === option.value ? 'text-iv-accent' : 'text-iv-text'
                )}
              >
                {option.label}
              </span>
              <p className="text-iv-text3 mt-0.5 text-xs">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* JD Selection */}
      <div className="space-y-2">
        <label className="text-iv-text text-sm font-medium">채용공고 (선택)</label>
        <Select value={jdId ?? ''} onValueChange={(v) => setJdId(v || null)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="선택 안 함" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="">선택 안 함</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.companyName} — {job.positionTitle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <label className="text-iv-text text-sm font-medium">카테고리 (선택)</label>
        <Select
          value={categoryId !== null ? String(categoryId) : ''}
          onValueChange={(v) => setCategoryId(v ? Number(v) : null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="선택 안 함" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="">선택 안 함</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.displayLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-iv-red text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={!title.trim() || isPending}>
          {isPending ? '생성 중...' : '세션 만들기'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  );
}
