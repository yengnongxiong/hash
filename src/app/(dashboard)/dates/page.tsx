import { createClient } from "@/lib/supabase/server";
import { DatesView } from "@/components/dates/dates-view";

export default async function DatesPage() {
  const supabase = await createClient();

  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentUserData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user?.id || "")
    .single();

  const organizationId = currentUserData?.organization_id;

  // Fetch appointments with customer data and type
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*, customers(name, company), appointment_types(id, name, color)")
    .order("start_time", { ascending: true });

  // Fetch all organization members (team) for assignee selection
  const { data: organizationMembers } = organizationId
    ? await supabase
        .from("users")
        .select("id, name, email")
        .eq("organization_id", organizationId)
        .order("name")
    : { data: [] };

  // Create a map of all users for both notes and assignees
  const allUsersMap: Record<string, { id: string; name: string | null; email: string }> = {};
  if (organizationMembers) {
    organizationMembers.forEach(user => {
      allUsersMap[user.id] = { id: user.id, name: user.name, email: user.email };
    });
  }

  // Also fetch users for notes attribution, created_by, updated_by that might not be in current org
  const notesUserIds = appointments?.filter(a => a.notes_updated_by).map(a => a.notes_updated_by as string) || [];
  const assigneeUserIds = appointments?.flatMap(a => a.assignee_ids || []) || [];
  const createdByUserIds = appointments?.filter(a => a.created_by).map(a => a.created_by as string) || [];
  const updatedByUserIds = appointments?.filter(a => a.updated_by).map(a => a.updated_by as string) || [];
  const allUserIds = [...new Set([...notesUserIds, ...assigneeUserIds, ...createdByUserIds, ...updatedByUserIds])];
  const missingUserIds = allUserIds.filter(id => !allUsersMap[id]);

  if (missingUserIds.length > 0) {
    const { data: additionalUsers } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", missingUserIds);

    if (additionalUsers) {
      additionalUsers.forEach(user => {
        allUsersMap[user.id] = { id: user.id, name: user.name, email: user.email };
      });
    }
  }

  // Add notes_user, assignees, created_by_user, updated_by_user to appointments
  const appointmentsWithUsers = appointments?.map(apt => ({
    ...apt,
    notes_user: apt.notes_updated_by ? allUsersMap[apt.notes_updated_by] || null : null,
    assignees: apt.assignee_ids?.map((id: string) => allUsersMap[id]).filter(Boolean) || null,
    created_by_user: apt.created_by ? allUsersMap[apt.created_by] || null : null,
    updated_by_user: apt.updated_by ? allUsersMap[apt.updated_by] || null : null,
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
        organizationMembers={organizationMembers || []}
      />
    </div>
  );
}
