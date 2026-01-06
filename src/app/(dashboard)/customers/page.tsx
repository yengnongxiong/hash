import { createClient } from "@/lib/supabase/server";
import { CustomersView } from "@/components/customers/customers-view";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading customers: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database. Click any cell to edit inline.
          </p>
        </div>
        <CreateCustomerDialog />
      </div>

      <CustomersView initialData={customers || []} />
    </div>
  );
}
