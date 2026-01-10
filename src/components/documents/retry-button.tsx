"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { retryDocumentOCR } from "@/app/(dashboard)/documents/actions";
import { toast } from "sonner";

interface RetryButtonProps {
  documentId: string;
  hasExtractedData?: boolean;
}

export function RetryButton({ documentId, hasExtractedData }: RetryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleRetry = () => {
    startTransition(async () => {
      const result = await retryDocumentOCR(documentId);
      if (result.error) {
        toast.error("Retry failed", { description: result.error });
      } else {
        toast.success("Reprocessing started");
        router.refresh();
      }
      setOpen(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RotateCw className="h-4 w-4 mr-2" />
          )}
          Retry
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCw className="h-5 w-5" />
            Retry OCR Processing?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                This will reprocess the document with OCR and extract new data.
              </p>
              {hasExtractedData && (
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Any manually edited data will be replaced with new extracted data.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRetry} disabled={isPending}>
            {isPending ? "Processing..." : "Retry Processing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
