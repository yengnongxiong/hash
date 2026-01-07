"use client";

import { CellContext } from "@tanstack/react-table";

interface EditableCellProps<TData> extends CellContext<TData, unknown> {
  type?: "text" | "email" | "phone" | "textarea";
  truncate?: boolean;
  emptyLabel?: string;
}

export function EditableCell<TData>({
  getValue,
  truncate = false,
  emptyLabel = "Empty",
}: EditableCellProps<TData>) {
  const value = getValue() as string;

  return (
    <div className="px-2 py-1.5 min-h-[32px] flex items-center overflow-hidden w-full">
      {value ? (
        <span className={truncate ? "truncate block w-full" : ""}>{value}</span>
      ) : (
        <span className="text-muted-foreground italic">No {emptyLabel.toLowerCase()}</span>
      )}
    </div>
  );
}

// Variant for tags (array of strings)
interface EditableTagsCellProps<TData> extends CellContext<TData, unknown> {}

export function EditableTagsCell<TData>({
  getValue,
}: EditableTagsCellProps<TData>) {
  const tags = getValue() as string[];
  const displayTags = tags?.slice(0, 2) || [];
  const remainingCount = (tags?.length || 0) - 2;

  return (
    <div className="px-2 py-1.5 min-h-[32px] flex items-center gap-1 flex-wrap overflow-hidden w-full">
      {tags && tags.length > 0 ? (
        <>
          {displayTags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary truncate max-w-[60px]"
            >
              {tag}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">+{remainingCount}</span>
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
}: EditableNotesCellProps<TData>) {
  const value = getValue() as string;

  return (
    <div className="px-2 py-1.5 min-h-[32px] overflow-hidden w-full">
      {value ? (
        <span className="truncate block w-full">{value}</span>
      ) : (
        <span className="text-muted-foreground italic">No notes</span>
      )}
    </div>
  );
}
