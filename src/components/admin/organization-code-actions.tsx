"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Check, RefreshCw, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { regenerateOrganizationCodeAdmin, deleteOrganizationAdmin, renameOrganizationAdmin } from "@/app/admin/actions";

interface OrganizationCodeActionsProps {
  orgId: string;
  orgCode: string | null;
  orgName: string;
  userCount: number;
  customerCount: number;
  documentCount: number;
}

export function OrganizationCodeActions({
  orgId,
  orgCode,
  orgName,
  userCount,
  customerCount,
  documentCount
}: OrganizationCodeActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newName, setNewName] = useState(orgName);
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteOrganizationAdmin(orgId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Organization "${orgName}" and all its data deleted`);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async () => {
    if (newName.trim() === orgName) {
      setEditDialogOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      const result = await renameOrganizationAdmin(orgId, newName);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Organization renamed to "${newName.trim()}"`);
        setEditDialogOpen(false);
        router.refresh();
      }
    } finally {
      setIsRenaming(false);
    }
  };

  const totalDataCount = userCount + customerCount + documentCount;

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

        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (open) setNewName(orgName);
        }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit name</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Rename Organization</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter a new name for this organization.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Organization name"
                className="bg-slate-700/50 border-slate-600 text-white"
                disabled={isRenaming}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-slate-600"
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={isRenaming || newName.trim().length < 2}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isRenaming ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-400"
                  disabled={isDeleting}
                >
                  <Trash2 className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`} />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete organization</p>
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400">Delete Organization?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-slate-400 space-y-3">
                  <p>
                    This will permanently delete <span className="font-semibold text-white">{orgName}</span> and all associated data:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{userCount} user{userCount !== 1 ? "s" : ""} (including their auth accounts)</li>
                    <li>{customerCount} people record{customerCount !== 1 ? "s" : ""}</li>
                    <li>{documentCount} document{documentCount !== 1 ? "s" : ""}</li>
                    <li>All tasks, appointments, and related data</li>
                  </ul>
                  <p className="text-red-400 font-medium">
                    This action cannot be undone.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Organization"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
