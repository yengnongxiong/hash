"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, AlertTriangle } from "lucide-react";
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
import { approveDocument, rejectDocument } from "@/app/(dashboard)/documents/actions";
import { toast } from "sonner";

interface DocumentApprovalProps {
  documentId: string;
  hasUnresolvedFlags?: boolean;
}

export function DocumentApproval({ documentId, hasUnresolvedFlags }: DocumentApprovalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    startTransition(async () => {
      const result = await approveDocument(documentId);
      if (result.error) {
        toast.error("Failed to approve", { description: result.error });
      } else {
        toast.success("Document approved");
        router.refresh();
      }
      setIsApproving(false);
    });
  };

  const handleReject = async () => {
    setIsRejecting(true);
    startTransition(async () => {
      const result = await rejectDocument(documentId);
      if (result.error) {
        toast.error("Failed to reject", { description: result.error });
        setIsRejecting(false);
      } else {
        toast.success("Document rejected");
        router.refresh();
      }
      setIsRejecting(false);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleApprove}
        disabled={isPending || isApproving}
        className="bg-green-600 hover:bg-green-700 text-white"
        size="sm"
      >
        {isApproving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Check className="h-4 w-4 mr-2" />
        )}
        Approve
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || isRejecting}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            Reject
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reject Document
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this document? The document will be
              marked as rejected and can be deleted later from the Review Queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hasUnresolvedFlags && (
        <span className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1 ml-2">
          <AlertTriangle className="h-3 w-3" />
          Has unresolved flags
        </span>
      )}
    </div>
  );
}
