'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/actions/category-actions';
import type { InterviewCategory } from '@/data-access/types';

interface Props {
  categories: InterviewCategory[];
}

interface CategoryRowProps {
  category: InterviewCategory;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-가-힣]/g, '')
    .slice(0, 50);
}

function CategoryRow({ category }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editDisplayLabel, setEditDisplayLabel] = useState(category.displayLabel);
  const [editIcon, setEditIcon] = useState(category.icon);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateCategoryAction(category.id, {
          name: editName,
          displayLabel: editDisplayLabel,
          icon: editIcon,
          slug: slugify(editName),
        });
        setError(null);
        setEditing(false);
      } catch {
        setError('저장에 실패했습니다');
      }
    });
  }

  function handleCancel() {
    setEditName(category.name);
    setEditDisplayLabel(category.displayLabel);
    setEditIcon(category.icon);
    setEditing(false);
  }

  function handleDelete() {
    if (!confirm(`"${category.displayLabel}" 카테고리를 삭제하시겠습니까?\n질문이 ${category.questionCount}개 있습니다.`)) return;
    startTransition(async () => {
      try {
        await deleteCategoryAction(category.id);
      } catch {
        setError('삭제에 실패했습니다');
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-iv-border last:border-b-0 bg-iv-bg3">
        <Input
          value={editIcon}
          onChange={(e) => setEditIcon(e.target.value)}
          className="w-14 h-7 text-center text-sm bg-iv-bg border-iv-border"
          placeholder="아이콘"
        />
        <Input
          value={editDisplayLabel}
          onChange={(e) => setEditDisplayLabel(e.target.value)}
          className="flex-1 h-7 text-sm bg-iv-bg border-iv-border"
          placeholder="표시 이름"
        />
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 h-7 text-sm bg-iv-bg border-iv-border text-iv-text3"
          placeholder="내부 이름 (영문)"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleSave}
          disabled={isPending}
          className="text-iv-green hover:text-iv-green hover:bg-iv-green/10"
        >
          <Check className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCancel}
          disabled={isPending}
          className="text-iv-text3"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col border-b border-iv-border last:border-b-0">
      {error && <p className="px-4 pt-2 text-xs text-iv-red">{error}</p>}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-iv-bg3 transition-colors">
      <span className="text-base w-8 text-center shrink-0">{category.icon}</span>
      <span className="text-sm text-iv-text flex-1">{category.displayLabel}</span>
      <span className="text-xs text-iv-text3 font-mono">{category.slug}</span>
      <span className="text-xs text-iv-text3 px-1.5 py-0.5 rounded bg-iv-bg border border-iv-border">
        {category.questionCount}개
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          title="편집"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          title="삭제"
          className="hover:text-iv-red hover:bg-iv-red/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      </div>
    </div>
  );
}

function AddCategoryForm() {
  const [name, setName] = useState('');
  const [displayLabel, setDisplayLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim() || !displayLabel.trim()) return;
    startTransition(async () => {
      try {
        await createCategoryAction({
          name: name.trim(),
          slug: slugify(name.trim()),
          displayLabel: displayLabel.trim(),
          icon: icon.trim() || '📁',
        });
        setName('');
        setDisplayLabel('');
        setIcon('');
        setError(null);
      } catch {
        setError('카테고리 추가에 실패했습니다');
      }
    });
  }

  return (
    <div className={cn('flex flex-col gap-2 px-4 py-3 border-t border-iv-border bg-iv-bg2 rounded-b-lg')}>
      {error && <p className="text-xs text-iv-red">{error}</p>}
      <div className="flex items-center gap-2">
      <Input
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        className="w-14 h-7 text-center text-sm bg-iv-bg border-iv-border"
        placeholder="🗂️"
      />
      <Input
        value={displayLabel}
        onChange={(e) => setDisplayLabel(e.target.value)}
        className="flex-1 h-7 text-sm bg-iv-bg border-iv-border"
        placeholder="표시 이름"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 h-7 text-sm bg-iv-bg border-iv-border text-iv-text3"
        placeholder="내부 이름 (영문)"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={isPending || !name.trim() || !displayLabel.trim()}
        className="h-7 text-xs shrink-0"
      >
        <Plus className="size-3.5" />
        추가
      </Button>
      </div>
    </div>
  );
}

export function CategoryManager({ categories }: Props) {
  return (
    <div className="border border-iv-border rounded-lg overflow-hidden">
      {/* Column Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-iv-bg2 border-b border-iv-border text-xs text-iv-text3">
        <span className="w-8 shrink-0 text-center">아이콘</span>
        <span className="flex-1">표시 이름</span>
        <span className="text-right">슬러그</span>
        <span className="w-14 text-right">질문 수</span>
        <span className="w-16" />
      </div>

      {/* Category Rows */}
      {categories.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-iv-text3">
          등록된 카테고리가 없습니다.
        </div>
      ) : (
        <div className="bg-iv-bg">
          {categories.map((cat) => (
            <CategoryRow key={cat.id} category={cat} />
          ))}
        </div>
      )}

      {/* Add Form */}
      <AddCategoryForm />
    </div>
  );
}
