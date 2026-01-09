"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Customer, PersonTag, CustomerWithUserInfo } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { EditableCell } from "@/components/data-table/editable-cell";
import { formatDistanceToNow } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { ColoredTagsDisplay } from "./tag-selector";
import { cn } from "@/lib/utils";

export function createCustomerColumns(personTags: PersonTag[]): ColumnDef<CustomerWithUserInfo>[] {
  return [
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
    cell: (props) => <EditableCell {...props} truncate emptyLabel="name" />,
  },
  {
    accessorKey: "company",
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: (props) => <EditableCell {...props} truncate emptyLabel="company" />,
  },
  {
    accessorKey: "email",
    size: 80,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: (props) => <EditableCell {...props} truncate emptyLabel="email" />,
  },
  {
    accessorKey: "phone",
    size: 90,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: (props) => <EditableCell {...props} truncate emptyLabel="phone" />,
  },
  {
    accessorKey: "address",
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Address" />
    ),
    cell: (props) => <EditableCell {...props} truncate emptyLabel="address" />,
  },
  {
    accessorKey: "tags",
    size: 120,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tags" />
    ),
    cell: ({ getValue }) => {
      const tags = getValue() as string[] | null;
      if (!tags || tags.length === 0) {
        return (
          <span className="text-muted-foreground italic text-sm px-2">No tags</span>
        );
      }
      return (
        <div className="px-2 py-1">
          <ColoredTagsDisplay tags={tags} personTags={personTags} maxDisplay={2} size="sm" />
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const tags = row.getValue(id) as string[];
      return tags?.some((tag) =>
        tag.toLowerCase().includes(value.toLowerCase())
      );
    },
  },
  {
    accessorKey: "notes",
    size: 150,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notes" />
    ),
    cell: ({ getValue }) => {
      const notes = getValue() as string | null;
      if (!notes) {
        return (
          <span className="text-muted-foreground italic text-sm px-2">No notes</span>
        );
      }
      return (
        <span className="text-sm truncate block max-w-[150px]" title={notes}>
          {notes}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
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
    accessorKey: "updated_at",
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
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
            (table.options.meta as { onViewCustomer?: (customer: CustomerWithUserInfo) => void })?.onViewCustomer?.(customer);
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
}
