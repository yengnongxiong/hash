"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  FileText,
  Trash2,
  RotateCw,
  ExternalLink,
  Search,
  X,
  Download,
  Calendar as CalendarIcon,
  AlertTriangle,
  Flag,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileImage,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { ProcessingStatus } from "./processing-status";
import { UploadDialog } from "./upload-dialog";
import {
  deleteDocuments,
  retryDocumentOCR,
} from "@/app/(dashboard)/documents/actions";
import { toast } from "sonner";
import { formatDistanceToNow, formatFileSize } from "@/lib/utils/format";
import { exportToCSV } from "@/lib/export";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/database";
import { useTransition } from "react";
import { subscribeToDocuments } from "@/lib/realtime";

type DocumentStatus = "pending" | "processing" | "pending_review" | "completed" | "failed" | "rejected";

interface DocumentWithCustomer extends Document {
  customers?: { name: string; company: string | null } | null;
  flag_count?: number;
  unresolved_flag_count?: number;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

interface DocumentsViewProps {
  documents: DocumentWithCustomer[];
  pagination?: PaginationInfo;
}

type StatusFilter = "all" | "pending" | "processing" | "pending_review" | "completed" | "failed" | "rejected";
type TypeFilter = "all" | "invoice" | "receipt" | "contract" | "purchase_order" | "bank_statement" | "credit_card_statement" | "check" | "amendment" | "nda" | "terms_of_service" | "w2" | "1099" | "pay_stub" | "other";
type FlagFilter = "all" | "has_flags" | "no_flags";

// Document type display configuration
const DOCUMENT_TYPE_OPTIONS: { value: TypeFilter; label: string; category: string }[] = [
  { value: "all", label: "All Types", category: "" },
  // Financial
  { value: "invoice", label: "Invoice", category: "Financial" },
  { value: "receipt", label: "Receipt", category: "Financial" },
  { value: "purchase_order", label: "Purchase Order", category: "Financial" },
  { value: "bank_statement", label: "Bank Statement", category: "Financial" },
  { value: "credit_card_statement", label: "Credit Card Statement", category: "Financial" },
  { value: "check", label: "Check", category: "Financial" },
  // Legal
  { value: "contract", label: "Contract", category: "Legal" },
  { value: "amendment", label: "Amendment", category: "Legal" },
  { value: "nda", label: "NDA", category: "Legal" },
  { value: "terms_of_service", label: "Terms of Service", category: "Legal" },
  // HR
  { value: "w2", label: "W-2", category: "HR" },
  { value: "1099", label: "1099", category: "HR" },
  { value: "pay_stub", label: "Pay Stub", category: "HR" },
  // Other
  { value: "other", label: "Other", category: "" },
];

// Helper to get document type label
function getDocumentTypeLabel(type: string | null): string {
  const option = DOCUMENT_TYPE_OPTIONS.find(o => o.value === type);
  return option?.label || type || "Other";
}

// Helper to get file icon based on type
function getFileIcon(fileType: string | null) {
  if (fileType?.startsWith("image/")) {
    return <FileImage className="h-4 w-4 text-blue-500" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  // DOCX - Word documents
  if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return <FileText className="h-4 w-4 text-blue-600" />;
  }
  // PPTX - PowerPoint presentations
  if (fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return <FileText className="h-4 w-4 text-orange-500" />;
  }
  return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
}

// Helper to get confidence badge
function getConfidenceBadge(confidence?: string) {
  if (!confidence) return null;
  const colors = {
    high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <Badge variant="outline" className={cn("text-xs", colors[confidence as keyof typeof colors])}>
      {confidence}
    </Badge>
  );
}

export function DocumentsView({ documents: initialDocuments, pagination }: DocumentsViewProps) {
  // Local state for documents to enable realtime updates
  const [documents, setDocuments] = useState<DocumentWithCustomer[]>(initialDocuments);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sync documents when initialDocuments prop changes (e.g., on pagination)
  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  // Subscribe to realtime document updates
  useEffect(() => {
    const unsubscribe = subscribeToDocuments<Record<string, unknown>>((payload) => {
      if (payload.eventType === "UPDATE" && payload.new && typeof payload.new.id === "string") {
        const updatedDoc = payload.new as Partial<DocumentWithCustomer>;
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === updatedDoc.id
              ? { ...doc, ...updatedDoc }
              : doc
          )
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle page navigation
  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/documents?${params.toString()}`);
  }, [router, searchParams]);

  // Open upload dialog if URL param is present
  useEffect(() => {
    if (searchParams.get("upload") === "true") {
      setUploadDialogOpen(true);
      // Clear the URL param
      router.replace("/documents", { scroll: false });
    }
  }, [searchParams, router]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const debouncedSearch = useDebounce(search, 300);

  // Reset selection when filters change to prevent accidental deletions
  useEffect(() => {
    setSelected(new Set());
  }, [debouncedSearch, statusFilter, typeFilter, flagFilter, dateFrom, dateTo]);

  // Check for invalid date range
  const hasInvalidDateRange = dateFrom && dateTo && dateFrom > dateTo;

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch =
          doc.file_name?.toLowerCase().includes(searchLower) ||
          doc.document_number?.toLowerCase().includes(searchLower) ||
          doc.customers?.name?.toLowerCase().includes(searchLower) ||
          doc.customers?.company?.toLowerCase().includes(searchLower) ||
          doc.document_type?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && doc.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && doc.document_type !== typeFilter) {
        return false;
      }

      // Flag filter
      if (flagFilter === "has_flags" && (!doc.unresolved_flag_count || doc.unresolved_flag_count === 0)) {
        return false;
      }
      if (flagFilter === "no_flags" && doc.unresolved_flag_count && doc.unresolved_flag_count > 0) {
        return false;
      }

      // Date range filter
      if (dateFrom) {
        const docDate = new Date(doc.created_at);
        if (docDate < dateFrom) return false;
      }
      if (dateTo) {
        const docDate = new Date(doc.created_at);
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (docDate > endOfDay) return false;
      }

      return true;
    });
  }, [documents, debouncedSearch, statusFilter, typeFilter, flagFilter, dateFrom, dateTo]);

  // Count documents with flags
  const flaggedDocumentsCount = useMemo(() => {
    return documents.filter(d => d.unresolved_flag_count && d.unresolved_flag_count > 0).length;
  }, [documents]);

  // Count failed documents
  const failedDocuments = useMemo(() => {
    return documents.filter(d => d.status === "failed");
  }, [documents]);

  // Count pending review documents
  const pendingReviewCount = useMemo(() => {
    return documents.filter(d => d.status === "pending_review").length;
  }, [documents]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    flagFilter !== "all" ||
    dateFrom !== undefined ||
    dateTo !== undefined;

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setFlagFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredDocuments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const handleDelete = () => {
    if (selected.size === 0) return;

    startTransition(async () => {
      const result = await deleteDocuments(Array.from(selected));
      if (result.error) {
        toast.error("Delete failed", { description: result.error });
      } else {
        toast.success(`Deleted ${result.count} document(s)`);
        setSelected(new Set());
      }
    });
  };

  const handleRetry = (documentId: string) => {
    startTransition(async () => {
      const result = await retryDocumentOCR(documentId);
      if (result.error) {
        toast.error("Retry failed", { description: result.error });
      } else {
        toast.success("Reprocessing started");
      }
    });
  };

  const handleExport = useCallback(() => {
    exportToCSV(filteredDocuments as unknown as Record<string, unknown>[], "documents", [
      { key: "document_number", label: "ID" },
      { key: "file_name", label: "File Name" },
      { key: "document_type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "file_size", label: "Size", format: (v) => formatFileSize(v as number) },
      { key: "created_at", label: "Uploaded" },
    ]);
  }, [filteredDocuments]);

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type">
              {getDocumentTypeLabel(typeFilter === "all" ? null : typeFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {/* Financial */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Financial</div>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="receipt">Receipt</SelectItem>
            <SelectItem value="purchase_order">Purchase Order</SelectItem>
            <SelectItem value="bank_statement">Bank Statement</SelectItem>
            <SelectItem value="credit_card_statement">Credit Card Statement</SelectItem>
            <SelectItem value="check">Check</SelectItem>
            {/* Legal */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Legal</div>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="amendment">Amendment</SelectItem>
            <SelectItem value="nda">NDA</SelectItem>
            <SelectItem value="terms_of_service">Terms of Service</SelectItem>
            {/* HR */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">HR</div>
            <SelectItem value="w2">W-2</SelectItem>
            <SelectItem value="1099">1099</SelectItem>
            <SelectItem value="pay_stub">Pay Stub</SelectItem>
            {/* Other */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Other</div>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Flag Filter */}
        <Select
          value={flagFilter}
          onValueChange={(v) => setFlagFilter(v as FlagFilter)}
        >
          <SelectTrigger className={cn(
            "w-[150px]",
            flagFilter === "has_flags" && "border-red-300 dark:border-red-700"
          )}>
            <div className="flex items-center gap-2">
              {flagFilter === "has_flags" && <Flag className="h-3 w-3 text-red-500" />}
              <SelectValue placeholder="Flags" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="has_flags">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                Has Flags ({flaggedDocumentsCount})
              </div>
            </SelectItem>
            <SelectItem value="no_flags">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                No Flags
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date Range Warning */}
        {hasInvalidDateRange && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Invalid range</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>&quot;From&quot; date is after &quot;To&quot; date - no results will match</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}

        {/* Upload */}
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>

        {/* Export */}
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Upload Dialog */}
      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />

      {/* Alert Banners */}
      <div className="space-y-2">
        {/* Failed Documents Alert */}
        {failedDocuments.length > 0 && (
          <div className="flex items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="text-sm text-red-800 dark:text-red-200">
                <span className="font-medium">{failedDocuments.length} document{failedDocuments.length !== 1 ? "s" : ""} failed</span>
                {" "}processing and need{failedDocuments.length === 1 ? "s" : ""} attention
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter("failed")}
              className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 shrink-0"
            >
              <RotateCw className="h-3 w-3 mr-1" />
              View Failed
            </Button>
          </div>
        )}

        {/* Pending Review Alert */}
        {pendingReviewCount > 0 && (
          <div className="flex items-center justify-between gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-sm text-purple-800 dark:text-purple-200">
                <span className="font-medium">{pendingReviewCount} document{pendingReviewCount !== 1 ? "s" : ""}</span>
                {" "}awaiting your review
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter("pending_review")}
              className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 shrink-0"
            >
              Review Now
            </Button>
          </div>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredDocuments.length} of {documents.length} documents
          {hasActiveFilters && " (filtered)"}
        </p>
      </div>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Document Table */}
      <div className={cn("border rounded-lg overflow-hidden", isPending && "opacity-70 pointer-events-none")}>
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {documents.length === 0 ? (
              <>
                <p className="font-medium">No documents yet</p>
                <p className="text-sm">Upload your first document to get started</p>
              </>
            ) : (
              <>
                <p className="font-medium">No matching documents</p>
                <p className="text-sm">Try adjusting your filters</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 p-3">
                  <Checkbox
                    checked={selected.size === filteredDocuments.length && filteredDocuments.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left p-3 text-sm font-medium">ID</th>
                <th className="text-left p-3 text-sm font-medium">Document</th>
                <th className="text-left p-3 text-sm font-medium">Person</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Confidence</th>
                <th className="text-left p-3 text-sm font-medium">Flags</th>
                <th className="text-left p-3 text-sm font-medium">Uploaded</th>
                <th className="w-20 p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(doc.id)}
                      onCheckedChange={() => toggleSelect(doc.id)}
                    />
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {doc.document_number || "-"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      {getFileIcon(doc.file_type)}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[200px]">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size || 0)}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-3 text-sm">
                    {doc.customers ? (
                      <span className="truncate max-w-[150px] block">
                        {doc.customers.name}
                        {doc.customers.company && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({doc.customers.company})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {getDocumentTypeLabel(doc.document_type)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <ProcessingStatus status={(doc.status || "pending") as DocumentStatus} />
                  </td>
                  <td className="p-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex gap-2 text-xs">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-muted-foreground">Class</span>
                              <span className={cn(
                                "font-mono",
                                doc.classification_confidence && doc.classification_confidence >= 0.9
                                  ? "text-green-600 dark:text-green-400"
                                  : doc.classification_confidence && doc.classification_confidence >= 0.7
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : doc.classification_confidence
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground"
                              )}>
                                {doc.classification_confidence
                                  ? `${Math.round(doc.classification_confidence * 100)}%`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-muted-foreground">Extr</span>
                              <span className={cn(
                                "font-mono",
                                doc.extraction_confidence && doc.extraction_confidence >= 0.9
                                  ? "text-green-600 dark:text-green-400"
                                  : doc.extraction_confidence && doc.extraction_confidence >= 0.7
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : doc.extraction_confidence
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground"
                              )}>
                                {doc.extraction_confidence
                                  ? `${Math.round(doc.extraction_confidence * 100)}%`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Classification: {doc.classification_confidence ? `${Math.round(doc.classification_confidence * 100)}%` : "N/A"}
                            <br />
                            Extraction: {doc.extraction_confidence ? `${Math.round(doc.extraction_confidence * 100)}%` : "N/A"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="p-3">
                    <TooltipProvider>
                      {doc.unresolved_flag_count && doc.unresolved_flag_count > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/documents/${doc.id}`}>
                              <Badge
                                variant="destructive"
                                className="gap-1 cursor-pointer hover:bg-destructive/90"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {doc.unresolved_flag_count}
                              </Badge>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{doc.unresolved_flag_count} unresolved flag(s) - click to view</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : doc.status === "completed" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>No issues detected</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TooltipProvider>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(doc.created_at))}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {doc.status === "failed" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Retry processing"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <RotateCw className="h-5 w-5" />
                                Retry OCR Processing?
                              </AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-2">
                                  <p>
                                    This will reprocess the document with OCR and extract new data.
                                  </p>
                                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                                    Any manually edited data will be replaced with new extracted data.
                                  </p>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRetry(doc.id)}>
                                Retry Processing
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Link href={`/documents/${doc.id}`}>
                        <Button variant="ghost" size="icon" title="View details">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Server-side Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} documents
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
