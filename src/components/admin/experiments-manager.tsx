"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  FlaskConical,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Users,
  BarChart3,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  createExperiment,
  startExperiment,
  pauseExperiment,
  completeExperiment,
  cancelExperiment,
  ExperimentResult,
} from "@/lib/ml/experiment-service";
import { ModelType } from "@/lib/ml/model-versioning";

interface Experiment {
  id: string;
  name: string;
  description: string | null;
  modelType: ModelType;
  controlModelId: string;
  treatmentModelId: string;
  trafficPercentage: number;
  status: "draft" | "running" | "paused" | "completed" | "cancelled";
  startDate: string | null;
  endDate: string | null;
  successMetric: string;
  minimumSampleSize: number;
  createdAt: string;
  results?: ExperimentResult | null;
}

interface ModelVersion {
  id: string;
  model_type: string;
  version: string;
  provider: string;
  model_id: string;
  is_active: boolean;
  accuracy_score: number | null;
  created_at: string;
}

interface ExperimentsManagerProps {
  experiments: Experiment[];
  modelVersions: ModelVersion[];
}

const statusColors = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  running: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function ExperimentsManager({ experiments, modelVersions }: ExperimentsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [newExperiment, setNewExperiment] = useState({
    name: "",
    description: "",
    modelType: "extraction" as ModelType,
    controlModelId: "",
    treatmentModelId: "",
    trafficPercentage: 50,
    successMetric: "correction_rate",
    minimumSampleSize: 100,
  });
  const router = useRouter();

  const handleCreateExperiment = () => {
    if (!newExperiment.name || !newExperiment.controlModelId || !newExperiment.treatmentModelId) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const result = await createExperiment({
        name: newExperiment.name,
        description: newExperiment.description,
        modelType: newExperiment.modelType,
        controlModelId: newExperiment.controlModelId,
        treatmentModelId: newExperiment.treatmentModelId,
        trafficPercentage: newExperiment.trafficPercentage,
        successMetric: newExperiment.successMetric as "accuracy" | "confidence" | "correction_rate",
        minimumSampleSize: newExperiment.minimumSampleSize,
      });

      if (result.success) {
        toast.success("Experiment created");
        setCreateOpen(false);
        setNewExperiment({
          name: "",
          description: "",
          modelType: "extraction",
          controlModelId: "",
          treatmentModelId: "",
          trafficPercentage: 50,
          successMetric: "correction_rate",
          minimumSampleSize: 100,
        });
        router.refresh();
      } else {
        toast.error("Failed to create experiment", { description: result.error });
      }
    });
  };

  const handleStartExperiment = (experimentId: string) => {
    startTransition(async () => {
      const result = await startExperiment(experimentId);
      if (result.success) {
        toast.success("Experiment started");
        router.refresh();
      } else {
        toast.error("Failed to start experiment", { description: result.error });
      }
    });
  };

  const handlePauseExperiment = (experimentId: string) => {
    startTransition(async () => {
      const result = await pauseExperiment(experimentId);
      if (result.success) {
        toast.success("Experiment paused");
        router.refresh();
      } else {
        toast.error("Failed to pause experiment", { description: result.error });
      }
    });
  };

  const handleCompleteExperiment = (experimentId: string) => {
    startTransition(async () => {
      const result = await completeExperiment(experimentId);
      if (result.success) {
        toast.success("Experiment completed");
        router.refresh();
      } else {
        toast.error("Failed to complete experiment", { description: result.error });
      }
    });
  };

  const handleCancelExperiment = (experimentId: string) => {
    startTransition(async () => {
      const result = await cancelExperiment(experimentId);
      if (result.success) {
        toast.success("Experiment cancelled");
        router.refresh();
      } else {
        toast.error("Failed to cancel experiment", { description: result.error });
      }
    });
  };

  const filteredModels = modelVersions.filter(
    (m) => m.model_type === newExperiment.modelType
  );

  const runningExperiments = experiments.filter((e) => e.status === "running");
  const completedExperiments = experiments.filter((e) => e.status === "completed");
  const draftExperiments = experiments.filter((e) => e.status === "draft" || e.status === "paused");

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <FlaskConical className="h-6 w-6" />
                  A/B Testing Experiments
                </h1>
                <p className="text-sm text-muted-foreground">
                  Test different model versions and promote winners
                </p>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Experiment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Experiment</DialogTitle>
                  <DialogDescription>
                    Set up an A/B test to compare model performance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Experiment Name</Label>
                    <Input
                      value={newExperiment.name}
                      onChange={(e) =>
                        setNewExperiment({ ...newExperiment, name: e.target.value })
                      }
                      placeholder="e.g., Extraction Model v2.1 Test"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newExperiment.description}
                      onChange={(e) =>
                        setNewExperiment({ ...newExperiment, description: e.target.value })
                      }
                      placeholder="What are you testing?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model Type</Label>
                    <Select
                      value={newExperiment.modelType}
                      onValueChange={(v) =>
                        setNewExperiment({
                          ...newExperiment,
                          modelType: v as ModelType,
                          controlModelId: "",
                          treatmentModelId: "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="extraction">Extraction</SelectItem>
                        <SelectItem value="classification">Classification</SelectItem>
                        <SelectItem value="validation">Validation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Control Model (Current)</Label>
                      <Select
                        value={newExperiment.controlModelId}
                        onValueChange={(v) =>
                          setNewExperiment({ ...newExperiment, controlModelId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.version} ({m.provider})
                              {m.is_active && " - Active"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Treatment Model (New)</Label>
                      <Select
                        value={newExperiment.treatmentModelId}
                        onValueChange={(v) =>
                          setNewExperiment({ ...newExperiment, treatmentModelId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.version} ({m.provider})
                              {m.is_active && " - Active"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Traffic to Treatment: {newExperiment.trafficPercentage}%</Label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={newExperiment.trafficPercentage}
                      onChange={(e) =>
                        setNewExperiment({
                          ...newExperiment,
                          trafficPercentage: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Success Metric</Label>
                      <Select
                        value={newExperiment.successMetric}
                        onValueChange={(v) =>
                          setNewExperiment({ ...newExperiment, successMetric: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="correction_rate">Correction Rate (Lower is better)</SelectItem>
                          <SelectItem value="accuracy">Accuracy Score</SelectItem>
                          <SelectItem value="confidence">Confidence Score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Sample Size</Label>
                      <Input
                        type="number"
                        value={newExperiment.minimumSampleSize}
                        onChange={(e) =>
                          setNewExperiment({
                            ...newExperiment,
                            minimumSampleSize: parseInt(e.target.value) || 100,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateExperiment} disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Experiment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Running Experiments */}
        {runningExperiments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              Running Experiments ({runningExperiments.length})
            </h2>
            <div className="grid gap-4">
              {runningExperiments.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  isPending={isPending}
                  onPause={() => handlePauseExperiment(exp.id)}
                  onComplete={() => handleCompleteExperiment(exp.id)}
                  onCancel={() => handleCancelExperiment(exp.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Draft/Paused Experiments */}
        {draftExperiments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Pause className="h-5 w-5 text-yellow-500" />
              Draft & Paused ({draftExperiments.length})
            </h2>
            <div className="grid gap-4">
              {draftExperiments.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  isPending={isPending}
                  onStart={() => handleStartExperiment(exp.id)}
                  onCancel={() => handleCancelExperiment(exp.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed Experiments */}
        {completedExperiments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Completed ({completedExperiments.length})
            </h2>
            <div className="grid gap-4">
              {completedExperiments.map((exp) => (
                <ExperimentCard key={exp.id} experiment={exp} isPending={isPending} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {experiments.length === 0 && (
          <div className="text-center py-12">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium">No experiments yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first A/B test to compare model versions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ExperimentCardProps {
  experiment: Experiment;
  isPending: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

function ExperimentCard({
  experiment,
  isPending,
  onStart,
  onPause,
  onComplete,
  onCancel,
}: ExperimentCardProps) {
  const results = experiment.results;
  const totalSamples = results
    ? results.controlStats.sampleCount + results.treatmentStats.sampleCount
    : 0;
  const progress = Math.min(100, (totalSamples / experiment.minimumSampleSize) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{experiment.name}</CardTitle>
            <CardDescription>{experiment.description}</CardDescription>
          </div>
          <Badge className={statusColors[experiment.status]}>{experiment.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Info */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline" className="capitalize">
              {experiment.modelType}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Traffic Split:</span>
            <span>
              {100 - experiment.trafficPercentage}% / {experiment.trafficPercentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Metric:</span>
            <span className="capitalize">{experiment.successMetric.replace("_", " ")}</span>
          </div>
        </div>

        {/* Progress */}
        {(experiment.status === "running" || experiment.status === "completed") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sample Progress</span>
              <span>
                {totalSamples} / {experiment.minimumSampleSize}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Results */}
        {results && (results.controlStats.sampleCount > 0 || results.treatmentStats.sampleCount > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Control</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{results.controlStats.sampleCount}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Avg Confidence:</span>
                  <span>{(results.controlStats.averageConfidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Correction Rate:</span>
                  <span>{(results.controlStats.correctionRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Treatment</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{results.treatmentStats.sampleCount}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Avg Confidence:</span>
                  <span>{(results.treatmentStats.averageConfidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Correction Rate:</span>
                  <span>{(results.treatmentStats.correctionRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Winner Badge */}
        {results && results.winner !== "inconclusive" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <Trophy className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-400">
              Winner: {results.winner === "treatment" ? "Treatment" : "Control"}
            </span>
            <span className="text-sm text-green-600 dark:text-green-500">
              ({results.confidence.toFixed(0)}% confidence)
            </span>
            {results.winner === "treatment" && (
              <span className="ml-auto text-xs text-muted-foreground">
                {((results.controlStats.correctionRate - results.treatmentStats.correctionRate) * 100).toFixed(1)}% improvement
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {experiment.status === "draft" && onStart && (
            <Button size="sm" onClick={onStart} disabled={isPending}>
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          {experiment.status === "paused" && onStart && (
            <Button size="sm" onClick={onStart} disabled={isPending}>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
          {experiment.status === "running" && onPause && (
            <Button size="sm" variant="outline" onClick={onPause} disabled={isPending}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          {experiment.status === "running" && onComplete && (
            <Button size="sm" onClick={onComplete} disabled={isPending}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
          {(experiment.status === "draft" || experiment.status === "paused" || experiment.status === "running") &&
            onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
