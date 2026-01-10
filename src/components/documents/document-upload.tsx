"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/utils/format";

interface UploadingFile {
  file: File;
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  documentId?: string;
}

const ACCEPTED_TYPES = {
  // Documents
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  // Images
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUpload() {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
      file,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e) => e.message).join(", ");
        toast.error(`${rejection.file.name}: ${errors}`);
      });
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const retryFile = (index: number) => {
    setFiles((prev) =>
      prev.map((f, idx) =>
        idx === index ? { ...f, status: "pending", error: undefined, progress: 0 } : f
      )
    );
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    startTransition(async () => {
      for (let i = 0; i < files.length; i++) {
        const uploadingFile = files[i];
        if (uploadingFile.status !== "pending") continue;

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "uploading", progress: 10 } : f
          )
        );

        const formData = new FormData();
        formData.append("file", uploadingFile.file);

        try {
          // Simulate progress
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, progress: 50 } : f
            )
          );

          const result = await uploadDocument(formData);

          if (result.error) {
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === i
                  ? { ...f, status: "error", error: result.error, progress: 0 }
                  : f
              )
            );
            toast.error(`Failed to upload ${uploadingFile.file.name}`, {
              description: result.error,
            });
          } else {
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === i
                  ? {
                      ...f,
                      status: "processing",
                      progress: 100,
                      documentId: result.documentId,
                    }
                  : f
              )
            );
            toast.success(`${uploadingFile.file.name} uploaded`, {
              description: "Processing document with OCR...",
            });
          }
        } catch (error) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? {
                    ...f,
                    status: "error",
                    error: "Upload failed",
                    progress: 0,
                  }
                : f
            )
          );
        }
      }

      // Refresh to show new documents
      router.refresh();
    });
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const hasFiles = files.length > 0;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload
          className={`mx-auto h-12 w-12 ${
            isDragActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <p className="mt-4 text-lg font-medium">
          {isDragActive ? "Drop files here..." : "Drag and drop files here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse your computer
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Supports PDF, PNG, JPG, WebP (max 50MB per file)
        </p>
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </h3>
            {pendingCount > 0 && (
              <Button onClick={uploadFiles} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((uploadingFile, index) => (
              <div
                key={`${uploadingFile.file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadingFile.file.size)}
                  </p>
                  {uploadingFile.status === "uploading" && (
                    <Progress value={uploadingFile.progress} className="h-1 mt-2" />
                  )}
                  {uploadingFile.status === "error" && (
                    <p className="text-xs text-destructive mt-1">
                      {uploadingFile.error}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {uploadingFile.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploadingFile.status === "uploading" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {uploadingFile.status === "processing" && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Processing</span>
                    </div>
                  )}
                  {uploadingFile.status === "completed" && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {uploadingFile.status === "error" && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => retryFile(index)}
                        className="h-8 w-8"
                        title="Retry upload"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
