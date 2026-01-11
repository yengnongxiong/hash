"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { History, RotateCcw, ChevronDown, ChevronRight, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { type DocumentVersion, restoreDocumentVersion } from "@/app/(dashboard)/documents/[id]/actions";

interface DocumentVersionHistoryProps {
  documentId: string;
  versions: DocumentVersion[];
  currentExtractedData: Record<string, unknown>;
}

export function DocumentVersionHistory({
  documentId,
  versions,
  currentExtractedData,
}: DocumentVersionHistoryProps) {
  const [isPending, startTransition] = useTransition();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());

  const toggleExpanded = (versionNumber: number) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionNumber)) {
      newExpanded.delete(versionNumber);
    } else {
      newExpanded.add(versionNumber);
    }
    setExpandedVersions(newExpanded);
  };

  const handleRestore = (version: DocumentVersion) => {
    setSelectedVersion(version);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = () => {
    if (!selectedVersion) return;

    startTransition(async () => {
      const result = await restoreDocumentVersion(documentId, selectedVersion.version_number);
      if (result.success) {
        toast.success(`Restored to version ${selectedVersion.version_number}`);
        setRestoreDialogOpen(false);
        setSelectedVersion(null);
      } else {
        toast.error(result.error || "Failed to restore version");
      }
    });
  };

  const getChangedFieldsDisplay = (version: DocumentVersion) => {
    if (!version.changed_fields || version.changed_fields.length === 0) {
      return null;
    }
    return version.changed_fields.map((field) => (
      <Badge key={field} variant="outline" className="text-xs">
        {field}
      </Badge>
    ));
  };

  const compareVersions = (versionData: Record<string, unknown>) => {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    const allKeys = new Set([
      ...Object.keys(versionData),
      ...Object.keys(currentExtractedData),
    ]);

    // Filter out metadata fields
    const metadataFields = ["fieldConfidence", "documentTypeConfidence", "overallConfidence", "pageCount", "hasImages", "hasTables"];

    for (const key of allKeys) {
      if (metadataFields.includes(key)) continue;

      const oldVal = versionData[key];
      const newVal = currentExtractedData[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
    }

    return changes;
  };

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Version History</CardTitle>
          </div>
          <CardDescription>No version history available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Versions will be created automatically when you edit extracted data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Version History</CardTitle>
          </div>
          <CardDescription>{versions.length} version{versions.length !== 1 ? "s" : ""} saved</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {versions.map((version) => {
                const isExpanded = expandedVersions.has(version.version_number);
                const changes = compareVersions(version.extracted_data);

                return (
                  <Collapsible
                    key={version.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(version.version_number)}
                  >
                    <div className="rounded-lg border p-3">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Version {version.version_number}</span>
                                {version.document_type && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {version.document_type.replace(/_/g, " ")}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                </span>
                                {version.created_by_user && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {version.created_by_user.name || version.created_by_user.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(version);
                            }}
                            disabled={isPending}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-3 pt-3 border-t">
                        {version.change_summary && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {version.change_summary}
                          </p>
                        )}

                        {version.changed_fields && version.changed_fields.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-muted-foreground">Changed fields: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {getChangedFieldsDisplay(version)}
                            </div>
                          </div>
                        )}

                        {changes.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-medium">Differences from current:</span>
                            <div className="space-y-1">
                              {changes.slice(0, 5).map(({ field, oldValue, newValue }) => (
                                <div key={field} className="text-xs bg-muted/50 rounded p-2">
                                  <span className="font-medium">{field}:</span>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div>
                                      <span className="text-muted-foreground">Version: </span>
                                      <span className="text-red-600">
                                        {oldValue === undefined || oldValue === null
                                          ? "(empty)"
                                          : typeof oldValue === "object"
                                          ? JSON.stringify(oldValue).slice(0, 50)
                                          : String(oldValue).slice(0, 50)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Current: </span>
                                      <span className="text-green-600">
                                        {newValue === undefined || newValue === null
                                          ? "(empty)"
                                          : typeof newValue === "object"
                                          ? JSON.stringify(newValue).slice(0, 50)
                                          : String(newValue).slice(0, 50)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {changes.length > 5 && (
                                <p className="text-xs text-muted-foreground">
                                  +{changes.length - 5} more changes
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {changes.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No differences from current version
                          </p>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore version {selectedVersion?.version_number}? This will
              replace the current extracted data with the data from this version. A new version
              snapshot will be created before restoring.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={confirmRestore} disabled={isPending}>
              {isPending ? "Restoring..." : "Restore Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
