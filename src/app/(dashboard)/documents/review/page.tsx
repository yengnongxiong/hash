"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Eye,
  Search,
  Check,
  AlertTriangle,
  Flag,
  FileImage,
  FileSpreadsheet,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { bulkApproveDocuments, deleteDocuments } from "@/app/(dashboard)/documents/actions";
import { toast } from "sonner";
import { formatDistanceToNow, formatFileSize } from "@/lib/utils/format";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface DocumentWithCustomer {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  document_number: string | null;
  document_type: string | null;
  status: "pending_review" | "rejected";
  created_at: string;
  customers?: { name: string; company: string | null } | null;
  flag_count?: number;
  unresolved_flag_count?: number;
}

type SortField = "created_at" | "file_name" | "document_type" | "customer" | "flags";
type SortDirection = "asc" | "desc";

// Helper to get file icon based on type
function getFileIcon(fileType: string | null) {
  if (fileType?.startsWith("image/")) {
    return <FileImage className="h-4 w-4 text-blue-500" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
}

export default function ReviewQueuePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Filters and sorting
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const debouncedSearch = useDebounce(search, 300);

  // Fetch documents pending review or rejected
  useEffect(() => {
    async function fetchReviewDocuments() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select(`
          id,
          file_name,
          file_type,
          file_size,
          document_number,
          document_type,
          status,
          created_at,
          customer_id
        `)
        .in("status", ["pending_review", "rejected"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load documents");
        console.error(error);
        return;
      }

      if (!data || data.length === 0) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      // Fetch customers separately to avoid TypeScript join issues
      const customerIds = [...new Set(data.filter(d => d.customer_id).map(d => d.customer_id as string))];
      let customersMap: Record<string, { name: string; company: string | null }> = {};

      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from("customers")
          .select("id, name, company")
          .in("id", customerIds);

        if (customers) {
          customersMap = Object.fromEntries(
            customers.map(c => [c.id, { name: c.name, company: c.company }])
          );
        }
      }

      // Fetch flag counts for each document
      const { data: flags } = await supabase
        .from("document_flags")
        .select("document_id, resolved")
        .in("document_id", data.map((d) => d.id));

      const flagCounts: Record<string, { total: number; unresolved: number }> = {};
      flags?.forEach((f) => {
        if (!flagCounts[f.document_id]) {
          flagCounts[f.document_id] = { total: 0, unresolved: 0 };
        }
        flagCounts[f.document_id].total++;
        if (!f.resolved) {
          flagCounts[f.document_id].unresolved++;
        }
      });

      const docsWithFlags = data.map((doc) => ({
        ...doc,
        status: doc.status as "pending_review" | "rejected",
        customers: doc.customer_id ? customersMap[doc.customer_id] || null : null,
        flag_count: flagCounts[doc.id]?.total || 0,
        unresolved_flag_count: flagCounts[doc.id]?.unresolved || 0,
      }));

      setDocuments(docsWithFlags);
      setIsLoading(false);
    }

    fetchReviewDocuments();
  }, []);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.file_name?.toLowerCase().includes(searchLower) ||
          doc.document_number?.toLowerCase().includes(searchLower) ||
          doc.customers?.name?.toLowerCase().includes(searchLower) ||
          doc.customers?.company?.toLowerCase().includes(searchLower) ||
          doc.document_type?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "file_name":
          aVal = a.file_name.toLowerCase();
          bVal = b.file_name.toLowerCase();
          break;
        case "document_type":
          aVal = a.document_type?.toLowerCase() || "";
          bVal = b.document_type?.toLowerCase() || "";
          break;
        case "customer":
          aVal = a.customers?.name?.toLowerCase() || "";
          bVal = b.customers?.name?.toLowerCase() || "";
          break;
        case "flags":
          aVal = a.unresolved_flag_count || 0;
          bVal = b.unresolved_flag_count || 0;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, debouncedSearch, sortField, sortDirection]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredDocuments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Bulk approve handler
  const handleBulkApprove = () => {
    const selectedWithFlags = Array.from(selected).filter((id) => {
      const doc = documents.find((d) => d.id === id);
      return doc?.unresolved_flag_count && doc.unresolved_flag_count > 0;
    });

    if (selectedWithFlags.length > 0) {
      setShowConfirmDialog(true);
    } else {
      executeBulkApprove();
    }
  };

  const executeBulkApprove = () => {
    startTransition(async () => {
      const result = await bulkApproveDocuments(Array.from(selected));
      if (result.error) {
        toast.error("Failed to approve documents", { description: result.error });
      } else {
        toast.success(`${result.count} document${result.count !== 1 ? "s" : ""} approved`);
        // Remove approved documents from the list
        setDocuments((prev) => prev.filter((d) => !selected.has(d.id)));
        setSelected(new Set());
        router.refresh();
      }
      setShowConfirmDialog(false);
    });
  };

  const documentsWithFlags = Array.from(selected).filter((id) => {
    const doc = documents.find((d) => d.id === id);
    return doc?.unresolved_flag_count && doc.unresolved_flag_count > 0;
  }).length;

  // Delete handler for rejected documents
  const handleDelete = (docId: string) => {
    setDocumentToDelete(docId);
    setShowDeleteDialog(true);
  };

  const executeDelete = () => {
    if (!documentToDelete) return;

    startTransition(async () => {
      const result = await deleteDocuments([documentToDelete]);
      if (result.error) {
        toast.error("Failed to delete document", { description: result.error });
      } else {
        toast.success("Document deleted");
        setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete));
        router.refresh();
      }
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
    });
  };

  // Count documents by status
  const pendingCount = documents.filter((d) => d.status === "pending_review").length;
  const rejectedCount = documents.filter((d) => d.status === "rejected").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-purple-600" />
            Review Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pendingCount > 0 && (
              <span>{pendingCount} pending review</span>
            )}
            {pendingCount > 0 && rejectedCount > 0 && <span> · </span>}
            {rejectedCount > 0 && (
              <span className="text-orange-600">{rejectedCount} rejected</span>
            )}
            {pendingCount === 0 && rejectedCount === 0 && (
              <span>No documents in queue</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              onClick={handleBulkApprove}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Approve Selected ({selected.size})
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Documents Table */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {documents.length === 0
              ? "No documents pending review"
              : "No documents match your search"}
          </p>
          {documents.length === 0 && (
            <Link href="/documents/upload">
              <Button variant="outline" className="mt-4">
                Upload Documents
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="w-10 p-3 text-left">
                    <Checkbox
                      checked={selected.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort("file_name")}
                      className="flex items-center font-medium hover:text-primary"
                    >
                      Document {getSortIcon("file_name")}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort("document_type")}
                      className="flex items-center font-medium hover:text-primary"
                    >
                      Type {getSortIcon("document_type")}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort("customer")}
                      className="flex items-center font-medium hover:text-primary"
                    >
                      Person {getSortIcon("customer")}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort("flags")}
                      className="flex items-center font-medium hover:text-primary"
                    >
                      Flags {getSortIcon("flags")}
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center font-medium hover:text-primary"
                    >
                      Uploaded {getSortIcon("created_at")}
                    </button>
                  </th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="w-28 p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className={cn(
                      "border-b hover:bg-muted/30 transition-colors",
                      selected.has(doc.id) && "bg-primary/5"
                    )}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(doc.id)}
                        onCheckedChange={() => toggleSelect(doc.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.file_type)}
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[200px]">
                            {doc.file_name}
                          </div>
                          {doc.document_number && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {doc.document_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {doc.document_type ? (
                        <Badge variant="outline" className="capitalize">
                          {doc.document_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {doc.customers ? (
                        <div className="truncate max-w-[150px]">
                          {doc.customers.name}
                          {doc.customers.company && (
                            <span className="text-muted-foreground text-xs block">
                              {doc.customers.company}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {doc.unresolved_flag_count && doc.unresolved_flag_count > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className="text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20"
                              >
                                <Flag className="h-3 w-3 mr-1" />
                                {doc.unresolved_flag_count}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {doc.unresolved_flag_count} unresolved flag{doc.unresolved_flag_count !== 1 ? "s" : ""}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.created_at))}
                    </td>
                    <td className="p-3">
                      {doc.status === "rejected" ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-900/20">
                          <Eye className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/documents/${doc.id}`}>
                          <Button variant="ghost" size="sm">
                            {doc.status === "rejected" ? "View" : "Review"}
                          </Button>
                        </Link>
                        {doc.status === "rejected" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(doc.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete permanently</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Approve Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Approve Documents with Flags?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {documentsWithFlags} of the {selected.size} selected document{selected.size !== 1 ? "s have" : " has"}{" "}
              unresolved flags. Are you sure you want to approve them anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Document?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document and all its data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
