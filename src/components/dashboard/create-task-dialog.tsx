"use client";

import { useState, useTransition, useCallback, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  User as UserIcon,
  Flag,
  Palette,
  Tag,
  Search,
  X,
  ChevronDown,
  Plus,
  Trash2,
  ListChecks,
  Paperclip,
  Upload,
  File,
  Image,
  FileText,
  Loader2,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import {
  createWhiteboardTask,
  createTaskSubtask,
  uploadTaskAttachment,
  saveSketchAsAttachment,
} from "@/app/(dashboard)/tasks/actions";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { Slider } from "@/components/ui/slider";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: (task: WhiteboardTask) => void;
  organizationId: string;
  teamMembers?: Pick<User, "id" | "name" | "email">[];
  defaultStatus?: "todo" | "in_progress" | "done";
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", textClass: "text-yellow-600 dark:text-yellow-400" },
  { value: "in_progress", label: "In Progress", textClass: "text-blue-600 dark:text-blue-400" },
  { value: "done", label: "Done", textClass: "text-green-600 dark:text-green-400" },
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

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image;
  if (fileType === "application/pdf") return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");

  // Attachments state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Sketch state
  const [isSketchOpen, setIsSketchOpen] = useState(false);
  const [pendingSketch, setPendingSketch] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus(defaultStatus);
    setPriority("medium");
    setDueDate("");
    setColor("#3b82f6");
    setAssignedToIds([]);
    setLabels([]);
    setSubtasks([]);
    setNewSubtask("");
    setPendingFiles([]);
    setPendingSketch(null);
    setIsSketchOpen(false);
    setStrokeColor("#000000");
    setStrokeWidth(4);
    setIsEraser(false);
  };

  // Sketch color options
  const SKETCH_COLORS = [
    "#000000", "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
  ];

  // Handle saving sketch
  const handleSaveSketch = async () => {
    if (!canvasRef.current) return;

    try {
      const dataUrl = await canvasRef.current.exportImage("png");
      const fileName = `sketch_${Date.now()}.png`;
      setPendingSketch({ dataUrl, fileName });
      setIsSketchOpen(false);
      toast.success("Sketch added");
    } catch {
      toast.error("Failed to save sketch");
    }
  };

  // Handle clearing sketch canvas
  const handleClearCanvas = () => {
    canvasRef.current?.clearCanvas();
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

  // Get selected assignees
  const selectedAssignees = teamMembers.filter((m) => assignedToIds.includes(m.id));

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setPendingFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Remove a pending file
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
        assigned_to_ids: assignedToIds,
        labels,
      });

      if (result.error) {
        toast.error("Failed to create task", { description: result.error });
        return;
      }

      if (result.task) {
        const taskId = result.task.id;

        // Create subtasks
        for (const subtaskTitle of subtasks) {
          await createTaskSubtask(taskId, subtaskTitle);
        }

        // Upload attachments
        for (const file of pendingFiles) {
          const formData = new FormData();
          formData.append("file", file);
          await uploadTaskAttachment(taskId, formData);
        }

        // Save sketch if present
        if (pendingSketch) {
          await saveSketchAsAttachment(taskId, pendingSketch.dataUrl, pendingSketch.fileName);
        }

        toast.success("Task created");
        onTaskCreated(result.task);
        handleOpenChange(false);
      }
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task for your team to track
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
              className="w-full"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue>
                    <span className={cn("font-medium", STATUS_OPTIONS.find((o) => o.value === status)?.textClass)}>
                      {STATUS_OPTIONS.find((o) => o.value === status)?.label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={cn("font-medium", opt.textClass)}>{opt.label}</span>
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

            {/* Assignees */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Assignees
              </Label>
              <Popover open={peoplePopoverOpen} onOpenChange={setPeoplePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-auto min-h-9"
                  >
                    {selectedAssignees.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedAssignees.slice(0, 3).map((assignee) => (
                          <div key={assignee.id} className="flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-[8px]">
                                {getInitials(assignee.name || assignee.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate max-w-[60px]">
                              {assignee.name || assignee.email}
                            </span>
                          </div>
                        ))}
                        {selectedAssignees.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{selectedAssignees.length - 3} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select people</span>
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
                    {/* Clear all option */}
                    {assignedToIds.length > 0 && (
                      <button
                        className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left text-sm text-muted-foreground"
                        onClick={() => setAssignedToIds([])}
                      >
                        <X className="h-4 w-4" />
                        Clear all ({assignedToIds.length})
                      </button>
                    )}
                    {filteredMembers.map((member) => {
                      const isSelected = assignedToIds.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left",
                            isSelected && "bg-muted"
                          )}
                          onClick={() => {
                            if (isSelected) {
                              setAssignedToIds(assignedToIds.filter((id) => id !== member.id));
                            } else {
                              setAssignedToIds([...assignedToIds, member.id]);
                            }
                          }}
                        >
                          <Checkbox checked={isSelected} className="pointer-events-none" />
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
                      );
                    })}
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
              className="w-full resize-none"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            />
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Labels
            </Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                {labels.map((label, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 max-w-[150px]">
                    <span className="truncate">{label}</span>
                    <button
                      onClick={() => {
                        const newLabels = [...labels];
                        newLabels.splice(i, 1);
                        setLabels(newLabels);
                      }}
                      className="shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add label and press Enter..."
                className="w-full"
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

          <Separator />

          {/* Subtasks */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              Subtasks
              {subtasks.length > 0 && (
                <span className="ml-1">({subtasks.length})</span>
              )}
            </Label>

            {/* Subtask list */}
            {subtasks.length > 0 && (
              <div className="space-y-1">
                {subtasks.map((subtask, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-md group hover:bg-muted/50"
                  >
                    <div className="w-4 h-4 rounded border border-muted-foreground/30 shrink-0" />
                    <span className="flex-1 text-sm break-all">{subtask}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSubtasks((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newSubtask.trim()) {
                  setSubtasks((prev) => [...prev, newSubtask.trim()]);
                  setNewSubtask("");
                }
              }}
              className="flex gap-2"
            >
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                className="h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8"
                disabled={!newSubtask.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <Separator />

          {/* Attachments */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              Attachments
              {(pendingFiles.length > 0 || pendingSketch) && (
                <span className="ml-1">({pendingFiles.length + (pendingSketch ? 1 : 0)})</span>
              )}
            </Label>

            {/* Pending sketch preview */}
            {pendingSketch && (
              <div className="flex items-center gap-3 p-2 rounded-md border group hover:bg-muted/50">
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border bg-white">
                  <img
                    src={pendingSketch.dataUrl}
                    alt="Sketch"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pendingSketch.fileName}</p>
                  <p className="text-xs text-muted-foreground">Sketch</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setPendingSketch(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Pending files list */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                {pendingFiles.map((file, i) => {
                  const FileIcon = getFileIcon(file.type);
                  const isImage = file.type.startsWith("image/");

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-md border group hover:bg-muted/50"
                    >
                      {isImage ? (
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removePendingFile(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload zone and sketch button */}
            <div className="flex gap-2">
              <div
                {...getRootProps()}
                className={cn(
                  "flex-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer",
                  "transition-colors hover:border-primary/50 hover:bg-muted/50",
                  isDragActive && "border-primary bg-primary/10"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-xs text-primary">Drop files here</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Drop files or click
                    </p>
                  )}
                </div>
              </div>

              {/* Sketch button */}
              <Button
                variant="outline"
                className="h-auto flex-col gap-1 py-3 px-4"
                onClick={() => setIsSketchOpen(true)}
                disabled={!!pendingSketch}
              >
                <Pencil className="h-6 w-6" />
                <span className="text-xs">{pendingSketch ? "Sketched" : "Sketch"}</span>
              </Button>
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
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Sketch Canvas Dialog */}
    <Dialog open={isSketchOpen} onOpenChange={setIsSketchOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Sketch</DialogTitle>
          <DialogDescription>
            Draw a sketch to attach to the task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <ReactSketchCanvas
              ref={canvasRef}
              width="100%"
              height="300px"
              strokeColor={isEraser ? "#FFFFFF" : strokeColor}
              strokeWidth={strokeWidth}
              canvasColor="#FFFFFF"
            />
          </div>

          {/* Tools */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Color:</span>
              <div className="flex gap-1">
                {SKETCH_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setStrokeColor(c);
                      setIsEraser(false);
                    }}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all border border-gray-200",
                      strokeColor === c && !isEraser && "ring-2 ring-offset-1 ring-primary"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Stroke width */}
            <div className="flex items-center gap-2 flex-1 min-w-[120px] max-w-[200px]">
              <span className="text-xs text-muted-foreground">Size:</span>
              <Slider
                value={[strokeWidth]}
                onValueChange={(v) => setStrokeWidth(v[0])}
                min={1}
                max={20}
                step={1}
                className="flex-1"
              />
            </div>

            {/* Tools */}
            <div className="flex items-center gap-1">
              <Button
                variant={isEraser ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsEraser(!isEraser)}
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => canvasRef.current?.undo()}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => canvasRef.current?.redo()}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={handleClearCanvas}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSketchOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSketch}>
              Add Sketch
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
