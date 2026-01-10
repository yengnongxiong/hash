"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkForDuplicates, DuplicateCandidate } from "@/lib/embeddings/duplicate-detection";

interface DuplicateWarningProps {
  documentId: string;
  status: string;
}

export function DuplicateWarning({ documentId, status }: DuplicateWarningProps) {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Only check for duplicates on pending_review or completed documents
    if (status !== "pending_review" && status !== "completed") {
      setLoading(false);
      return;
    }

    async function fetchDuplicates() {
      try {
        const result = await checkForDuplicates(documentId, 0.85);
        if (result.success && result.hasDuplicates && result.candidates) {
          setDuplicates(result.candidates);
        }
      } catch (error) {
        console.error("Failed to check for duplicates:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDuplicates();
  }, [documentId, status]);

  if (loading || dismissed || duplicates.length === 0) {
    return null;
  }

  const highConfidenceDuplicates = duplicates.filter((d) => d.similarity >= 0.9);
  const hasHighConfidence = highConfidenceDuplicates.length > 0;

  return (
    <div
      className={`rounded-lg p-4 mb-4 border ${
        hasHighConfidence
          ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
          : "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangle
            className={`h-5 w-5 mt-0.5 shrink-0 ${
              hasHighConfidence ? "text-orange-600" : "text-yellow-600"
            }`}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-medium ${
                  hasHighConfidence
                    ? "text-orange-800 dark:text-orange-200"
                    : "text-yellow-800 dark:text-yellow-200"
                }`}
              >
                {hasHighConfidence
                  ? "Potential Duplicate Detected"
                  : "Similar Documents Found"}
              </span>
              <Badge
                variant="outline"
                className={
                  hasHighConfidence
                    ? "border-orange-300 text-orange-700 dark:text-orange-300"
                    : "border-yellow-300 text-yellow-700 dark:text-yellow-300"
                }
              >
                <Copy className="h-3 w-3 mr-1" />
                {duplicates.length} match{duplicates.length !== 1 ? "es" : ""}
              </Badge>
            </div>
            <p
              className={`text-sm mt-1 ${
                hasHighConfidence
                  ? "text-orange-700 dark:text-orange-300"
                  : "text-yellow-700 dark:text-yellow-300"
              }`}
            >
              {hasHighConfidence
                ? "This document appears to be a duplicate of an existing document. Please verify before approving."
                : "This document is similar to existing documents in your system."}
            </p>

            {/* Expandable duplicate list */}
            {expanded && (
              <div className="mt-3 space-y-2">
                {duplicates.slice(0, 5).map((dup) => (
                  <div
                    key={dup.documentId}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-white/50 dark:bg-black/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{dup.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            dup.similarity >= 0.95
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : dup.similarity >= 0.9
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }`}
                        >
                          {(dup.similarity * 100).toFixed(0)}% similar
                        </Badge>
                        {dup.documentType && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {dup.documentType.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      {dup.matchReason.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {dup.matchReason[0]}
                        </p>
                      )}
                    </div>
                    <Link href={`/documents/${dup.documentId}`} target="_blank">
                      <Button variant="ghost" size="sm" className="shrink-0">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
                {duplicates.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    And {duplicates.length - 5} more similar documents...
                  </p>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className={`mt-2 h-7 text-xs ${
                hasHighConfidence
                  ? "text-orange-700 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/30"
                  : "text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
              }`}
            >
              {expanded ? "Hide details" : "Show similar documents"}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className={`h-7 w-7 shrink-0 ${
            hasHighConfidence
              ? "text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30"
              : "text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
          }`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
