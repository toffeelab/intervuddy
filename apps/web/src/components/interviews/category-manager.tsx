'use client';

import { useState, useTransition } from 'react';
import type { InterviewCategory } from '@intervuddy/shared';
import { Pencil, Trash2, Check, X, Plus, MoreHorizontal } from 'lucide-react';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/actions/category-actions';
import { useConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
  const { confirm, dialog } = useConfirmDialog();

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
    confirm({
      title: '카테고리 삭제',
      description: `"${category.displayLabel}" 카테고리를 삭제하시겠습니까? 질문이 ${category.questionCount}개 있습니다.`,
      confirmLabel: '삭제',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteCategoryAction(category.id);
          } catch {
            setError('삭제에 실패했습니다');
          }
        });
      },
    });
  }

  if (editing) {
    return (
      <div className="border-iv-border bg-iv-bg3 flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 md:flex-row md:items-center md:gap-2">
        <Input
          value={editIcon}
          onChange={(e) => setEditIcon(e.target.value)}
          className="bg-iv-bg border-iv-border h-7 w-14 text-center text-sm"
          placeholder="아이콘"
        />
        <Input
          value={editDisplayLabel}
          onChange={(e) => setEditDisplayLabel(e.target.value)}
          className="bg-iv-bg border-iv-border h-7 flex-1 text-sm"
          placeholder="표시 이름"
        />
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="bg-iv-bg border-iv-border text-iv-text3 h-7 flex-1 text-sm"
          placeholder="내부 이름 (영문)"
        />
        <div className="flex items-center gap-1">
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
      </div>
    );
  }

  return (
    <div className="border-iv-border flex flex-col border-b last:border-b-0">
      {error && <p className="text-iv-red px-4 pt-2 text-xs">{error}</p>}
      <div className="hover:bg-iv-bg3 flex flex-col gap-1 px-4 py-3 transition-colors md:flex-row md:items-center md:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="w-8 shrink-0 text-center text-base">{category.icon}</span>
          <span className="text-iv-text flex-1 text-sm">{category.displayLabel}</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" title="더보기">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                편집
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-3.5" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 pl-11 md:pl-0">
          <span className="text-iv-text3 font-mono text-xs">{category.slug}</span>
          <span className="text-iv-text3 bg-iv-bg border-iv-border rounded border px-1.5 py-0.5 text-xs">
            {category.questionCount}개
          </span>
        </div>
      </div>
      {dialog}
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
    <div
      className={cn(
        'border-iv-border bg-iv-bg2 flex flex-col gap-2 rounded-b-lg border-t px-4 py-3'
      )}
    >
      {error && <p className="text-iv-red text-xs">{error}</p>}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
        <Input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="bg-iv-bg border-iv-border h-7 w-14 text-center text-sm"
          placeholder="🗂️"
        />
        <Input
          value={displayLabel}
          onChange={(e) => setDisplayLabel(e.target.value)}
          className="bg-iv-bg border-iv-border h-7 flex-1 text-sm"
          placeholder="표시 이름"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-iv-bg border-iv-border text-iv-text3 h-7 flex-1 text-sm"
          placeholder="내부 이름 (영문)"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !name.trim() || !displayLabel.trim()}
          className="h-7 shrink-0 text-xs"
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
    <div className="border-iv-border overflow-hidden rounded-lg border">
      {/* Column Header */}
      <div className="bg-iv-bg2 border-iv-border text-iv-text3 hidden items-center gap-3 border-b px-4 py-2 text-xs md:flex">
        <span className="w-8 shrink-0 text-center">아이콘</span>
        <span className="flex-1">표시 이름</span>
        <span className="text-right">슬러그</span>
        <span className="w-14 text-right">질문 수</span>
        <span className="w-16" />
      </div>

      {/* Category Rows */}
      {categories.length === 0 ? (
        <div className="text-iv-text3 px-4 py-6 text-center text-sm">
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
