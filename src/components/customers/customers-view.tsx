"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Customer, PersonTag, CustomerWithUserInfo } from "@/types/database";
import { CustomerTable } from "./customer-table";
import { CustomerGallery } from "./customer-gallery";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, LayoutGrid, List, Download, Loader2 } from "lucide-react";
import { getCustomers } from "@/app/(dashboard)/people/actions";
import { exportToCSV } from "@/lib/export";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { CSVImportDialog } from "./csv-import-dialog";
import { PersonTagsDialog } from "./person-tags-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomersViewProps {
  initialData: CustomerWithUserInfo[];
  personTags: PersonTag[];
}

export function CustomersView({ initialData, personTags }: CustomersViewProps) {
  const [data, setData] = useState<CustomerWithUserInfo[]>(initialData);
  const [view, setView] = useState<"table" | "gallery">("table");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const debouncedSearch = useDebounce(search, 300);

  // Sync when initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== "") {
      startTransition(async () => {
        try {
          const results = await getCustomers(debouncedSearch);
          setData(results || []);
        } catch (error) {
          console.error("Search error:", error);
        }
      });
    } else {
      setData(initialData);
    }
  }, [debouncedSearch, initialData]);

  const handleExport = useCallback(() => {
    exportToCSV(data as unknown as Record<string, unknown>[], "people", [
      { key: "customer_number", label: "ID" },
      { key: "name", label: "Name" },
      { key: "company", label: "Company" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "tags", label: "Tags", format: (v) => (v as string[])?.join(", ") || "" },
      { key: "notes", label: "Notes" },
      { key: "created_at", label: "Created" },
      { key: "updated_at", label: "Updated" },
    ]);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as "table" | "gallery")}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1.5">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Gallery</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tags Management */}
        <PersonTagsDialog personTags={personTags} />

        {/* Import */}
        <CSVImportDialog />

        {/* Export */}
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Results count */}
      {search && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            `${data.length} result${data.length !== 1 ? "s" : ""} found`
          )}
        </p>
      )}

      {/* Content */}
      {isPending && search ? (
        <SearchSkeleton view={view} />
      ) : (
        <div>
          {view === "table" ? (
            <CustomerTable initialData={data} personTags={personTags} />
          ) : (
            <CustomerGallery data={data} personTags={personTags} />
          )}
        </div>
      )}
    </div>
  );
}

function SearchSkeleton({ view }: { view: "table" | "gallery" }) {
  if (view === "table") {
    return (
      <div className="rounded-md border">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="pt-2 flex gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
