import { createClient } from "@/lib/supabase/server";
import { CustomersView } from "@/components/customers/customers-view";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { CustomerWithUserInfo } from "@/types/database";

export default async function CustomersPage() {
  const supabase = await createClient();

  const [customersResult, tagsResult, usersResult] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .order("updated_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("person_tags")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("users")
      .select("id, name, email"),
  ]);

  // Create a map of user IDs to user info
  const userMap = new Map<string, { id: string; name: string | null; email: string | null }>();
  if (usersResult.data) {
    for (const user of usersResult.data) {
      userMap.set(user.id, user);
    }
  }

  // Enrich customers with user info
  const customersWithUserInfo: CustomerWithUserInfo[] = (customersResult.data || []).map((customer) => ({
    ...customer,
    created_by_user: customer.created_by ? userMap.get(customer.created_by) || null : null,
    updated_by_user: customer.updated_by ? userMap.get(customer.updated_by) || null : null,
  }));

  if (customersResult.error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading people: {customersResult.error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-muted-foreground">
            Manage your contacts and clients. View to edit or delete.
          </p>
        </div>
        <CreateCustomerDialog personTags={tagsResult.data || []} />
      </div>

      <CustomersView initialData={customersWithUserInfo} personTags={tagsResult.data || []} />
    </div>
  );
}
