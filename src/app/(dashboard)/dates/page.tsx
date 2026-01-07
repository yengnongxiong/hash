import { createClient } from "@/lib/supabase/server";
import { DatesView } from "@/components/dates/dates-view";

export default async function DatesPage() {
  const supabase = await createClient();

  // Fetch appointments with customer data and type
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*, customers(name, company), appointment_types(id, name, color)")
    .order("start_time", { ascending: true });

  // Fetch users for notes attribution (only if there are appointments with notes)
  const notesUserIds = appointments?.filter(a => a.notes_updated_by).map(a => a.notes_updated_by as string) || [];
  const uniqueUserIds = [...new Set(notesUserIds)];

  let usersMap: Record<string, { name: string | null; email: string }> = {};
  if (uniqueUserIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", uniqueUserIds);

    if (users) {
      usersMap = users.reduce((acc, user) => {
        acc[user.id] = { name: user.name, email: user.email };
        return acc;
      }, {} as Record<string, { name: string | null; email: string }>);
    }
  }

  // Add notes_user to appointments
  const appointmentsWithUsers = appointments?.map(apt => ({
    ...apt,
    notes_user: apt.notes_updated_by ? usersMap[apt.notes_updated_by] || null : null,
  })) || [];

  // Fetch customers for creating new appointments
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, company, customer_number")
    .order("name");

  // Fetch appointment types for the organization
  const { data: appointmentTypes } = await supabase
    .from("appointment_types")
    .select("*")
    .order("name");

  if (appointmentsError) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          Error loading appointments: {appointmentsError.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dates</h1>
        <p className="text-muted-foreground">
          Manage appointments and scheduled events.
        </p>
      </div>

      <DatesView
        appointments={appointmentsWithUsers}
        customers={customers || []}
        appointmentTypes={appointmentTypes || []}
      />
    </div>
  );
}
