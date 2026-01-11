import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerModelVersion, ModelType } from "@/lib/ml/model-versioning";
import { Json } from "@/types/database";

const TOGETHER_WEBHOOK_SECRET = process.env.TOGETHER_WEBHOOK_SECRET;

interface TogetherWebhookPayload {
  event: "fine-tune.completed" | "fine-tune.failed" | "fine-tune.cancelled";
  data: {
    job_id: string;
    output_name?: string;
    status: string;
    trained_tokens?: number;
    training_steps?: number;
    error?: string;
  };
}

/**
 * Webhook handler for Together.ai fine-tuning job events
 *
 * Receives notifications when:
 * - fine-tune.completed: Job finished successfully
 * - fine-tune.failed: Job failed
 * - fine-tune.cancelled: Job was cancelled
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (TOGETHER_WEBHOOK_SECRET) {
      const authHeader = request.headers.get("authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");

      if (providedSecret !== TOGETHER_WEBHOOK_SECRET) {
        console.error("Together webhook: Invalid secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = await request.json() as TogetherWebhookPayload;

    if (!payload.event || !payload.data?.job_id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the training batch by Together job ID
    // Note: together_job_id and together_output_model are added via migration
    const { data: batch, error: batchError } = await supabase
      .from("training_batches")
      .select("*")
      .eq("together_job_id" as never, payload.data.job_id)
      .single() as {
        data: { id: string; model_type: string; together_output_model: string | null } | null;
        error: Error | null;
      };

    if (batchError || !batch) {
      console.error("Together webhook: Batch not found for job", payload.data.job_id);
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    switch (payload.event) {
      case "fine-tune.completed": {
        // Register the new model version
        const modelVersion = await registerModelVersion({
          modelType: batch.model_type as ModelType,
          version: `v${Date.now()}`,
          provider: "together",
          modelId: batch.together_output_model || payload.data.output_name || "",
          metadata: {
            trainedTokens: payload.data.trained_tokens,
            trainingSteps: payload.data.training_steps,
            togetherJobId: payload.data.job_id,
          },
        });

        await supabase
          .from("training_batches")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result_model_id: modelVersion.success ? modelVersion.modelVersionId : null,
            metrics: {
              trained_tokens: payload.data.trained_tokens,
              training_steps: payload.data.training_steps,
            } as Json,
          })
          .eq("id", batch.id);

        console.log(`Together webhook: Job ${payload.data.job_id} completed, model version ${modelVersion.modelVersionId}`);
        break;
      }

      case "fine-tune.failed":
      case "fine-tune.cancelled": {
        await supabase
          .from("training_batches")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: payload.data.error || `Job ${payload.event.replace("fine-tune.", "")}`,
          })
          .eq("id", batch.id);

        console.log(`Together webhook: Job ${payload.data.job_id} ${payload.event}`);
        break;
      }

      default:
        console.log(`Together webhook: Unknown event ${payload.event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Together webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
