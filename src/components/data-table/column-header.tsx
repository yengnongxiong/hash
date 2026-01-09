"use client";

import { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const handleSort = () => {
    const currentSort = column.getIsSorted();
    if (currentSort === false) {
      // unsorted -> asc
      column.toggleSorting(false);
    } else if (currentSort === "asc") {
      // asc -> desc
      column.toggleSorting(true);
    } else {
      // desc -> unsorted (clear)
      column.clearSorting();
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={handleSort}
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4 shrink-0" />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4 shrink-0" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 shrink-0" />
        )}
      </Button>
    </div>
  );
}
