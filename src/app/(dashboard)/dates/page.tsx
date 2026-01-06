import { createClient } from "@/lib/supabase/server";
import { DatesView } from "@/components/dates/dates-view";

export default async function DatesPage() {
  const supabase = await createClient();

  // Fetch appointments with customer data and type
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*, customers(name, company), appointment_types(id, name, color)")
    .order("start_time", { ascending: true });

  // Fetch customers for creating new appointments
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, company")
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
        appointments={appointments || []}
        customers={customers || []}
        appointmentTypes={appointmentTypes || []}
      />
    </div>
  );
}
