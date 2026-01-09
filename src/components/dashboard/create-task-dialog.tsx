"use client";

import { useState, useTransition } from "react";
import { WhiteboardTask, User } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  User as UserIcon,
  Flag,
  Palette,
  Tag,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createWhiteboardTask } from "@/app/(dashboard)/whiteboard/actions";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: (task: WhiteboardTask) => void;
  organizationId: string;
  teamMembers?: Pick<User, "id" | "name" | "email">[];
  defaultStatus?: "todo" | "in_progress" | "done";
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-slate-400" },
  { value: "medium", label: "Medium", color: "bg-blue-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#64748b", label: "Slate" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
  organizationId,
  teamMembers = [],
  defaultStatus = "todo",
}: CreateTaskDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [peoplePopoverOpen, setPeoplePopoverOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">(defaultStatus);
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [labels, setLabels] = useState<string[]>([]);

  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus(defaultStatus);
    setPriority("medium");
    setDueDate("");
    setColor("#3b82f6");
    setAssignedTo(null);
    setLabels([]);
  };

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Filter team members by search
  const filteredMembers = teamMembers.filter((member) => {
    const search = peopleSearch.toLowerCase();
    return (
      member.name?.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search)
    );
  });

  // Get assignee
  const assignee = teamMembers.find((m) => m.id === assignedTo);

  // Handle create
  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    startTransition(async () => {
      const result = await createWhiteboardTask(organizationId, title.trim(), status, {
        description: description || null,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        color,
        assigned_to: assignedTo,
        labels,
      });

      if (result.error) {
        toast.error("Failed to create task", { description: result.error });
      } else if (result.task) {
        toast.success("Task created");
        onTaskCreated(result.task);
        handleOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your whiteboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date & Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Assignee
              </Label>
              <Popover open={peoplePopoverOpen} onOpenChange={setPeoplePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(assignee.name || assignee.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {assignee.name || assignee.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select person</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search people..."
                        value={peopleSearch}
                        onChange={(e) => setPeopleSearch(e.target.value)}
                        className="pl-8 h-8"
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {/* Unassign option */}
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left",
                        !assignedTo && "bg-muted"
                      )}
                      onClick={() => {
                        setAssignedTo(null);
                        setPeoplePopoverOpen(false);
                      }}
                    >
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <X className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    </button>
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left",
                          assignedTo === member.id && "bg-muted"
                        )}
                        onClick={() => {
                          setAssignedTo(member.id);
                          setPeoplePopoverOpen(false);
                        }}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(member.name || member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {member.name || member.email}
                          </p>
                          {member.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredMembers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No team members found
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Color
            </Label>
            <div className="flex flex-wrap gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all shadow-sm",
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
                      : "hover:scale-110 hover:shadow-md"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Labels
            </Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {labels.map((label, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {label}
                    <button
                      onClick={() => {
                        const newLabels = [...labels];
                        newLabels.splice(i, 1);
                        setLabels(newLabels);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add label and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value) {
                      setLabels((prev) => [...prev, value]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending || !title.trim()}>
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
