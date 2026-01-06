"use client";

import { Customer } from "@/types/database";
import { CustomerCard } from "./customer-card";
import { useRouter } from "next/navigation";

interface CustomerGalleryProps {
  data: Customer[];
}

export function CustomerGallery({ data }: CustomerGalleryProps) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No customers found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onClick={() => {
            // For now, just log - could open a detail modal later
            console.log("Customer clicked:", customer.id);
          }}
        />
      ))}
    </div>
  );
}
