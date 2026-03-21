'use client';

import { useState, useTransition, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  createFollowupAction,
  updateFollowupAction,
  deleteFollowupAction,
} from '@/actions/followup-actions';
import { updateQuestionAction } from '@/actions/question-actions';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { InterviewQuestion, InterviewCategory } from '@/data-access/types';
import { useEditStore } from '@/stores/edit-store';

interface Props {
  questions: InterviewQuestion[];
  categories: InterviewCategory[];
}

interface FollowupFormItem {
  id?: string;
  question: string;
  answer: string;
  isNew?: boolean;
}

function KeywordEditor({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}) {
  const [input, setInput] = useState('');

  function addKeyword() {
    const trimmed = input.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    onChange([...keywords, trimmed]);
    setInput('');
  }

  function removeKeyword(kw: string) {
    onChange(keywords.filter((k) => k !== kw));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-[28px] flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="bg-iv-bg3 text-iv-text2 border-iv-border flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
          >
            {kw}
            <button
              type="button"
              onClick={() => removeKeyword(kw)}
              className="text-iv-text3 hover:text-iv-red transition-colors"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {keywords.length === 0 && <span className="text-iv-text3 text-xs">키워드 없음</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addKeyword();
            }
          }}
          placeholder="키워드 입력 후 Enter"
          className="bg-iv-bg border-iv-border h-7 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addKeyword}
          className="h-7 shrink-0 text-xs"
        >
          <Plus className="size-3" />
          추가
        </Button>
      </div>
    </div>
  );
}

function FollowupEditor({
  followups,
  onChange,
}: {
  followups: FollowupFormItem[];
  onChange: (items: FollowupFormItem[]) => void;
}) {
  function update(index: number, field: 'question' | 'answer', value: string) {
    const next = followups.map((f, i) => (i === index ? { ...f, [field]: value } : f));
    onChange(next);
  }

  function remove(index: number) {
    onChange(followups.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...followups, { question: '', answer: '', isNew: true }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {followups.map((f, i) => (
        <div key={i} className="border-iv-border bg-iv-bg relative rounded-lg border p-3">
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-iv-text3 hover:text-iv-red absolute top-2 right-2 transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
          <div className="flex flex-col gap-2 pr-6">
            <div>
              <label className="text-iv-text3 mb-1 block text-xs">질문</label>
              <Textarea
                value={f.question}
                onChange={(e) => update(i, 'question', e.target.value)}
                rows={2}
                className="bg-iv-bg2 border-iv-border resize-none text-xs"
                placeholder="꼬리 질문"
              />
            </div>
            <div>
              <label className="text-iv-text3 mb-1 block text-xs">답변</label>
              <Textarea
                value={f.answer}
                onChange={(e) => update(i, 'answer', e.target.value)}
                rows={2}
                className="bg-iv-bg2 border-iv-border resize-none text-xs"
                placeholder="답변"
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="border-iv-border text-iv-text2 h-7 self-start text-xs"
      >
        <Plus className="size-3" />
        꼬리 질문 추가
      </Button>
    </div>
  );
}

export function QuestionEditDrawer({ questions, categories }: Props) {
  const { drawerOpen, drawerTargetId, closeDrawer } = useEditStore();
  const [isPending, startTransition] = useTransition();

  const question = questions.find((q) => q.id === drawerTargetId) ?? null;

  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTip, setFormTip] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number>(0);
  const [formKeywords, setFormKeywords] = useState<string[]>([]);
  const [formFollowups, setFormFollowups] = useState<FollowupFormItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setFormQuestion(question.question);
      setFormAnswer(question.answer);
      setFormTip(question.tip ?? '');
      setFormCategoryId(question.categoryId);
      setFormKeywords(question.keywords);
      setFormFollowups(
        question.followups.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        }))
      );
    }
  }, [question]);

  async function handleSave() {
    if (!question) return;

    // Validate required fields
    if (!formQuestion.trim() || !formAnswer.trim()) {
      setError('질문과 답변은 필수 입력입니다');
      return;
    }

    // Filter out empty followups
    const validFollowups = formFollowups.filter((f) => f.question.trim() && f.answer.trim());

    startTransition(async () => {
      try {
        // Update question fields (including categoryId and keywords if changed)
        await updateQuestionAction({
          id: question.id,
          ...(formCategoryId !== question.categoryId && { categoryId: formCategoryId }),
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          tip: formTip.trim() || null,
          keywords: formKeywords,
        });

        // Handle followups: sync existing and new
        const originalFollowupIds = new Set(question.followups.map((f) => f.id));
        const keepIds = new Set(validFollowups.filter((f) => f.id).map((f) => f.id as string));

        // Delete removed followups
        for (const f of question.followups) {
          if (!keepIds.has(f.id)) {
            await deleteFollowupAction(f.id);
          }
        }

        // Update or create followups
        for (const f of validFollowups) {
          if (f.id && originalFollowupIds.has(f.id)) {
            await updateFollowupAction({
              id: f.id,
              question: f.question.trim(),
              answer: f.answer.trim(),
            });
          } else if (!f.id) {
            await createFollowupAction({
              questionId: question.id,
              question: f.question.trim(),
              answer: f.answer.trim(),
            });
          }
        }

        setError(null);
        closeDrawer();
      } catch {
        setError('저장에 실패했습니다. 다시 시도해주세요.');
      }
    });
  }

  if (!question) return null;

  return (
    <Drawer open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()} direction="right">
      <DrawerContent className="bg-iv-bg border-iv-border flex w-full flex-col sm:max-w-lg">
        <DrawerHeader className="border-iv-border border-b px-5 py-4">
          <DrawerTitle className="text-iv-text text-sm font-medium">질문 편집</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Category */}
          <div>
            <label className="text-iv-text3 mb-1.5 block text-xs font-medium">카테고리</label>
            <select
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(Number(e.target.value))}
              className="border-iv-border bg-iv-bg2 text-iv-text focus:border-iv-accent h-8 w-full rounded-lg border px-2.5 text-sm focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.displayLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Question */}
          <div>
            <label className="text-iv-text3 mb-1.5 block text-xs font-medium">질문</label>
            <Textarea
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              rows={3}
              className="bg-iv-bg2 border-iv-border text-iv-text resize-none text-sm"
              placeholder="면접 질문을 입력하세요"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="text-iv-text3 mb-1.5 block text-xs font-medium">답변</label>
            <Textarea
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              rows={5}
              className="bg-iv-bg2 border-iv-border text-iv-text resize-none text-sm"
              placeholder="답변을 입력하세요"
            />
          </div>

          {/* Tip */}
          <div>
            <label className="text-iv-text3 mb-1.5 block text-xs font-medium">팁 (선택)</label>
            <Textarea
              value={formTip}
              onChange={(e) => setFormTip(e.target.value)}
              rows={2}
              className="bg-iv-bg2 border-iv-border text-iv-text resize-none text-sm"
              placeholder="답변 팁이나 포인트"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="text-iv-text3 mb-1.5 block text-xs font-medium">키워드</label>
            <KeywordEditor keywords={formKeywords} onChange={setFormKeywords} />
          </div>

          {/* Followups */}
          <div>
            <label className="text-iv-text3 mb-1.5 block text-xs font-medium">꼬리 질문</label>
            <FollowupEditor followups={formFollowups} onChange={setFormFollowups} />
          </div>
        </div>

        <DrawerFooter className="border-iv-border border-t px-5 py-4">
          {error && <p className="text-iv-red mb-2 text-xs">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={closeDrawer}
              disabled={isPending}
              className="border-iv-border text-iv-text2"
            >
              취소
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
