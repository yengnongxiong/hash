"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createWhiteboardTask(
  organizationId: string,
  title: string,
  status: "todo" | "in_progress" | "done" = "todo",
  options?: {
    description?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    due_date?: string | null;
    color?: string;
    assigned_to?: string | null;
    labels?: string[];
    position_x?: number;
    position_y?: number;
  }
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
      priority: options?.priority || "medium",
      description: options?.description || null,
      due_date: options?.due_date || null,
      color: options?.color || "#ffffff",
      assigned_to: options?.assigned_to || null,
      labels: options?.labels || [],
      position_x: options?.position_x,
      position_y: options?.position_y,
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
  status: "todo" | "in_progress" | "done",
  position?: number
) {
  const supabase = await createClient();

  const updateData: {
    status: "todo" | "in_progress" | "done";
    updated_at: string;
    position?: number
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (position !== undefined) {
    updateData.position = position;
  }

  const { error } = await supabase
    .from("whiteboard_tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// Reorder tasks within a column or move to a new column with position
export async function reorderWhiteboardTasks(
  updates: { id: string; status: "todo" | "in_progress" | "done"; position: number }[]
) {
  const supabase = await createClient();

  // Update each task's position
  const promises = updates.map(({ id, status, position }) =>
    supabase
      .from("whiteboard_tasks")
      .update({
        status,
        position,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
  );

  const results = await Promise.all(promises);
  const error = results.find((r) => r.error)?.error;

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateWhiteboardTask(
  taskId: string,
  updates: {
    title?: string;
    description?: string | null;
    color?: string;
    status?: "todo" | "in_progress" | "done";
    priority?: "low" | "medium" | "high" | "urgent";
    due_date?: string | null;
    assigned_to?: string | null;
    labels?: string[];
    position_x?: number;
    position_y?: number;
  }
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

  revalidatePath("/whiteboard");
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

// Get team members for the organization
export async function getOrganizationMembers(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) {
    return { error: error.message };
  }

  return { success: true, members: data };
}

// Subtask actions
export async function createTaskSubtask(taskId: string, title: string) {
  const supabase = await createClient();

  // Get the max position
  const { data: existing } = await supabase
    .from("task_subtasks")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("task_subtasks")
    .insert({
      task_id: taskId,
      title,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, subtask: data };
}

export async function updateTaskSubtask(
  subtaskId: string,
  updates: { title?: string; completed?: boolean }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_subtasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subtaskId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteTaskSubtask(subtaskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_subtasks")
    .delete()
    .eq("id", subtaskId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getTaskSubtasks(taskId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("position");

  if (error) {
    return { error: error.message };
  }

  return { success: true, subtasks: data };
}

// Attachment actions
export async function uploadTaskAttachment(taskId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the organization ID from the task
  const { data: task } = await supabase
    .from("whiteboard_tasks")
    .select("organization_id")
    .eq("id", taskId)
    .single();

  if (!task) {
    return { error: "Task not found" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { error: "No file provided" };
  }

  // Sanitize filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${task.organization_id}/${taskId}/${Date.now()}-${sanitizedName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("task_attachments")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("task_attachments")
    .getPublicUrl(filePath);

  // Create attachment record
  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, attachment: data };
}

export async function deleteTaskAttachment(attachmentId: string) {
  const supabase = await createClient();

  // Get the attachment to find the storage path
  const { data: attachment } = await supabase
    .from("task_attachments")
    .select("file_url")
    .eq("id", attachmentId)
    .single();

  if (attachment) {
    // Extract path from URL
    const url = attachment.file_url;
    const pathMatch = url.match(/task_attachments\/(.+)/);
    if (pathMatch) {
      await supabase.storage.from("task_attachments").remove([pathMatch[1]]);
    }
  }

  const { error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getTaskAttachments(taskId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { success: true, attachments: data };
}

// Save sketch as attachment
export async function saveSketchAsAttachment(
  taskId: string,
  imageDataUrl: string,
  fileName: string = "sketch.png"
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the organization ID from the task
  const { data: task } = await supabase
    .from("whiteboard_tasks")
    .select("organization_id")
    .eq("id", taskId)
    .single();

  if (!task) {
    return { error: "Task not found" };
  }

  // Convert data URL to blob
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();

  const filePath = `${task.organization_id}/${taskId}/${Date.now()}-${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("task_attachments")
    .upload(filePath, blob, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("task_attachments")
    .getPublicUrl(filePath);

  // Create attachment record
  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      file_url: urlData.publicUrl,
      file_name: fileName,
      file_type: "image/png",
      file_size: blob.size,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, attachment: data };
}
