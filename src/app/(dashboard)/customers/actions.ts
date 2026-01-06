"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Generates a 6-character random alphanumeric ID
 * Format: mix of uppercase letters and numbers (e.g., "A3B7K2", "9X4M2P")
 */
function generateCustomerId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded I, O, 0, 1 to avoid confusion
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
});

export async function getCustomers(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });

  // Global search across multiple columns
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${searchTerm},company.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},address.ilike.${searchTerm},notes.ilike.${searchTerm}`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();

  // Get user's organization
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

  // Parse form data
  const rawData = {
    name: formData.get("name") as string,
    company: (formData.get("company") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    address: (formData.get("address") as string) || null,
    tags: formData.get("tags")
      ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean)
      : [],
    notes: (formData.get("notes") as string) || null,
  };

  const result = customerSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // Generate unique customer ID
  const customerId = generateCustomerId();

  const { error } = await supabase.from("customers").insert({
    ...result.data,
    customer_number: customerId,
    organization_id: userData.organization_id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/people");
  return { success: true };
}

export async function updateCustomerField(
  customerId: string,
  field: string,
  value: unknown
) {
  const supabase = await createClient();

  // Validate the field is allowed
  const allowedFields = [
    "name",
    "company",
    "email",
    "phone",
    "address",
    "tags",
    "notes",
  ];

  if (!allowedFields.includes(field)) {
    return { error: "Invalid field" };
  }

  // For email, validate format if not empty
  if (field === "email" && value && typeof value === "string") {
    const emailSchema = z.string().email();
    const emailResult = emailSchema.safeParse(value);
    if (!emailResult.success) {
      return { error: "Invalid email format" };
    }
  }

  // For name, ensure it's not empty
  if (field === "name" && (!value || (typeof value === "string" && !value.trim()))) {
    return { error: "Name cannot be empty" };
  }

  const { error } = await supabase
    .from("customers")
    .update({
      [field]: value === "" ? null : value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/people");
  return { success: true };
}

export async function deleteCustomers(customerIds: string[]) {
  const supabase = await createClient();

  if (customerIds.length === 0) {
    return { error: "No customers selected" };
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .in("id", customerIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/people");
  return { success: true, count: customerIds.length };
}

// Appointment actions
const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  customer_id: z.string().optional().nullable(),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  location: z.string().optional().nullable(),
});

export async function getAppointments() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("*, customers(name, company)")
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

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

  const rawData = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    customer_id: (formData.get("customer_id") as string) || null,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    location: (formData.get("location") as string) || null,
  };

  const result = appointmentSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await supabase.from("appointments").insert({
    ...result.data,
    organization_id: userData.organization_id,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers/appointments");
  return { success: true };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "scheduled" | "completed" | "cancelled"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", appointmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers/appointments");
  return { success: true };
}

export async function deleteAppointment(appointmentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers/appointments");
  return { success: true };
}

// Bulk CSV import
interface CSVCustomer {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  tags?: string;
  notes?: string;
}

export async function importCustomersFromCSV(customers: CSVCustomer[]) {
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

  // Validate and transform customers
  const validCustomers: Array<{
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    tags: string[];
    notes: string | null;
    organization_id: string;
    customer_number: string;
  }> = [];
  const errors: string[] = [];

  for (let i = 0; i < customers.length; i++) {
    const row = customers[i];
    const rowNum = i + 2; // +2 because CSV has header and is 1-indexed

    // Validate name is required
    if (!row.name || !row.name.trim()) {
      errors.push(`Row ${rowNum}: Name is required`);
      continue;
    }

    // Validate email format if provided
    if (row.email && row.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email.trim())) {
        errors.push(`Row ${rowNum}: Invalid email format`);
        continue;
      }
    }

    validCustomers.push({
      name: row.name.trim(),
      company: row.company?.trim() || null,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      address: row.address?.trim() || null,
      tags: row.tags
        ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      notes: row.notes?.trim() || null,
      organization_id: userData.organization_id,
      customer_number: generateCustomerId(),
    });
  }

  if (validCustomers.length === 0) {
    return {
      error: "No valid customers to import",
      errors,
      imported: 0,
    };
  }

  // Insert valid customers
  const { error: insertError } = await supabase
    .from("customers")
    .insert(validCustomers);

  if (insertError) {
    return { error: insertError.message, errors, imported: 0 };
  }

  revalidatePath("/customers");
  revalidatePath("/people");
  return {
    success: true,
    imported: validCustomers.length,
    errors,
    total: customers.length,
  };
}
