/**
 * Document Retention Policy Management
 *
 * Handles automatic archival and deletion of documents based on configurable policies.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type RetentionAction = "archive" | "delete" | "notify";

export interface RetentionPolicy {
  id: string;
  organizationId: string | null;
  name: string;
  description?: string | null;
  enabled: boolean | null;
  // Criteria for matching documents
  criteria: {
    documentTypes?: string[];
    status?: string[];
    minAge?: number; // Days since creation
    maxAge?: number; // Days since creation
    hasCustomerId?: boolean;
  };
  // Action to take
  action: RetentionAction;
  // Days after which to take action
  retentionDays: number;
  // Notification settings
  notifyBefore?: number | null; // Days before action
  notifyEmails?: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RetentionJob {
  id: string;
  policyId: string;
  status: "pending" | "running" | "completed" | "failed";
  documentsProcessed: number;
  documentsArchived: number;
  documentsDeleted: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

/**
 * Get retention policies for an organization
 */
export async function getRetentionPolicies(
  organizationId: string
): Promise<{ success: boolean; policies?: RetentionPolicy[]; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("retention_policies")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    policies: data?.map((p) => ({
      id: p.id,
      organizationId: p.organization_id,
      name: p.name,
      description: p.description,
      enabled: p.enabled,
      criteria: p.criteria as RetentionPolicy["criteria"],
      action: p.action as RetentionAction,
      retentionDays: p.retention_days,
      notifyBefore: p.notify_before,
      notifyEmails: p.notify_emails,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
  };
}

/**
 * Create a new retention policy
 */
export async function createRetentionPolicy(
  policy: Omit<RetentionPolicy, "id" | "createdAt" | "updatedAt">
): Promise<{ success: boolean; policyId?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("retention_policies")
    .insert({
      organization_id: policy.organizationId,
      name: policy.name,
      description: policy.description,
      enabled: policy.enabled,
      criteria: policy.criteria,
      action: policy.action,
      retention_days: policy.retentionDays,
      notify_before: policy.notifyBefore,
      notify_emails: policy.notifyEmails,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, policyId: data.id };
}

/**
 * Update a retention policy
 */
export async function updateRetentionPolicy(
  policyId: string,
  updates: Partial<Omit<RetentionPolicy, "id" | "organizationId" | "createdAt" | "updatedAt">>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
  if (updates.criteria !== undefined) updateData.criteria = updates.criteria;
  if (updates.action !== undefined) updateData.action = updates.action;
  if (updates.retentionDays !== undefined) updateData.retention_days = updates.retentionDays;
  if (updates.notifyBefore !== undefined) updateData.notify_before = updates.notifyBefore;
  if (updates.notifyEmails !== undefined) updateData.notify_emails = updates.notifyEmails;

  const { error } = await supabase
    .from("retention_policies")
    .update(updateData)
    .eq("id", policyId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a retention policy
 */
export async function deleteRetentionPolicy(
  policyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("retention_policies")
    .delete()
    .eq("id", policyId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get documents matching a retention policy
 */
export async function getDocumentsForRetention(
  policy: RetentionPolicy
): Promise<{ success: boolean; documentIds?: string[]; count?: number; error?: string }> {
  const supabase = createAdminClient();

  if (!policy.organizationId) {
    return { success: false, error: "Policy has no organization ID" };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

  let query = supabase
    .from("documents")
    .select("id", { count: "exact" })
    .eq("organization_id", policy.organizationId)
    .lt("created_at", cutoffDate.toISOString())
    .is("deleted_at", null);

  // Apply criteria filters
  if (policy.criteria.documentTypes && policy.criteria.documentTypes.length > 0) {
    query = query.in("document_type", policy.criteria.documentTypes);
  }

  if (policy.criteria.status && policy.criteria.status.length > 0) {
    query = query.in("status", policy.criteria.status);
  }

  if (policy.criteria.hasCustomerId === true) {
    query = query.not("customer_id", "is", null);
  } else if (policy.criteria.hasCustomerId === false) {
    query = query.is("customer_id", null);
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    documentIds: data?.map((d) => d.id),
    count: count || 0,
  };
}

/**
 * Execute a retention policy (archive or delete documents)
 */
export async function executeRetentionPolicy(
  policy: RetentionPolicy
): Promise<RetentionJob> {
  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  // Create job record
  const { data: job } = await supabase
    .from("retention_jobs")
    .insert({
      policy_id: policy.id,
      status: "running",
      documents_processed: 0,
      documents_archived: 0,
      documents_deleted: 0,
      errors: [],
      started_at: startedAt,
    })
    .select()
    .single();

  const jobId = job?.id || "unknown";
  const errors: string[] = [];
  let documentsProcessed = 0;
  let documentsArchived = 0;
  let documentsDeleted = 0;

  try {
    // Get matching documents
    const matchResult = await getDocumentsForRetention(policy);

    if (!matchResult.success || !matchResult.documentIds) {
      throw new Error(matchResult.error || "Failed to get documents");
    }

    const documentIds = matchResult.documentIds;

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);

      if (policy.action === "archive") {
        // Soft delete (archive)
        const { error: archiveError } = await supabase
          .from("documents")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_reason: `Retention policy: ${policy.name}`,
          })
          .in("id", batch);

        if (archiveError) {
          errors.push(`Batch ${i / batchSize + 1}: ${archiveError.message}`);
        } else {
          documentsArchived += batch.length;
        }
      } else if (policy.action === "delete") {
        // Hard delete - first delete from storage, then from database
        for (const docId of batch) {
          try {
            const { data: doc } = await supabase
              .from("documents")
              .select("file_url")
              .eq("id", docId)
              .single();

            if (doc?.file_url) {
              const url = new URL(doc.file_url);
              const pathMatch = url.pathname.match(/\/documents\/(.+)/);
              if (pathMatch) {
                await supabase.storage.from("documents").remove([pathMatch[1]]);
              }
            }

            await supabase.from("documents").delete().eq("id", docId);
            documentsDeleted++;
          } catch (err) {
            errors.push(`Document ${docId}: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
        }
      }

      documentsProcessed += batch.length;

      // Update job progress
      await supabase
        .from("retention_jobs")
        .update({
          documents_processed: documentsProcessed,
          documents_archived: documentsArchived,
          documents_deleted: documentsDeleted,
          errors,
        })
        .eq("id", jobId);
    }

    // Mark job as completed
    await supabase
      .from("retention_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        documents_processed: documentsProcessed,
        documents_archived: documentsArchived,
        documents_deleted: documentsDeleted,
        errors,
      })
      .eq("id", jobId);
  } catch (err) {
    // Mark job as failed
    await supabase
      .from("retention_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        errors: [...errors, err instanceof Error ? err.message : "Unknown error"],
      })
      .eq("id", jobId);
  }

  return {
    id: jobId,
    policyId: policy.id,
    status: errors.length > 0 ? "completed" : "completed",
    documentsProcessed,
    documentsArchived,
    documentsDeleted,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Get default retention policies
 */
export function getDefaultRetentionPolicies(): Omit<RetentionPolicy, "id" | "organizationId" | "createdAt" | "updatedAt">[] {
  return [
    {
      name: "Archive Old Completed Documents",
      description: "Archive completed documents older than 2 years",
      enabled: false,
      criteria: {
        status: ["completed"],
      },
      action: "archive",
      retentionDays: 730, // 2 years
      notifyBefore: 30,
    },
    {
      name: "Delete Failed Documents",
      description: "Permanently delete failed documents older than 90 days",
      enabled: false,
      criteria: {
        status: ["failed"],
      },
      action: "delete",
      retentionDays: 90,
      notifyBefore: 7,
    },
    {
      name: "Archive Rejected Documents",
      description: "Archive rejected documents older than 1 year",
      enabled: false,
      criteria: {
        status: ["rejected"],
      },
      action: "archive",
      retentionDays: 365,
      notifyBefore: 14,
    },
  ];
}
