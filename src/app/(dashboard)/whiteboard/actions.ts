"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createWhiteboardTask(
  organizationId: string,
  title: string,
  status: "todo" | "in_progress" | "done" = "todo"
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("whiteboard_tasks")
    .insert({
      organization_id: organizationId,
      title,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, task: data };
}

export async function updateWhiteboardTaskStatus(
  taskId: string,
  status: "todo" | "in_progress" | "done"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("whiteboard_tasks")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateWhiteboardTask(
  taskId: string,
  updates: { title?: string; description?: string; color?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("whiteboard_tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteWhiteboardTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("whiteboard_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
