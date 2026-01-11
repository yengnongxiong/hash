import { createAdminClient } from "@/lib/supabase/admin";
import { ExperimentsManager } from "@/components/admin/experiments-manager";
import { getExperimentResults } from "@/lib/ml/experiment-service";
import { ModelType } from "@/lib/ml/model-versioning";

type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "cancelled";

export default async function AdminExperimentsPage() {
  // Note: Admin session validation is handled by the (protected) layout
  const supabase = createAdminClient();

  // Fetch all experiments
  const { data: experiments } = await supabase
    .from("model_experiments")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch all model versions
  const { data: modelVersions } = await supabase
    .from("model_versions")
    .select("*")
    .order("created_at", { ascending: false });

  // Get results for running/completed experiments
  const experimentsWithResults = await Promise.all(
    (experiments || []).map(async (exp) => {
      let results = null;
      if (exp.status === "running" || exp.status === "completed") {
        const resultsData = await getExperimentResults(exp.id);
        if (resultsData.success) {
          results = resultsData.result;
        }
      }
      return {
        id: exp.id,
        name: exp.name,
        description: exp.description,
        modelType: exp.model_type as ModelType,
        controlModelId: exp.control_model_id,
        treatmentModelId: exp.treatment_model_id,
        trafficPercentage: exp.traffic_percentage ?? 50,
        status: (exp.status || "draft") as ExperimentStatus,
        startDate: exp.start_date,
        endDate: exp.end_date,
        successMetric: exp.success_metric || "accuracy",
        minimumSampleSize: exp.minimum_sample_size ?? 100,
        createdAt: exp.created_at || "",
        results,
      };
    })
  );

  // Transform model versions to match expected type
  const transformedModelVersions = (modelVersions || []).map((mv) => ({
    id: mv.id,
    model_type: mv.model_type,
    version: mv.version,
    provider: mv.provider,
    model_id: mv.model_id,
    is_active: mv.is_active ?? false,
    accuracy_score: mv.accuracy_score,
    created_at: mv.created_at || "",
  }));

  return (
    <ExperimentsManager
      experiments={experimentsWithResults}
      modelVersions={transformedModelVersions}
    />
  );
}
