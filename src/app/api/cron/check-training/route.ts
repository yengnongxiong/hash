import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkFineTuningJobStatus } from "@/lib/ml/training-export";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job to check status of active Together.ai fine-tuning jobs
 *
 * This serves as a polling fallback in case webhooks are not received.
 * Should be called every 5-10 minutes via Vercel Cron or similar.
 *
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-training",
 *     "schedule": "0/10 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const supabase = createAdminClient();

    // Find all processing batches with Together job IDs
    // Note: together_job_id is added via migration and may not be in generated types
    const { data: processingBatches, error } = await supabase
      .from("training_batches")
      .select("*")
      .eq("status", "processing") as {
        data: Array<{ id: string; together_job_id: string | null }> | null;
        error: Error | null;
      };

    // Filter to only batches with Together job IDs
    const batchesWithJobs = (processingBatches || []).filter(b => b.together_job_id);

    if (error) {
      console.error("Check training cron: Failed to fetch batches", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (batchesWithJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active training jobs to check",
        checked: 0,
      });
    }

    const results: Array<{
      batchId: string;
      status: string;
      error?: string;
    }> = [];

    for (const batch of batchesWithJobs) {
      const result = await checkFineTuningJobStatus(batch.id);
      results.push({
        batchId: batch.id,
        status: result.status || "unknown",
        error: result.error,
      });
    }

    const completed = results.filter(r => r.status === "completed").length;
    const failed = results.filter(r => r.status === "failed" || r.status === "cancelled").length;
    const stillRunning = results.filter(r => !["completed", "failed", "cancelled"].includes(r.status)).length;

    console.log(`Check training cron: ${completed} completed, ${failed} failed, ${stillRunning} still running`);

    return NextResponse.json({
      success: true,
      checked: results.length,
      completed,
      failed,
      stillRunning,
      results,
    });
  } catch (error) {
    console.error("Check training cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron job failed" },
      { status: 500 }
    );
  }
}
