"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { TaskAttachment } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Paperclip,
  Trash2,
  Download,
  FileText,
  Image,
  File,
  Loader2,
  Upload,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import { useDropzone } from "react-dropzone";
import {
  uploadTaskAttachment,
  deleteTaskAttachment,
  getTaskAttachments,
} from "@/app/(dashboard)/tasks/actions";

interface TaskAttachmentsProps {
  taskId: string;
  onSketchClick?: () => void;
  isEditing?: boolean;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.startsWith("image/")) return Image;
  if (fileType === "application/pdf") return FileText;
  return File;
}

function isImageFile(fileType: string | null): boolean {
  return fileType?.startsWith("image/") || false;
}

export function TaskAttachments({
  taskId,
  onSketchClick,
  isEditing = false,
}: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isPending, startTransition] = useTransition();
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch attachments on mount
  useEffect(() => {
    const fetchAttachments = async () => {
      setIsLoading(true);
      const result = await getTaskAttachments(taskId);
      if (result.attachments) {
        setAttachments(result.attachments);
      }
      setIsLoading(false);
    };
    fetchAttachments();
  }, [taskId]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        setUploadingFiles((prev) => [...prev, file.name]);

        const formData = new FormData();
        formData.append("file", file);

        startTransition(async () => {
          const result = await uploadTaskAttachment(taskId, formData);
          if (result.error) {
            toast.error(`Failed to upload ${file.name}`, {
              description: result.error,
            });
          } else if (result.attachment) {
            setAttachments((prev) => [...prev, result.attachment!]);
            toast.success(`Uploaded ${file.name}`);
          }
          setUploadingFiles((prev) => prev.filter((f) => f !== file.name));
        });
      }
    },
    [taskId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isPending,
  });

  const handleDelete = (attachmentId: string) => {
    setDeletingId(attachmentId);

    startTransition(async () => {
      const result = await deleteTaskAttachment(attachmentId);
      if (result.error) {
        toast.error("Failed to delete attachment", { description: result.error });
      } else {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        toast.success("Attachment deleted");
      }
      setDeletingId(null);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          Attachments
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading attachments...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Paperclip className="h-3 w-3" />
        Attachments
        {attachments.length > 0 && (
          <span className="ml-1">({attachments.length})</span>
        )}
      </Label>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            const isImage = isImageFile(attachment.file_type);

            return (
              <div
                key={attachment.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md border group",
                  "hover:bg-muted/50 transition-colors"
                )}
              >
                {/* Thumbnail or icon */}
                {isImage ? (
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.file_size
                      ? formatFileSize(attachment.file_size)
                      : "Unknown size"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={attachment.file_name}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload zone and sketch button - only in edit mode */}
      {isEditing && (
        <div className="flex gap-2">
          <div
            {...getRootProps()}
            className={cn(
              "flex-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer",
              "transition-colors hover:border-primary/50 hover:bg-muted/50",
              isDragActive && "border-primary bg-primary/10",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-6 w-6 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-xs text-primary">Drop files here</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Drop files or click
                </p>
              )}
            </div>
          </div>

          {/* Sketch button */}
          {onSketchClick && (
            <Button
              variant="outline"
              className="h-auto flex-col gap-1 py-3 px-4"
              onClick={onSketchClick}
            >
              <Pencil className="h-6 w-6" />
              <span className="text-xs">Sketch</span>
            </Button>
          )}
        </div>
      )}

      {/* Uploading indicators */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-1">
          {uploadingFiles.map((fileName) => (
            <div
              key={fileName}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading {fileName}...</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
