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
import { importDatesFromCSV } from "@/app/(dashboard)/dates/actions";
import { toast } from "sonner";
import { Customer, AppointmentType } from "@/types/database";

interface CSVRow {
  title: string;
  date: string;
  time?: string;
  end_time?: string;
  person?: string;
  type?: string;
  location?: string;
  description?: string;
  status?: string;
}

interface DatesCSVImportDialogProps {
  customers: Pick<Customer, "id" | "name" | "company" | "customer_number">[];
  appointmentTypes: AppointmentType[];
}

export function DatesCSVImportDialog({ customers, appointmentTypes }: DatesCSVImportDialogProps) {
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
    const dateIndex = headers.indexOf("date");

    if (titleIndex === -1) {
      setErrors(["CSV must have a 'title' column"]);
      return [];
    }

    if (dateIndex === -1) {
      setErrors(["CSV must have a 'date' column"]);
      return [];
    }

    // Parse rows
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: CSVRow = { title: "", date: "" };

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || "";
        if (header === "title") row.title = value;
        else if (header === "date") row.date = value;
        else if (header === "time") row.time = value;
        else if (header === "end_time" || header === "end time") row.end_time = value;
        else if (header === "person" || header === "people") row.person = value;
        else if (header === "type") row.type = value;
        else if (header === "location") row.location = value;
        else if (header === "description") row.description = value;
        else if (header === "status") row.status = value;
      });

      if (row.title && row.date) {
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
        const dates = parseCSV(text);

        if (dates.length === 0) {
          toast.error("No valid dates found in CSV");
          return;
        }

        // Build lookup maps
        const customerMap = new Map<string, string>();
        customers.forEach((c) => {
          customerMap.set(c.name.toLowerCase(), c.id);
          if (c.company) {
            customerMap.set(c.company.toLowerCase(), c.id);
          }
          if (c.customer_number) {
            customerMap.set(c.customer_number.toLowerCase(), c.id);
          }
        });

        const typeMap = new Map<string, string>();
        appointmentTypes.forEach((t) => {
          typeMap.set(t.name.toLowerCase(), t.id);
        });

        const result = await importDatesFromCSV(dates, customerMap, typeMap);

        if (result.error) {
          toast.error("Import failed", { description: result.error });
          if (result.errors && result.errors.length > 0) {
            setErrors(result.errors);
          }
        } else {
          toast.success(`Imported ${result.imported} dates`, {
            description:
              result.errors && result.errors.length > 0
                ? `${result.errors.length} rows had errors`
                : undefined,
          });
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
    const template = "title,date,time,end_time,person,type,location,description,status\nTeam Meeting,2025-01-15,10:00 AM,11:00 AM,John Doe,Meeting,Conference Room,Weekly sync,scheduled";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dates_template.csv";
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Dates from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import dates. The file must have
            &quot;title&quot; and &quot;date&quot; columns.
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
              <p className="text-sm font-medium truncate max-w-full px-2">{file.name}</p>
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
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left w-[50%]">Title</th>
                      <th className="p-2 text-left w-[25%]">Date</th>
                      <th className="p-2 text-left w-[25%]">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 truncate max-w-0">{row.title}</td>
                        <td className="p-2 text-muted-foreground truncate max-w-0">
                          {row.date || "-"}
                        </td>
                        <td className="p-2 text-muted-foreground truncate max-w-0">
                          {row.time || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Errors</span>
              </div>
              <ul className="text-sm text-destructive/90 space-y-1">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
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
