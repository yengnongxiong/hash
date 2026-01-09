"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Customer, PersonTag, CustomerWithUserInfo } from "@/types/database";
import { DataTable } from "@/components/data-table/data-table";
import { createCustomerColumns } from "./customer-columns";
import { CustomerDetailDialog } from "./customer-detail-dialog";
import { updateCustomerField, deleteCustomers } from "@/app/(dashboard)/people/actions";
import { toast } from "sonner";

interface CustomerTableProps {
  initialData: CustomerWithUserInfo[];
  personTags: PersonTag[];
}

export function CustomerTable({ initialData, personTags }: CustomerTableProps) {
  const [data, setData] = useState<CustomerWithUserInfo[]>(initialData);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithUserInfo | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const router = useRouter();

  // Sync local state when initialData changes (e.g., after router.refresh())
  useEffect(() => {
    setData(initialData);
  }, [initialData]);
  const [isPending, startTransition] = useTransition();

  const columns = useMemo(() => createCustomerColumns(personTags), [personTags]);

  // Default column visibility: show ID, Name, Company, Email, Phone, Tags, Created, Updated
  // Hide: Address, Notes
  const defaultColumnVisibility = {
    address: false,
    notes: false,
  };

  const handleViewCustomer = (customer: CustomerWithUserInfo) => {
    setSelectedCustomer(customer);
    setDetailDialogOpen(true);
  };

  const handleRowUpdate = async (
    rowIndex: number,
    columnId: string,
    value: unknown
  ) => {
    const customer = data[rowIndex];
    if (!customer) return;

    // Optimistic update
    const previousData = [...data];
    setData((prev) =>
      prev.map((item, index) =>
        index === rowIndex ? { ...item, [columnId]: value } : item
      )
    );

    startTransition(async () => {
      const result = await updateCustomerField(customer.id, columnId, value);

      if (result.error) {
        // Revert on error
        setData(previousData);
        toast.error("Update failed", {
          description: result.error,
        });
      } else {
        toast.success("Updated", {
          description: `${columnId} has been updated`,
        });
      }
    });
  };

  const handleRowDelete = async (rows: Customer[]) => {
    const ids = rows.map((row) => row.id);

    // Optimistic update
    const previousData = [...data];
    setData((prev) => prev.filter((item) => !ids.includes(item.id)));

    startTransition(async () => {
      const result = await deleteCustomers(ids);

      if (result.error) {
        // Revert on error
        setData(previousData);
        toast.error("Delete failed", {
          description: result.error,
        });
      } else {
        toast.success("Deleted", {
          description: `${result.count} ${result.count === 1 ? "person" : "people"} deleted`,
        });
      }
    });
  };

  return (
    <>
      <div className={isPending ? "opacity-70 pointer-events-none" : ""}>
        <DataTable
          columns={columns}
          data={data}
          onRowUpdate={handleRowUpdate}
          onRowDelete={handleRowDelete}
          onViewRow={handleViewCustomer}
          defaultColumnVisibility={defaultColumnVisibility}
        />
      </div>

      <CustomerDetailDialog
        customer={selectedCustomer}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdate={() => router.refresh()}
        personTags={personTags}
      />
    </>
  );
}
