'use client';

import { useState, useTransition, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEditStore } from '@/stores/edit-store';
import { updateQuestionAction, updateQuestionKeywordsAction } from '@/actions/question-actions';
import {
  createFollowupAction,
  updateFollowupAction,
  deleteFollowupAction,
} from '@/actions/followup-actions';
import type { InterviewQuestion, InterviewCategory, FollowupQuestion } from '@/data-access/types';

interface Props {
  questions: InterviewQuestion[];
  categories: InterviewCategory[];
}

interface FollowupFormItem {
  id?: number;
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
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-iv-bg3 text-iv-text2 border border-iv-border"
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
        {keywords.length === 0 && (
          <span className="text-xs text-iv-text3">키워드 없음</span>
        )}
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
          className="h-7 text-xs bg-iv-bg border-iv-border"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addKeyword}
          className="shrink-0 h-7 text-xs"
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
        <div key={i} className="border border-iv-border rounded-lg p-3 bg-iv-bg relative">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-2 right-2 text-iv-text3 hover:text-iv-red transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
          <div className="flex flex-col gap-2 pr-6">
            <div>
              <label className="text-xs text-iv-text3 mb-1 block">질문</label>
              <Textarea
                value={f.question}
                onChange={(e) => update(i, 'question', e.target.value)}
                rows={2}
                className="text-xs bg-iv-bg2 border-iv-border resize-none"
                placeholder="꼬리 질문"
              />
            </div>
            <div>
              <label className="text-xs text-iv-text3 mb-1 block">답변</label>
              <Textarea
                value={f.answer}
                onChange={(e) => update(i, 'answer', e.target.value)}
                rows={2}
                className="text-xs bg-iv-bg2 border-iv-border resize-none"
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
        className="self-start h-7 text-xs border-iv-border text-iv-text2"
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

    startTransition(async () => {
      // Update question fields (including categoryId if changed)
      await updateQuestionAction({
        id: question.id,
        ...(formCategoryId !== question.categoryId && { categoryId: formCategoryId }),
        question: formQuestion,
        answer: formAnswer,
        tip: formTip || null,
      });

      // Save keywords
      await updateQuestionKeywordsAction(question.id, formKeywords);

      // Handle followups: sync existing and new
      const originalFollowupIds = new Set(question.followups.map((f) => f.id));
      const keepIds = new Set(formFollowups.filter((f) => f.id).map((f) => f.id as number));

      // Delete removed followups
      for (const f of question.followups) {
        if (!keepIds.has(f.id)) {
          await deleteFollowupAction(f.id);
        }
      }

      // Update or create followups
      for (const f of formFollowups) {
        if (f.id && originalFollowupIds.has(f.id)) {
          await updateFollowupAction({ id: f.id, question: f.question, answer: f.answer });
        } else if (!f.id) {
          await createFollowupAction({
            questionId: question.id,
            question: f.question,
            answer: f.answer,
          });
        }
      }

      closeDrawer();
    });
  }

  if (!question) return null;

  return (
    <Drawer open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()} direction="right">
      <DrawerContent className="w-full sm:max-w-lg flex flex-col bg-iv-bg border-iv-border">
        <DrawerHeader className="border-b border-iv-border px-5 py-4">
          <DrawerTitle className="text-iv-text text-sm font-medium">질문 편집</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Category */}
          <div>
            <label className="text-xs text-iv-text3 mb-1.5 block font-medium">카테고리</label>
            <select
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(Number(e.target.value))}
              className="w-full h-8 rounded-lg border border-iv-border bg-iv-bg2 px-2.5 text-sm text-iv-text focus:outline-none focus:border-iv-accent"
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
            <label className="text-xs text-iv-text3 mb-1.5 block font-medium">질문</label>
            <Textarea
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              rows={3}
              className="bg-iv-bg2 border-iv-border resize-none text-sm text-iv-text"
              placeholder="면접 질문을 입력하세요"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="text-xs text-iv-text3 mb-1.5 block font-medium">답변</label>
            <Textarea
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              rows={5}
              className="bg-iv-bg2 border-iv-border resize-none text-sm text-iv-text"
              placeholder="답변을 입력하세요"
            />
          </div>

          {/* Tip */}
          <div>
            <label className="text-xs text-iv-text3 mb-1.5 block font-medium">팁 (선택)</label>
            <Textarea
              value={formTip}
              onChange={(e) => setFormTip(e.target.value)}
              rows={2}
              className="bg-iv-bg2 border-iv-border resize-none text-sm text-iv-text"
              placeholder="답변 팁이나 포인트"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs text-iv-text3 mb-1.5 block font-medium">키워드</label>
            <KeywordEditor keywords={formKeywords} onChange={setFormKeywords} />
          </div>

          {/* Followups */}
          <div>
            <label className="text-xs text-iv-text3 mb-1.5 block font-medium">꼬리 질문</label>
            <FollowupEditor followups={formFollowups} onChange={setFormFollowups} />
          </div>
        </div>

        <DrawerFooter className="border-t border-iv-border px-5 py-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={closeDrawer} disabled={isPending}
              className="border-iv-border text-iv-text2">
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
