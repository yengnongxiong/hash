"use client";

import { useMemo } from "react";
import { WhiteboardTask, User } from "@/types/database";
import { ColumnDef, FilterFn, Row } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WhiteboardTableProps {
  tasks: WhiteboardTask[];
  onTaskClick: (task: WhiteboardTask) => void;
  onDeleteTasks: (tasks: WhiteboardTask[]) => void;
  onStatusChange?: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void;
  teamMembers?: Pick<User, "id" | "name" | "email">[];
}

const STATUS_CONFIG = {
  todo: { label: "To Do", variant: "outline" as const, className: "border-yellow-500 text-yellow-600 dark:text-yellow-400", textClass: "text-yellow-600 dark:text-yellow-400" },
  in_progress: { label: "In Progress", variant: "outline" as const, className: "border-blue-500 text-blue-600 dark:text-blue-400", textClass: "text-blue-600 dark:text-blue-400" },
  done: { label: "Done", variant: "outline" as const, className: "border-green-500 text-green-600 dark:text-green-400", textClass: "text-green-600 dark:text-green-400" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  medium: { label: "Medium", className: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function createColumns(
  teamMembers: Pick<User, "id" | "name" | "email">[],
  onStatusChange?: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void
): ColumnDef<WhiteboardTask>[] {
  return [
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
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => {
        const color = row.original.color || "#3b82f6";
        return (
          <div className="flex items-start gap-2 max-w-[300px] min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="font-medium truncate block">{row.getValue("title")}</span>
              {row.original.description && (
                <span className="text-xs text-muted-foreground truncate block">
                  {row.original.description}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as keyof typeof STATUS_CONFIG;
        const taskId = row.original.id;

        if (onStatusChange) {
          return (
            <Select
              value={status}
              onValueChange={(value) => {
                onStatusChange(taskId, value as "todo" | "in_progress" | "done");
              }}
            >
              <SelectTrigger
                className="h-8 w-[115px] text-xs px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue>
                  <span className={cn("text-xs font-medium", STATUS_CONFIG[status].textClass)}>
                    {STATUS_CONFIG[status].label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className={cn("text-xs font-medium", config.textClass)}>
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        const config = STATUS_CONFIG[status];
        return (
          <Badge variant={config.variant} className={config.className}>
            {config.label}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as keyof typeof PRIORITY_CONFIG;
        const config = PRIORITY_CONFIG[priority];
        return (
          <Badge variant="secondary" className={config.className}>
            {config.label}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => {
        const dueDate = row.getValue("due_date") as string | null;
        const status = row.original.status;

        if (!dueDate) {
          return <span className="text-muted-foreground">-</span>;
        }

        const date = new Date(dueDate);
        const isOverdue = isPast(date) && !isToday(date) && status !== "done";
        const isDueToday = isToday(date) && status !== "done";

        return (
          <div
            className={cn(
              "flex items-center gap-1.5",
              isOverdue && "text-red-600 dark:text-red-400",
              isDueToday && "text-orange-600 dark:text-orange-400"
            )}
          >
            {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(date, "MMM d, yyyy")}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "assigned_to_ids",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assignees" />
      ),
      cell: ({ row }) => {
        const assignedToIds = row.original.assigned_to_ids || [];

        // Fallback to single assigned_to if assigned_to_ids is empty
        if (assignedToIds.length === 0) {
          const assignedTo = row.original.assigned_to;
          if (!assignedTo) {
            return <span className="text-muted-foreground">Unassigned</span>;
          }
          const assignee = teamMembers.find((m) => m.id === assignedTo);
          if (!assignee) {
            return <span className="text-muted-foreground">Unknown</span>;
          }
          const displayName = assignee.name || assignee.email;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{displayName}</span>
            </div>
          );
        }

        const assignees = teamMembers.filter((m) => assignedToIds.includes(m.id));

        if (assignees.length === 0) {
          return <span className="text-muted-foreground">Unknown</span>;
        }

        if (assignees.length === 1) {
          const displayName = assignees[0].name || assignees[0].email;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{displayName}</span>
            </div>
          );
        }

        // Multiple assignees - show stacked avatars
        return (
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(assignee.name || assignee.email)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {assignees.length > 3 ? (
              <span className="ml-2 text-sm text-muted-foreground">+{assignees.length - 3}</span>
            ) : (
              <span className="ml-2 text-sm text-muted-foreground">{assignees.length} people</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue("created_at") as string | null;
        if (!createdAt) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" />
      ),
      cell: ({ row }) => {
        const updatedAt = row.getValue("updated_at") as string | null;
        if (!updatedAt) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row, table }) => {
        const task = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              (table.options.meta as { onViewCustomer?: (task: WhiteboardTask) => void })?.onViewCustomer?.(task);
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

export function WhiteboardTable({
  tasks,
  onTaskClick,
  onDeleteTasks,
  onStatusChange,
  teamMembers = [],
}: WhiteboardTableProps) {
  const columns = createColumns(teamMembers, onStatusChange);

  const filterableColumns = [
    {
      id: "status",
      title: "Status",
      options: [
        { label: "To Do", value: "todo" },
        { label: "In Progress", value: "in_progress" },
        { label: "Done", value: "done" },
      ],
    },
    {
      id: "priority",
      title: "Priority",
      options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
    },
  ];

  // Pre-sort tasks by most recently updated (default order)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = new Date(a.updated_at).getTime();
    const dateB = new Date(b.updated_at).getTime();
    return dateB - dateA; // Most recent first
  });

  // Create global filter function that searches across all fields
  const globalFilterFn: FilterFn<WhiteboardTask> = useMemo(() => {
    return (row: Row<WhiteboardTask>, _columnId: string, filterValue: string) => {
      const task = row.original;
      const search = filterValue.toLowerCase();

      // Search in title
      if (task.title.toLowerCase().includes(search)) return true;

      // Search in description
      if (task.description?.toLowerCase().includes(search)) return true;

      // Search in status (label)
      const statusLabel = STATUS_CONFIG[task.status]?.label || "";
      if (statusLabel.toLowerCase().includes(search)) return true;

      // Search in priority (label)
      const priorityLabel = PRIORITY_CONFIG[task.priority || "medium"]?.label || "";
      if (priorityLabel.toLowerCase().includes(search)) return true;

      // Search in due date (formatted)
      if (task.due_date) {
        const formattedDate = format(new Date(task.due_date), "MMM d, yyyy");
        if (formattedDate.toLowerCase().includes(search)) return true;
        // Also search in ISO format
        if (task.due_date.toLowerCase().includes(search)) return true;
      }

      // Search in labels
      if (task.labels?.some((label) => label.toLowerCase().includes(search))) return true;

      // Search in assignee names/emails
      const assignedToIds = task.assigned_to_ids || [];
      const assignedTo = task.assigned_to;

      // Check assigned_to_ids
      for (const id of assignedToIds) {
        const member = teamMembers.find((m) => m.id === id);
        if (member) {
          if (member.name?.toLowerCase().includes(search)) return true;
          if (member.email.toLowerCase().includes(search)) return true;
        }
      }

      // Check legacy assigned_to
      if (assignedTo) {
        const member = teamMembers.find((m) => m.id === assignedTo);
        if (member) {
          if (member.name?.toLowerCase().includes(search)) return true;
          if (member.email.toLowerCase().includes(search)) return true;
        }
      }

      // Search "unassigned" text
      if (assignedToIds.length === 0 && !assignedTo && "unassigned".includes(search)) return true;

      return false;
    };
  }, [teamMembers]);

  return (
    <DataTable
      columns={columns}
      data={sortedTasks}
      searchKey="title"
      searchPlaceholder="Search tasks..."
      onViewRow={onTaskClick}
      onRowDelete={onDeleteTasks}
      filterableColumns={filterableColumns}
      globalFilterFn={globalFilterFn}
    />
  );
}
