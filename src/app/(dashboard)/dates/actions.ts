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

export async function updateAppointmentNotes(id: string, notes: string | null) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      notes: notes || null,
      notes_updated_by: user.id,
      notes_updated_at: new Date().toISOString(),
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

interface CSVDateRow {
  title: string;
  date: string;
  time?: string;
  end_time?: string;
  person?: string;
  type?: string;
  location?: string;
  description?: string;
  status?: string;
}

export async function importDatesFromCSV(
  rows: CSVDateRow[],
  customerMap: Map<string, string>,
  typeMap: Map<string, string>
): Promise<{ imported?: number; errors?: string[]; error?: string }> {
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

  const errors: string[] = [];
  const toInsert: {
    organization_id: string;
    customer_id: string | null;
    customer_ids: string[] | null;
    title: string;
    start_time: string;
    end_time: string | null;
    location: string | null;
    description: string | null;
    status: "scheduled" | "completed" | "cancelled";
    appointment_type_id: string | null;
    created_by: string;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Account for header row and 0-indexing

    // Validate required fields
    if (!row.title?.trim()) {
      errors.push(`Row ${rowNum}: Title is required`);
      continue;
    }

    if (!row.date?.trim()) {
      errors.push(`Row ${rowNum}: Date is required`);
      continue;
    }

    // Parse date and time
    let startTime: Date;
    try {
      // Try to parse the date
      const dateStr = row.date.trim();
      const timeStr = row.time?.trim() || "09:00 AM";

      // Parse date (support various formats)
      const dateParts = dateStr.match(/(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})/);
      if (dateParts) {
        // Determine if it's YYYY-MM-DD or MM-DD-YYYY
        let year: number, month: number, day: number;
        if (dateParts[1].length === 4) {
          // YYYY-MM-DD
          year = parseInt(dateParts[1]);
          month = parseInt(dateParts[2]) - 1;
          day = parseInt(dateParts[3]);
        } else {
          // MM-DD-YYYY or DD-MM-YYYY (assuming MM-DD-YYYY for US format)
          month = parseInt(dateParts[1]) - 1;
          day = parseInt(dateParts[2]);
          year = parseInt(dateParts[3]);
        }
        startTime = new Date(year, month, day);
      } else {
        // Try native parsing
        startTime = new Date(dateStr);
      }

      if (isNaN(startTime.getTime())) {
        errors.push(`Row ${rowNum}: Invalid date format "${row.date}"`);
        continue;
      }

      // Parse time
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3]?.toUpperCase();

        if (period === "PM" && hours < 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        startTime.setHours(hours, minutes, 0, 0);
      }
    } catch {
      errors.push(`Row ${rowNum}: Invalid date/time format`);
      continue;
    }

    // Parse end time if provided
    let endTime: Date | null = null;
    if (row.end_time?.trim()) {
      try {
        const endTimeStr = row.end_time.trim();
        const timeMatch = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          endTime = new Date(startTime);
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3]?.toUpperCase();

          if (period === "PM" && hours < 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;

          endTime.setHours(hours, minutes, 0, 0);
        }
      } catch {
        // Ignore invalid end time
      }
    }

    // Look up person by name, company, or ID
    let customerId: string | null = null;
    if (row.person?.trim()) {
      const personLower = row.person.trim().toLowerCase();
      customerId = customerMap.get(personLower) || null;
    }

    // Look up type by name
    let appointmentTypeId: string | null = null;
    if (row.type?.trim()) {
      const typeLower = row.type.trim().toLowerCase();
      appointmentTypeId = typeMap.get(typeLower) || null;
    }

    // Parse status
    let status: "scheduled" | "completed" | "cancelled" = "scheduled";
    if (row.status?.trim()) {
      const statusLower = row.status.trim().toLowerCase();
      if (statusLower === "completed") status = "completed";
      else if (statusLower === "cancelled" || statusLower === "canceled") status = "cancelled";
    }

    toInsert.push({
      organization_id: userData.organization_id,
      customer_id: customerId,
      customer_ids: customerId ? [customerId] : null,
      title: row.title.trim(),
      start_time: startTime.toISOString(),
      end_time: endTime?.toISOString() || null,
      location: row.location?.trim() || null,
      description: row.description?.trim() || null,
      status,
      appointment_type_id: appointmentTypeId,
      created_by: user.id,
    });
  }

  if (toInsert.length === 0) {
    return { imported: 0, errors };
  }

  const { error } = await supabase.from("appointments").insert(toInsert);

  if (error) {
    return { error: error.message, errors };
  }

  revalidatePath("/dates");
  revalidatePath("/people/appointments");
  return { imported: toInsert.length, errors };
}
