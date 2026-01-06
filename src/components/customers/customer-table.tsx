"use client";

import { useState, useTransition, useEffect } from "react";
import { Customer } from "@/types/database";
import { DataTable } from "@/components/data-table/data-table";
import { customerColumns } from "./customer-columns";
import { updateCustomerField, deleteCustomers } from "@/app/(dashboard)/customers/actions";
import { toast } from "sonner";

interface CustomerTableProps {
  initialData: Customer[];
}

export function CustomerTable({ initialData }: CustomerTableProps) {
  const [data, setData] = useState<Customer[]>(initialData);

  // Sync local state when initialData changes (e.g., after router.refresh())
  useEffect(() => {
    setData(initialData);
  }, [initialData]);
  const [isPending, startTransition] = useTransition();

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
          description: `${result.count} customer(s) deleted`,
        });
      }
    });
  };

  return (
    <div className={isPending ? "opacity-70 pointer-events-none" : ""}>
      <DataTable
        columns={customerColumns}
        data={data}
        searchKey="name"
        searchPlaceholder="Search customers..."
        onRowUpdate={handleRowUpdate}
        onRowDelete={handleRowDelete}
      />
    </div>
  );
}
