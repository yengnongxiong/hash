"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Customer } from "@/types/database";
import { CustomerTable } from "./customer-table";
import { CustomerGallery } from "./customer-gallery";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, LayoutGrid, List, Download } from "lucide-react";
import { getCustomers } from "@/app/(dashboard)/customers/actions";
import { exportToCSV } from "@/lib/export";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface CustomersViewProps {
  initialData: Customer[];
}

export function CustomersView({ initialData }: CustomersViewProps) {
  const [data, setData] = useState<Customer[]>(initialData);
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
    exportToCSV(data, "customers", [
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
            placeholder="Search all fields..."
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

        {/* Export */}
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Results count */}
      {search && (
        <p className="text-sm text-muted-foreground">
          {isPending ? "Searching..." : `${data.length} result${data.length !== 1 ? "s" : ""} found`}
        </p>
      )}

      {/* Content */}
      <div className={isPending ? "opacity-70" : ""}>
        {view === "table" ? (
          <CustomerTable initialData={data} />
        ) : (
          <CustomerGallery data={data} />
        )}
      </div>
    </div>
  );
}
