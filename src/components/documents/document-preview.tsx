"use client";

import { useState } from "react";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  fileUrl: string;
  fileType: string | null;
  fileName: string;
}

export function DocumentPreview({
  fileUrl,
  fileType,
  fileName,
}: DocumentPreviewProps) {
  const [error, setError] = useState(false);

  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg p-8">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Unable to preview document</p>
        <div className="flex gap-2">
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
          src={fileUrl}
          alt={fileName}
          className="max-w-full h-auto mx-auto"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="h-full bg-muted/30 rounded-lg overflow-hidden">
        <iframe
          src={`${fileUrl}#view=FitH&toolbar=1`}
          className="w-full h-full min-h-[600px]"
          title={fileName}
          onError={() => setError(true)}
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
