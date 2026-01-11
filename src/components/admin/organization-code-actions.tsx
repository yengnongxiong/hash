"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { regenerateOrganizationCodeAdmin } from "@/app/admin/actions";

interface OrganizationCodeActionsProps {
  orgId: string;
  orgCode: string | null;
}

export function OrganizationCodeActions({ orgId, orgCode }: OrganizationCodeActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCopy = async () => {
    if (!orgCode) return;

    await navigator.clipboard.writeText(orgCode);
    setCopied(true);
    toast.success("Organization code copied to clipboard");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    startTransition(async () => {
      const result = await regenerateOrganizationCodeAdmin(orgId);

      if (result.error) {
        toast.error(result.error);
      } else if (result.newCode) {
        toast.success(`New code generated: ${result.newCode}`);
        router.refresh();
      }
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={handleCopy}
              disabled={!orgCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : "Copy code"}</p>
          </TooltipContent>
        </Tooltip>

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  disabled={isPending}
                >
                  <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Regenerate code</p>
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Regenerate Organization Code?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This will create a new invite code. The old code will no longer work.
                Existing users will not be affected, but any pending signups with the old code will fail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleRegenerate}
              >
                Regenerate Code
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
