"use client";

import { useState } from "react";
import { Customer } from "@/types/database";
import { CustomerCard } from "./customer-card";
import { CustomerDetailDialog } from "./customer-detail-dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CustomerGalleryProps {
  data: Customer[];
}

export function CustomerGallery({ data }: CustomerGalleryProps) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  const pageCount = Math.ceil(data.length / pageSize);
  const startIndex = pageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No people found
      </div>
    );
  }

  const handleCardClick = (customer: Customer) => {
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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedData.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onClick={() => handleCardClick(customer)}
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
      />
    </>
  );
}
