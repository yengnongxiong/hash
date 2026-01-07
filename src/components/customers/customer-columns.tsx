"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Customer } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import {
  EditableCell,
  EditableTagsCell,
  EditableNotesCell,
} from "@/components/data-table/editable-cell";
import { formatDistanceToNow } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

export const customerColumns: ColumnDef<Customer>[] = [
  {
    id: "select",
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "customer_number",
    size: 80,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      return (
        <Badge variant="outline" className="font-mono text-xs">
          {value || "—"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "name",
    size: 120,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: (props) => <EditableCell {...props} truncate />,
  },
  {
    accessorKey: "company",
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: (props) => <EditableCell {...props} truncate />,
  },
  {
    accessorKey: "email",
    size: 80,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: (props) => <EditableCell {...props} type="email" truncate />,
  },
  {
    accessorKey: "phone",
    size: 90,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: (props) => <EditableCell {...props} type="phone" truncate />,
  },
  {
    accessorKey: "address",
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Address" />
    ),
    cell: (props) => <EditableCell {...props} truncate />,
  },
  {
    accessorKey: "tags",
    size: 90,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tags" />
    ),
    cell: (props) => <EditableTagsCell {...props} />,
    filterFn: (row, id, value) => {
      const tags = row.getValue(id) as string[];
      return tags?.some((tag) =>
        tag.toLowerCase().includes(value.toLowerCase())
      );
    },
  },
  {
    accessorKey: "notes",
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notes" />
    ),
    cell: (props) => <EditableNotesCell {...props} />,
  },
  {
    accessorKey: "updated_at",
    size: 80,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Edited" />
    ),
    cell: ({ getValue }) => {
      const date = getValue() as string;
      return (
        <span className="text-muted-foreground text-sm truncate block">
          {formatDistanceToNow(new Date(date))}
        </span>
      );
    },
  },
  {
    id: "actions",
    size: 60,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => {
      const customer = row.original;
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            (table.options.meta as { onViewCustomer?: (customer: Customer) => void })?.onViewCustomer?.(customer);
          }}
        >
          View
        </Button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
