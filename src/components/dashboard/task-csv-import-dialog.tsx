"use client";

import { useState, useRef, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react";
import { importTasksFromCSV } from "@/app/(dashboard)/tasks/actions";
import { toast } from "sonner";
import { WhiteboardTask } from "@/types/database";

interface CSVRow {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  color?: string;
  labels?: string;
  assignees?: string;
}

interface TaskCSVImportDialogProps {
  organizationId: string;
  onTasksImported: (tasks: WhiteboardTask[]) => void;
}

export function TaskCSVImportDialog({ organizationId, onTasksImported }: TaskCSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const titleIndex = headers.indexOf("title");

    if (titleIndex === -1) {
      setErrors(["CSV must have a 'title' column"]);
      return [];
    }

    // Parse rows
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: CSVRow = { title: "" };

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || "";
        if (header === "title") row.title = value;
        else if (header === "description") row.description = value;
        else if (header === "status") row.status = value;
        else if (header === "priority") row.priority = value;
        else if (header === "due_date" || header === "duedate") row.due_date = value;
        else if (header === "color") row.color = value;
        else if (header === "labels") row.labels = value;
        else if (header === "assignees" || header === "assignee") row.assignees = value;
      });

      if (row.title) {
        rows.push(row);
      }
    }

    return rows;
  };

  // Handle quoted CSV values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setErrors(["Please select a CSV file"]);
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setPreview(parsed.slice(0, 5)); // Show first 5 rows as preview
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = () => {
    if (!file) return;

    startTransition(async () => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const tasks = parseCSV(text);

        if (tasks.length === 0) {
          toast.error("No valid tasks found in CSV");
          return;
        }

        const result = await importTasksFromCSV(organizationId, tasks);

        if (result.error) {
          toast.error("Import failed", { description: result.error });
          if (result.errors && result.errors.length > 0) {
            setErrors(result.errors);
          }
        } else {
          toast.success(`Imported ${result.imported} tasks`, {
            description:
              result.errors && result.errors.length > 0
                ? `${result.errors.length} rows had errors`
                : undefined,
          });
          if (result.tasks) {
            onTasksImported(result.tasks);
          }
          if (result.errors && result.errors.length > 0) {
            setErrors(result.errors);
          } else {
            setOpen(false);
            resetForm();
          }
        }
      };
      reader.readAsText(file);
    });
  };

  const resetForm = () => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = "title,description,status,priority,due_date,color,labels,assignees\nBuild feature,Implement the new user dashboard,todo,high,2025-01-15,#3b82f6,\"feature,frontend\",\"user@example.com\"\nFix bug,Address login issue,in_progress,urgent,,#ef4444,bug,\"user1@example.com,user2@example.com\"";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Import Tasks from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import tasks. The file must have a
            &quot;title&quot; column.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-1" />
            Download CSV template
          </Button>

          {/* File input */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium truncate max-w-full">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click to select a CSV file
              </p>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview (first 5 rows):</p>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left whitespace-nowrap">Title</th>
                        <th className="p-2 text-left whitespace-nowrap">Status</th>
                        <th className="p-2 text-left whitespace-nowrap">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.map((row, i) => (
                        <tr key={i}>
                          <td className="p-2 max-w-[150px] truncate">{row.title}</td>
                          <td className="p-2 text-muted-foreground whitespace-nowrap">
                            {row.status || "todo"}
                          </td>
                          <td className="p-2 text-muted-foreground whitespace-nowrap">
                            {row.priority || "medium"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Errors</span>
              </div>
              <ul className="text-sm text-destructive/90 space-y-1">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i} className="truncate">{error}</li>
                ))}
                {errors.length > 5 && (
                  <li>...and {errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isPending}
            >
              {isPending ? (
                "Importing..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
