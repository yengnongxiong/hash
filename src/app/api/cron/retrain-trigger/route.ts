import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTrainingBatch, startFineTuningJob } from "@/lib/ml/training-export";
import { ModelType } from "@/lib/ml/model-versioning";

const CRON_SECRET = process.env.CRON_SECRET;

// Minimum number of unused corrections to trigger retraining
const MIN_CORRECTIONS_FOR_RETRAINING = 50;

// Minimum days since last training batch
const MIN_DAYS_BETWEEN_TRAINING = 7;

/**
 * Cron job to automatically trigger retraining when enough corrections accumulate
 *
 * This should run daily to check if retraining conditions are met:
 * 1. At least MIN_CORRECTIONS_FOR_RETRAINING unused corrections
 * 2. At least MIN_DAYS_BETWEEN_TRAINING days since last training
 *
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/retrain-trigger",
 *     "schedule": "0 0 * * *"
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

    // Check for active training jobs - don't start new one if still processing
    const { data: activeBatches } = await supabase
      .from("training_batches")
      .select("id")
      .eq("status", "processing")
      .limit(1);

    if (activeBatches && activeBatches.length > 0) {
      return NextResponse.json({
        success: true,
        triggered: false,
        reason: "Training job already in progress",
      });
    }

    // Check when last training batch was created
    const { data: lastBatch } = await supabase
      .from("training_batches")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastBatch?.created_at) {
      const lastBatchDate = new Date(lastBatch.created_at);
      const daysSinceLastBatch = (Date.now() - lastBatchDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastBatch < MIN_DAYS_BETWEEN_TRAINING) {
        return NextResponse.json({
          success: true,
          triggered: false,
          reason: `Only ${Math.floor(daysSinceLastBatch)} days since last training (min: ${MIN_DAYS_BETWEEN_TRAINING})`,
        });
      }
    }

    // Count unused corrections
    const { count: unusedCorrections } = await supabase
      .from("field_corrections")
      .select("*", { count: "exact", head: true })
      .is("training_batch_id", null);

    if (!unusedCorrections || unusedCorrections < MIN_CORRECTIONS_FOR_RETRAINING) {
      return NextResponse.json({
        success: true,
        triggered: false,
        reason: `Only ${unusedCorrections || 0} unused corrections (min: ${MIN_CORRECTIONS_FOR_RETRAINING})`,
      });
    }

    // Create training batch
    const batchResult = await createTrainingBatch("document_extraction" as ModelType);

    if (!batchResult.success || !batchResult.batch) {
      return NextResponse.json({
        success: false,
        triggered: false,
        error: batchResult.error || "Failed to create training batch",
      });
    }

    // Start fine-tuning job
    const jobResult = await startFineTuningJob(batchResult.batch.id);

    if (!jobResult.success) {
      return NextResponse.json({
        success: false,
        triggered: true,
        batchId: batchResult.batch.id,
        error: jobResult.error || "Failed to start fine-tuning job",
      });
    }

    console.log(`Retrain trigger: Started job ${jobResult.jobId} for batch ${batchResult.batch.id}`);

    return NextResponse.json({
      success: true,
      triggered: true,
      batchId: batchResult.batch.id,
      jobId: jobResult.jobId,
      trainingExamples: batchResult.batch.examples.length,
      validationExamples: batchResult.batch.validationExamples.length,
    });
  } catch (error) {
    console.error("Retrain trigger cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron job failed" },
      { status: 500 }
    );
  }
}
