"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAppointment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return { error: "No organization found" };
  }

  const title = formData.get("title") as string;
  // Support both single customer_id and multiple customer_ids
  const customerIds = formData.getAll("customer_ids") as string[];
  const customerId = formData.get("customer_id") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const location = formData.get("location") as string;
  const description = formData.get("description") as string;
  const appointmentTypeId = formData.get("appointment_type_id") as string;

  if (!title || !startTime) {
    return { error: "Title and start time are required" };
  }

  // Use first customer_id for backward compatibility, store all in customer_ids array
  const primaryCustomerId = customerIds.length > 0 ? customerIds[0] : (customerId || null);
  const allCustomerIds = customerIds.length > 0 ? customerIds : (customerId ? [customerId] : []);

  const { error } = await supabase.from("appointments").insert({
    organization_id: userData.organization_id,
    customer_id: primaryCustomerId,
    customer_ids: allCustomerIds.length > 0 ? allCustomerIds : null,
    title,
    start_time: startTime,
    end_time: endTime || null,
    location: location || null,
    description: description || null,
    appointment_type_id: appointmentTypeId || null,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dates");
  revalidatePath("/people/appointments");
  return { success: true };
}

export async function updateAppointment(
  id: string,
  data: {
    title?: string;
    customer_id?: string | null;
    start_time?: string;
    end_time?: string | null;
    location?: string | null;
    description?: string | null;
    status?: "scheduled" | "completed" | "cancelled";
    appointment_type_id?: string | null;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dates");
  revalidatePath("/people/appointments");
  return { success: true };
}

export async function deleteAppointment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("appointments").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dates");
  revalidatePath("/people/appointments");
  return { success: true };
}

// Appointment Types
export async function createAppointmentType(name: string, color: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return { error: "No organization found" };
  }

  const { data, error } = await supabase
    .from("appointment_types")
    .insert({
      organization_id: userData.organization_id,
      name: name.trim(),
      color,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A type with this name already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/dates");
  return { success: true, data };
}

export async function deleteAppointmentType(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointment_types")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dates");
  return { success: true };
}
