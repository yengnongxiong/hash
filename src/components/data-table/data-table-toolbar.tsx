"use client";

import { Table } from "@tanstack/react-table";
import { X, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string }[];
  }[];
  selectedRowCount?: number;
  onDeleteSelected?: () => void;
  onUnselectAll?: () => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Search...",
  filterableColumns = [],
  selectedRowCount = 0,
  onDeleteSelected,
  onUnselectAll,
  globalFilter,
  onGlobalFilterChange,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || (globalFilter && globalFilter.length > 0);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Use global filter if available, otherwise fall back to column filter */}
        {onGlobalFilterChange ? (
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        ) : searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filterableColumns.map((column) => {
          const tableColumn = table.getColumn(column.id);
          if (!tableColumn) return null;

          return (
            <select
              key={column.id}
              value={(tableColumn.getFilterValue() as string) ?? ""}
              onChange={(e) =>
                tableColumn.setFilterValue(e.target.value || undefined)
              }
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All {column.title}</option>
              {column.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              if (onGlobalFilterChange) {
                onGlobalFilterChange("");
              }
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {selectedRowCount > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onUnselectAll}
              className="h-8"
            >
              <X className="mr-2 h-4 w-4" />
              Unselect
            </Button>
            {onDeleteSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteSelected}
                className="h-8"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedRowCount})
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
