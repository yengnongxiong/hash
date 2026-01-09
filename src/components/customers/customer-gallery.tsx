"use client";

import { useState, useTransition } from "react";
import { Customer, PersonTag, CustomerWithUserInfo } from "@/types/database";
import { CustomerCard } from "./customer-card";
import { CustomerDetailDialog } from "./customer-detail-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  X,
} from "lucide-react";
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
import { useRouter } from "next/navigation";
import { deleteCustomers } from "@/app/(dashboard)/people/actions";
import { toast } from "sonner";

interface CustomerGalleryProps {
  data: CustomerWithUserInfo[];
  personTags: PersonTag[];
}

export function CustomerGallery({ data, personTags }: CustomerGalleryProps) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithUserInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const pageCount = Math.ceil(data.length / pageSize);
  const startIndex = pageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/30">
        <div className="rounded-full bg-muted p-3 mb-4">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
        </div>
        <h3 className="font-medium text-foreground mb-1">No people found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Get started by adding your first person using the &quot;Add Person&quot; button above.
        </p>
      </div>
    );
  }

  const handleCardClick = (customer: CustomerWithUserInfo) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedCustomer(null);
    }
  };

  const handleUpdate = () => {
    router.refresh();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedData.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await deleteCustomers(ids);
      if (result.error) {
        toast.error("Failed to delete", { description: result.error });
      } else {
        toast.success(`${result.count} ${result.count === 1 ? "person" : "people"} deleted`);
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  };

  const allPageSelected = paginatedData.length > 0 && paginatedData.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  return (
    <>
      {/* Selection toolbar */}
      {someSelected && (
        <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allPageSelected}
              onCheckedChange={(checked) => checked ? selectAllOnPage() : deselectAll()}
            />
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={deselectAll}>
              <X className="h-4 w-4 mr-1" />
              Unselect
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.size} {selectedIds.size === 1 ? "Person" : "People"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedIds.size} selected {selectedIds.size === 1 ? "person" : "people"}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSelected}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedData.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            personTags={personTags}
            onClick={() => handleCardClick(customer)}
            selected={selectedIds.has(customer.id)}
            onSelect={() => toggleSelection(customer.id)}
          />
        ))}
      </div>

      {/* Footer with count and pagination */}
      <div className="flex items-center justify-between px-2 pt-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {data.length <= pageSize
            ? `Showing ${data.length} ${data.length === 1 ? "person" : "people"}`
            : `Showing ${startIndex + 1}-${Math.min(endIndex, data.length)} of ${data.length} people`
          }
        </div>
        {data.length > pageSize && (
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Per page</p>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(0);
                }}
                className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
              >
                {[12, 24, 36, 48].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {pageIndex + 1} of {pageCount}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setPageIndex(0)}
                disabled={!canPreviousPage}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={!canPreviousPage}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={!canNextPage}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={!canNextPage}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CustomerDetailDialog
        customer={selectedCustomer}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onUpdate={handleUpdate}
        personTags={personTags}
      />
    </>
  );
}
