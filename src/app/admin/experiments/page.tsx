import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin/auth";
import { ExperimentsManager } from "@/components/admin/experiments-manager";
import { createClient } from "@/lib/supabase/server";
import { getExperiments, getExperimentResults } from "@/lib/ml/experiment-service";

export default async function ExperimentsPage() {
  // Check if admin session is valid
  const isVerified = await isAdminSessionValid();

  if (!isVerified) {
    redirect("/admin/verify");
  }

  const supabase = await createClient();

  // Fetch all experiments
  const experimentsResult = await getExperiments();
  const experiments = experimentsResult.experiments || [];

  // Fetch results for running/completed experiments
  const experimentsWithResults = await Promise.all(
    experiments.map(async (exp) => {
      if (exp.status === "running" || exp.status === "completed") {
        const resultsResult = await getExperimentResults(exp.id);
        return {
          ...exp,
          results: resultsResult.result,
        };
      }
      return { ...exp, results: null };
    })
  );

  // Fetch model versions for creating new experiments
  const { data: modelVersionsData } = await supabase
    .from("model_versions")
    .select("*")
    .order("created_at", { ascending: false });

  // Map to ensure non-null boolean for is_active
  const modelVersions = (modelVersionsData || []).map((mv) => ({
    id: mv.id,
    model_type: mv.model_type,
    version: mv.version,
    provider: mv.provider || "",
    model_id: mv.model_id || "",
    is_active: mv.is_active ?? false,
    accuracy_score: mv.accuracy_score,
    created_at: mv.created_at || "",
  }));

  return (
    <ExperimentsManager
      experiments={experimentsWithResults}
      modelVersions={modelVersions}
    />
  );
}
