"use client";

import * as React from "react";
import { CellContext } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";

interface EditableCellProps<TData> extends CellContext<TData, unknown> {
  type?: "text" | "email" | "phone" | "textarea";
  truncate?: boolean;
  maxWidth?: string;
}

export function EditableCell<TData>({
  getValue,
  row,
  column,
  table,
  type = "text",
  truncate = false,
  maxWidth = "200px",
}: EditableCellProps<TData>) {
  const initialValue = getValue() as string;
  const [value, setValue] = React.useState(initialValue ?? "");
  const [isEditing, setIsEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync with external changes
  React.useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const onBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      // Call the update function from table meta
      (table.options.meta as { updateData?: (rowIndex: number, columnId: string, value: unknown) => void })?.updateData?.(
        row.index,
        column.id,
        value
      );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onBlur();
    } else if (e.key === "Escape") {
      setValue(initialValue ?? "");
      setIsEditing(false);
    } else if (e.key === "Tab") {
      // Let the default Tab behavior happen, but save first
      onBlur();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        type={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
        className="h-8 w-full min-w-[100px]"
      />
    );
  }

  return (
    <div
      className="cursor-pointer px-2 py-1.5 min-h-[32px] min-w-[60px] hover:bg-muted/50 rounded transition-colors flex items-center overflow-hidden"
      style={truncate ? { maxWidth } : undefined}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      tabIndex={0}
      role="button"
    >
      {value ? (
        <span className={truncate ? "truncate block" : ""}>{value}</span>
      ) : (
        <span className="text-muted-foreground italic">Empty</span>
      )}
    </div>
  );
}

// Variant for tags (array of strings)
interface EditableTagsCellProps<TData> extends CellContext<TData, unknown> {}

export function EditableTagsCell<TData>({
  getValue,
  row,
  column,
  table,
}: EditableTagsCellProps<TData>) {
  const initialValue = getValue() as string[];
  const [value, setValue] = React.useState(initialValue?.join(", ") ?? "");
  const [isEditing, setIsEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setValue(initialValue?.join(", ") ?? "");
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const onBlur = () => {
    setIsEditing(false);
    const newTags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (JSON.stringify(newTags) !== JSON.stringify(initialValue)) {
      (table.options.meta as { updateData?: (rowIndex: number, columnId: string, value: unknown) => void })?.updateData?.(
        row.index,
        column.id,
        newTags
      );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onBlur();
    } else if (e.key === "Escape") {
      setValue(initialValue?.join(", ") ?? "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder="tag1, tag2, tag3"
        className="h-8 w-full min-w-[150px]"
      />
    );
  }

  const displayTags = initialValue?.slice(0, 2) || [];
  const remainingCount = (initialValue?.length || 0) - 2;

  return (
    <div
      className="cursor-pointer px-2 py-1.5 min-h-[32px] max-w-[120px] hover:bg-muted/50 rounded transition-colors flex items-center gap-1 flex-wrap overflow-hidden"
      onClick={() => setIsEditing(true)}
      tabIndex={0}
      role="button"
    >
      {initialValue && initialValue.length > 0 ? (
        <>
          {displayTags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary truncate max-w-[50px]"
            >
              {tag}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-muted-foreground">+{remainingCount}</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground italic">No tags</span>
      )}
    </div>
  );
}

// Variant for notes (multiline text)
interface EditableNotesCellProps<TData> extends CellContext<TData, unknown> {}

export function EditableNotesCell<TData>({
  getValue,
  row,
  column,
  table,
}: EditableNotesCellProps<TData>) {
  const initialValue = getValue() as string;
  const [value, setValue] = React.useState(initialValue ?? "");
  const [isEditing, setIsEditing] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const onBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      (table.options.meta as { updateData?: (rowIndex: number, columnId: string, value: unknown) => void })?.updateData?.(
        row.index,
        column.id,
        value
      );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setValue(initialValue ?? "");
      setIsEditing(false);
    }
    // Allow Enter for new lines, Cmd/Ctrl+Enter to save
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onBlur();
    }
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="w-full min-w-[200px] min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
        placeholder="Add notes..."
      />
    );
  }

  return (
    <div
      className="cursor-pointer px-2 py-1.5 min-h-[32px] max-w-[150px] hover:bg-muted/50 rounded transition-colors overflow-hidden"
      onClick={() => setIsEditing(true)}
      tabIndex={0}
      role="button"
    >
      {value ? (
        <span className="line-clamp-1 truncate block">{value}</span>
      ) : (
        <span className="text-muted-foreground italic">No notes</span>
      )}
    </div>
  );
}
