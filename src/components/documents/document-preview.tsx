"use client";

import { useState, useCallback } from "react";
import { FileText, Download, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  fileUrl: string;
  fileType: string | null;
  fileName: string;
}

type ErrorType = "load" | "cors" | "timeout" | "unknown";

interface ErrorState {
  hasError: boolean;
  message: string;
  type: ErrorType;
}

function getErrorMessage(type: ErrorType): string {
  switch (type) {
    case "load":
      return "Failed to load the document. The file may be unavailable or corrupted.";
    case "cors":
      return "Unable to display the document due to browser security restrictions.";
    case "timeout":
      return "Loading took too long. The file may be very large.";
    default:
      return "An unexpected error occurred while loading the document.";
  }
}

export function DocumentPreview({
  fileUrl,
  fileType,
  fileName,
}: DocumentPreviewProps) {
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";

  const handleError = useCallback((type: ErrorType = "load") => {
    setErrorState({
      hasError: true,
      message: getErrorMessage(type),
      type,
    });
  }, []);

  const handleRetry = useCallback(() => {
    setErrorState(null);
    setRetryKey((prev) => prev + 1);
  }, []);

  if (errorState) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg p-8">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-destructive font-medium mb-2">Preview Unavailable</p>
        <p className="text-muted-foreground text-sm text-center mb-4 max-w-sm">
          {errorState.message}
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in new tab
            </Button>
          </a>
          <a href={fileUrl} download={fileName}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="relative h-full bg-muted/30 rounded-lg overflow-auto">
        <img
          key={retryKey}
          src={fileUrl}
          alt={fileName}
          className="max-w-full h-auto mx-auto"
          onError={() => handleError("load")}
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="h-full bg-muted/30 rounded-lg overflow-hidden">
        <iframe
          key={retryKey}
          src={`${fileUrl}#view=FitH&toolbar=1`}
          className="w-full h-full min-h-[600px]"
          title={fileName}
          onError={() => handleError("load")}
        />
      </div>
    );
  }

  // Fallback for unsupported types
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg p-8">
      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
      <p className="font-medium mb-2">{fileName}</p>
      <p className="text-sm text-muted-foreground mb-4">
        Preview not available for this file type
      </p>
      <div className="flex gap-2">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open
          </Button>
        </a>
        <a href={fileUrl} download={fileName}>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </a>
      </div>
    </div>
  );
}
