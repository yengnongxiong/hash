"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Brain,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Settings2,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { updateOrganizationAISettingsAdmin } from "@/app/admin/actions";

interface OrganizationWithSettings {
  id: string;
  name: string;
  settings: {
    high_confidence_threshold?: number | null;
    medium_confidence_threshold?: number | null;
    low_confidence_threshold?: number | null;
    auto_approval_enabled?: boolean | null;
    auto_approval_min_confidence?: number | null;
    auto_approval_require_no_flags?: boolean | null;
    auto_approval_document_types?: string[] | null;
    amount_anomaly_threshold?: number | null;
    enable_duplicate_detection?: boolean | null;
    duplicate_similarity_threshold?: number | null;
    auto_retrain_enabled?: boolean | null;
    retrain_correction_threshold?: number | null;
    retrain_accuracy_threshold?: number | null;
  } | null;
}

interface AISettingsManagerProps {
  organizations: OrganizationWithSettings[];
  stats: {
    totalDocuments: number;
    pendingReview: number;
    autoApproved: number;
    totalCorrections: number;
  };
}

export function AISettingsManager({ organizations, stats }: AISettingsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<{
    highConfidenceThreshold: number;
    mediumConfidenceThreshold: number;
    lowConfidenceThreshold: number;
    autoApprovalEnabled: boolean;
    autoApprovalMinConfidence: number;
    autoApprovalRequireNoFlags: boolean;
    amountAnomalyThreshold: number;
    enableDuplicateDetection: boolean;
    duplicateSimilarityThreshold: number;
    autoRetrainEnabled: boolean;
    retrainCorrectionThreshold: number;
    retrainAccuracyThreshold: number;
  } | null>(null);

  const handleEditOrg = (org: OrganizationWithSettings) => {
    setSelectedOrg(org);
    setEditedSettings({
      highConfidenceThreshold: org.settings?.high_confidence_threshold ?? 0.90,
      mediumConfidenceThreshold: org.settings?.medium_confidence_threshold ?? 0.70,
      lowConfidenceThreshold: org.settings?.low_confidence_threshold ?? 0.50,
      autoApprovalEnabled: org.settings?.auto_approval_enabled ?? false,
      autoApprovalMinConfidence: org.settings?.auto_approval_min_confidence ?? 0.95,
      autoApprovalRequireNoFlags: org.settings?.auto_approval_require_no_flags ?? true,
      amountAnomalyThreshold: org.settings?.amount_anomaly_threshold ?? 3.0,
      enableDuplicateDetection: org.settings?.enable_duplicate_detection ?? true,
      duplicateSimilarityThreshold: org.settings?.duplicate_similarity_threshold ?? 0.95,
      autoRetrainEnabled: org.settings?.auto_retrain_enabled ?? false,
      retrainCorrectionThreshold: org.settings?.retrain_correction_threshold ?? 1000,
      retrainAccuracyThreshold: org.settings?.retrain_accuracy_threshold ?? 0.95,
    });
    setIsEditing(true);
  };

  const handleSaveSettings = () => {
    if (!selectedOrg || !editedSettings) return;

    startTransition(async () => {
      const result = await updateOrganizationAISettingsAdmin(selectedOrg.id, editedSettings);
      if (result.success) {
        toast.success("AI settings updated successfully");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">AI Settings</h1>
                <p className="text-xs text-slate-400">Configure AI features per organization</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="h-5 w-5 text-blue-500" />
                <Badge variant="secondary">{stats.totalDocuments}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.totalDocuments.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Total Documents</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <Badge variant="secondary">{stats.pendingReview}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.pendingReview.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Zap className="h-5 w-5 text-green-500" />
                <Badge variant="secondary">{stats.autoApproved}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.autoApproved.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Auto-Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <RefreshCw className="h-5 w-5 text-purple-500" />
                <Badge variant="secondary">{stats.totalCorrections}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stats.totalCorrections.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Training Corrections</p>
            </CardContent>
          </Card>
        </div>

        {/* Organizations List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization AI Settings
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure AI features for each organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No organizations found</p>
            ) : (
              <div className="space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{org.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={org.settings?.auto_approval_enabled ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {org.settings?.auto_approval_enabled ? "Auto-Approval On" : "Manual Review"}
                          </Badge>
                          {org.settings?.auto_retrain_enabled && (
                            <Badge variant="outline" className="text-xs">
                              Auto-Retrain
                            </Badge>
                          )}
                          {org.settings?.enable_duplicate_detection !== false && (
                            <Badge variant="outline" className="text-xs">
                              Duplicate Detection
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditOrg(org)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Settings Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Settings for {selectedOrg?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure AI-powered features for this organization
            </DialogDescription>
          </DialogHeader>

          {editedSettings && (
            <div className="space-y-6 py-4">
              {/* Confidence Thresholds */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Confidence Thresholds
                </h3>
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">High Confidence</Label>
                      <span className="text-sm text-slate-400">
                        {(editedSettings.highConfidenceThreshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Slider
                      value={[editedSettings.highConfidenceThreshold * 100]}
                      onValueChange={([value]) =>
                        setEditedSettings({ ...editedSettings, highConfidenceThreshold: value / 100 })
                      }
                      min={70}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Medium Confidence</Label>
                      <span className="text-sm text-slate-400">
                        {(editedSettings.mediumConfidenceThreshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Slider
                      value={[editedSettings.mediumConfidenceThreshold * 100]}
                      onValueChange={([value]) =>
                        setEditedSettings({ ...editedSettings, mediumConfidenceThreshold: value / 100 })
                      }
                      min={50}
                      max={90}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Auto-Approval Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto-Approval
                </h3>
                <div className="space-y-4 pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Enable Auto-Approval</Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Automatically approve high-confidence documents
                      </p>
                    </div>
                    <Switch
                      checked={editedSettings.autoApprovalEnabled}
                      onCheckedChange={(checked) =>
                        setEditedSettings({ ...editedSettings, autoApprovalEnabled: checked })
                      }
                    />
                  </div>
                  {editedSettings.autoApprovalEnabled && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-slate-300">Minimum Confidence</Label>
                          <span className="text-sm text-slate-400">
                            {(editedSettings.autoApprovalMinConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Slider
                          value={[editedSettings.autoApprovalMinConfidence * 100]}
                          onValueChange={([value]) =>
                            setEditedSettings({ ...editedSettings, autoApprovalMinConfidence: value / 100 })
                          }
                          min={80}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-300">Require No Flags</Label>
                          <p className="text-xs text-slate-500 mt-1">
                            Only auto-approve if no anomalies detected
                          </p>
                        </div>
                        <Switch
                          checked={editedSettings.autoApprovalRequireNoFlags}
                          onCheckedChange={(checked) =>
                            setEditedSettings({ ...editedSettings, autoApprovalRequireNoFlags: checked })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Anomaly Detection Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Anomaly Detection
                </h3>
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Amount Outlier Threshold (Z-Score)</Label>
                      <span className="text-sm text-slate-400">
                        {editedSettings.amountAnomalyThreshold.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[editedSettings.amountAnomalyThreshold * 10]}
                      onValueChange={([value]) =>
                        setEditedSettings({ ...editedSettings, amountAnomalyThreshold: value / 10 })
                      }
                      min={15}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">
                      Flag amounts that deviate more than {editedSettings.amountAnomalyThreshold.toFixed(1)} standard deviations from the mean
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Duplicate Detection</Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Detect potentially duplicate documents
                      </p>
                    </div>
                    <Switch
                      checked={editedSettings.enableDuplicateDetection}
                      onCheckedChange={(checked) =>
                        setEditedSettings({ ...editedSettings, enableDuplicateDetection: checked })
                      }
                    />
                  </div>
                  {editedSettings.enableDuplicateDetection && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Similarity Threshold</Label>
                        <span className="text-sm text-slate-400">
                          {(editedSettings.duplicateSimilarityThreshold * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        value={[editedSettings.duplicateSimilarityThreshold * 100]}
                        onValueChange={([value]) =>
                          setEditedSettings({ ...editedSettings, duplicateSimilarityThreshold: value / 100 })
                        }
                        min={80}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Learning Loop Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Learning Loop
                </h3>
                <div className="space-y-4 pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Enable Auto-Retrain</Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Automatically trigger model retraining based on corrections
                      </p>
                    </div>
                    <Switch
                      checked={editedSettings.autoRetrainEnabled}
                      onCheckedChange={(checked) =>
                        setEditedSettings({ ...editedSettings, autoRetrainEnabled: checked })
                      }
                    />
                  </div>
                  {editedSettings.autoRetrainEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Correction Threshold</Label>
                        <Input
                          type="number"
                          value={editedSettings.retrainCorrectionThreshold}
                          onChange={(e) =>
                            setEditedSettings({
                              ...editedSettings,
                              retrainCorrectionThreshold: parseInt(e.target.value) || 1000,
                            })
                          }
                          min={100}
                          max={10000}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <p className="text-xs text-slate-500">
                          Trigger retraining after this many corrections
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-slate-300">Accuracy Threshold</Label>
                          <span className="text-sm text-slate-400">
                            {(editedSettings.retrainAccuracyThreshold * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Slider
                          value={[editedSettings.retrainAccuracyThreshold * 100]}
                          onValueChange={([value]) =>
                            setEditedSettings({ ...editedSettings, retrainAccuracyThreshold: value / 100 })
                          }
                          min={80}
                          max={99}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-500">
                          Trigger retraining if accuracy falls below this threshold
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
