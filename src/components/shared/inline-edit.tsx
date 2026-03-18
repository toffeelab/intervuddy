'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  multiline?: boolean;
  className?: string;
  textClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  multiline = true,
  className,
  textClassName,
  placeholder = '클릭하여 편집...',
  disabled = false,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Keep editValue in sync with prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleStartEdit = useCallback(() => {
    if (disabled || isSaving) return;
    setEditValue(value);
    setError(null);
    setIsEditing(true);
  }, [disabled, isSaving, value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const len = editValue.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing, editValue.length]);

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed === value.trim()) {
      setIsEditing(false);
      return;
    }
    if (!trimmed) {
      setIsEditing(false);
      setEditValue(value);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      setError('저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
        return;
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
        return;
      }
      // For single-line input, Enter also saves
      if (!multiline && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave, multiline]
  );

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  if (!isEditing) {
    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleStartEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleStartEdit();
          }
        }}
        className={cn(
          'cursor-pointer rounded-md px-1 py-0.5 -mx-1',
          'hover:bg-iv-bg2 transition-colors',
          disabled && 'cursor-default hover:bg-transparent',
          isSaving && 'opacity-60 cursor-wait',
          textClassName,
          className
        )}
        title={disabled ? undefined : '클릭하여 편집'}
      >
        {value || <span className="text-iv-text3 italic">{placeholder}</span>}
      </div>
    );
  }

  const sharedProps = {
    value: editValue,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setEditValue(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    disabled: isSaving,
    placeholder,
    className: cn(
      'w-full text-iv-text bg-iv-bg2 border-iv-border',
      'focus-visible:ring-1 focus-visible:ring-iv-border',
      isSaving && 'opacity-60 cursor-wait',
      className
    ),
  };

  return (
    <div className="relative w-full">
      {multiline ? (
        <Textarea
          {...sharedProps}
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
        />
      ) : (
        <Input
          {...sharedProps}
          ref={inputRef as React.Ref<HTMLInputElement>}
        />
      )}
      {error && (
        <p className="mt-1 text-xs text-iv-red">{error}</p>
      )}
      <p className="mt-1 text-xs text-iv-text3">
        {isSaving
          ? '저장 중...'
          : 'Ctrl+Enter로 저장, Esc로 취소'}
      </p>
    </div>
  );
}
