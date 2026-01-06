"use client";

import { useState } from "react";
import { Customer } from "@/types/database";
import { CustomerCard } from "./customer-card";
import { CustomerDetailDialog } from "./customer-detail-dialog";
import { useRouter } from "next/navigation";

interface CustomerGalleryProps {
  data: Customer[];
}

export function CustomerGallery({ data }: CustomerGalleryProps) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        {data.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onClick={() => handleCardClick(customer)}
          />
        ))}
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
