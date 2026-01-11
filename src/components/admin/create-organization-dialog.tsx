"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { createOrganizationAdmin } from "@/app/admin/actions";

export function CreateOrganizationDialog() {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [createdOrg, setCreatedOrg] = useState<{ name: string; org_code: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    startTransition(async () => {
      const result = await createOrganizationAdmin(orgName.trim());

      if (result.error) {
        toast.error(result.error);
      } else if (result.organization) {
        setCreatedOrg(result.organization);
        toast.success(`Organization "${result.organization.name}" created!`);
        router.refresh();
      }
    });
  };

  const handleCopyCode = async () => {
    if (!createdOrg?.org_code) return;

    await navigator.clipboard.writeText(createdOrg.org_code);
    setCopied(true);
    toast.success("Organization code copied to clipboard");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setOrgName("");
    setCreatedOrg(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            {createdOrg ? "Organization Created" : "Create New Organization"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {createdOrg
              ? "Share this code with the business owner so they can invite their team."
              : "Create a new organization for a business. They will use the generated code to sign up."
            }
          </DialogDescription>
        </DialogHeader>

        {createdOrg ? (
          <div className="space-y-4 py-4">
            <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-400 mb-2">Organization Code for {createdOrg.name}</p>
              <p className="font-mono text-3xl font-bold text-emerald-400 tracking-widest">
                {createdOrg.org_code}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-600"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-slate-300">
                Organization Name
              </Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="bg-slate-900/50 border-slate-600 text-white"
                disabled={isPending}
              />
              <p className="text-xs text-slate-500">
                This is the business name that users will see when they sign up.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-slate-600"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={isPending || !orgName.trim()}
              >
                {isPending ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
