import { createClient } from "@/lib/supabase/server";
import { AppointmentsView } from "@/components/customers/appointments/appointments-view";

export default async function AppointmentsPage() {
  const supabase = await createClient();

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*, customers(name, company), appointment_types(id, name, color)")
    .order("start_time", { ascending: true });

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, company, customer_number")
    .order("name");

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
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-muted-foreground">
          Schedule and manage appointments.
        </p>
      </div>

      <AppointmentsView
        initialData={appointments || []}
        customers={customers || []}
        appointmentTypes={appointmentTypes || []}
      />
    </div>
  );
}
