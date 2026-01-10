"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findSimilarDocuments } from "@/lib/embeddings/document-embeddings";

interface SimilarDocumentsProps {
  documentId: string;
  limit?: number;
}

interface SimilarDoc {
  documentId: string;
  similarity: number;
  fileName: string;
  documentType: string | null;
}

export function SimilarDocuments({ documentId, limit = 5 }: SimilarDocumentsProps) {
  const [similar, setSimilar] = useState<SimilarDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSimilar() {
      try {
        const result = await findSimilarDocuments(documentId, limit, 0.6);
        if (result.success && result.results) {
          setSimilar(result.results);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        console.error("Failed to fetch similar documents:", err);
        setError("Failed to load similar documents");
      } finally {
        setLoading(false);
      }
    }

    fetchSimilar();
  }, [documentId, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Similar Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Similar Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (similar.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Similar Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No similar documents found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Similar Documents
          <Badge variant="secondary" className="ml-auto">
            {similar.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {similar.map((doc) => (
          <div
            key={doc.documentId}
            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      doc.similarity >= 0.9
                        ? "border-green-300 text-green-700 dark:text-green-400"
                        : doc.similarity >= 0.75
                        ? "border-yellow-300 text-yellow-700 dark:text-yellow-400"
                        : "border-gray-300"
                    }`}
                  >
                    {(doc.similarity * 100).toFixed(0)}% match
                  </Badge>
                  {doc.documentType && (
                    <span className="capitalize">{doc.documentType.replace(/_/g, " ")}</span>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/documents/${doc.documentId}`} target="_blank">
              <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
