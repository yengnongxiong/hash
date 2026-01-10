import { createClient } from "@/lib/supabase/server";
import { AppointmentsView } from "@/components/customers/appointments/appointments-view";

export default async function AppointmentsPage() {
  const supabase = await createClient();

  // Fetch appointments without relationship joins
  const { data: appointmentsRaw, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*")
    .order("start_time", { ascending: true });

  // Fetch customers for appointments
  const customerIds = [...new Set((appointmentsRaw || []).filter(a => a.customer_id).map(a => a.customer_id as string))];
  let customersMap: Record<string, { name: string; company: string | null }> = {};
  if (customerIds.length > 0) {
    const { data: appointmentCustomers } = await supabase
      .from("customers")
      .select("id, name, company")
      .in("id", customerIds);
    if (appointmentCustomers) {
      customersMap = Object.fromEntries(appointmentCustomers.map(c => [c.id, { name: c.name, company: c.company }]));
    }
  }

  // Fetch appointment types for appointments
  const typeIds = [...new Set((appointmentsRaw || []).filter(a => a.appointment_type_id).map(a => a.appointment_type_id as string))];
  let typesMap: Record<string, { id: string; name: string; color: string }> = {};
  if (typeIds.length > 0) {
    const { data: types } = await supabase
      .from("appointment_types")
      .select("id, name, color")
      .in("id", typeIds);
    if (types) {
      typesMap = Object.fromEntries(types.map(t => [t.id, { id: t.id, name: t.name, color: t.color }]));
    }
  }

  // Merge related data into appointments
  const appointments = (appointmentsRaw || []).map(apt => ({
    ...apt,
    customers: apt.customer_id ? customersMap[apt.customer_id] || null : null,
    appointment_types: apt.appointment_type_id ? typesMap[apt.appointment_type_id] || null : null,
  }));

  const { data: customers } = await supabase
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
