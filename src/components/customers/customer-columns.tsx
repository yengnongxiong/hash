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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: (props) => <EditableCell {...props} truncate maxWidth="150px" />,
  },
  {
    accessorKey: "company",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: (props) => <EditableCell {...props} truncate maxWidth="120px" />,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: (props) => <EditableCell {...props} type="email" truncate maxWidth="150px" />,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: (props) => <EditableCell {...props} type="phone" truncate maxWidth="110px" />,
  },
  {
    accessorKey: "address",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Address" />
    ),
    cell: (props) => <EditableCell {...props} truncate maxWidth="150px" />,
  },
  {
    accessorKey: "tags",
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notes" />
    ),
    cell: (props) => <EditableNotesCell {...props} />,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Edited" />
    ),
    cell: ({ getValue }) => {
      const date = getValue() as string;
      return (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(date))}
        </span>
      );
    },
  },
  {
    id: "actions",
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
