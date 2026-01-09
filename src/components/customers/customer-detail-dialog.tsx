"use client";

import { useState, useTransition, useEffect } from "react";
import { Customer, PersonTag, CustomerWithUserInfo } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
  FileText,
  Pencil,
  Save,
  X,
  Trash2,
} from "lucide-react";
import { TagSelector, ColoredTagsDisplay } from "./tag-selector";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateCustomerField, deleteCustomers } from "@/app/(dashboard)/people/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils/format";

interface CustomerDetailDialogProps {
  customer: CustomerWithUserInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  personTags?: PersonTag[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CustomerDetailDialog({
  customer,
  open,
  onOpenChange,
  onUpdate,
  personTags = [],
}: CustomerDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editedCustomer, setEditedCustomer] = useState<Partial<CustomerWithUserInfo>>({});
  // Track saved data to display until customer prop is refreshed
  const [savedData, setSavedData] = useState<Partial<CustomerWithUserInfo> | null>(null);
  const router = useRouter();

  // Reset editing state when dialog closes or customer changes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedCustomer({});
      setSavedData(null);
    }
  }, [open]);

  // Also reset when switching to a different customer
  useEffect(() => {
    setIsEditing(false);
    setEditedCustomer({});
    setSavedData(null);
  }, [customer?.id]);

  const handleDelete = () => {
    if (!customer) return;

    startTransition(async () => {
      const result = await deleteCustomers([customer.id]);

      if (result.error) {
        toast.error("Failed to delete person", { description: result.error });
      } else {
        toast.success("Person deleted");
        onOpenChange(false);
        router.refresh();
        onUpdate?.();
      }
    });
  };

  if (!customer) return null;

  const handleStartEdit = () => {
    setEditedCustomer({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      tags: customer.tags,
      notes: customer.notes,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedCustomer({});
    setIsEditing(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const fieldsToUpdate = Object.entries(editedCustomer).filter(
        ([key, value]) => {
          const originalValue = customer[key as keyof CustomerWithUserInfo];
          // Compare arrays properly
          if (Array.isArray(value) && Array.isArray(originalValue)) {
            return JSON.stringify(value) !== JSON.stringify(originalValue);
          }
          return value !== originalValue;
        }
      );

      if (fieldsToUpdate.length === 0) {
        setIsEditing(false);
        return;
      }

      let hasError = false;
      for (const [field, value] of fieldsToUpdate) {
        const result = await updateCustomerField(customer.id, field, value);
        if (result.error) {
          toast.error(`Failed to update ${field}: ${result.error}`);
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        toast.success("Person updated successfully");
        // Store saved data to display until customer prop refreshes
        setSavedData(editedCustomer);
        setIsEditing(false);
        setEditedCustomer({});
        onUpdate?.();
      }
    });
  };

  // Use savedData to display recently saved changes until customer prop is refreshed
  const currentData = isEditing
    ? { ...customer, ...editedCustomer }
    : savedData
      ? { ...customer, ...savedData }
      : customer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden w-[calc(100vw-2rem)]">
        <DialogHeader className="overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(currentData.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 overflow-hidden">
                {isEditing ? (
                  <Input
                    value={editedCustomer.name || ""}
                    onChange={(e) =>
                      setEditedCustomer((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="font-semibold text-lg h-8"
                    placeholder="Name"
                  />
                ) : (
                  <span className="block truncate">{currentData.name}</span>
                )}
                {currentData.customer_number && (
                  <Badge
                    variant="outline"
                    className="mt-1 font-mono text-xs"
                  >
                    {currentData.customer_number}
                  </Badge>
                )}
              </div>
            </DialogTitle>
            {!isEditing ? (
              <TooltipProvider>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartEdit}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit person</p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete person</p>
                      </TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Person</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {customer.name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TooltipProvider>
            ) : (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
          <VisuallyHidden>
            <DialogDescription>
              View and edit person details including contact information, tags, and notes.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-4 mt-4 overflow-hidden w-full">
          {/* Company */}
          <div className="space-y-1.5 overflow-hidden">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              Company
            </Label>
            {isEditing ? (
              <Input
                value={editedCustomer.company || ""}
                onChange={(e) =>
                  setEditedCustomer((prev) => ({
                    ...prev,
                    company: e.target.value || null,
                  }))
                }
                placeholder="Company name"
              />
            ) : (
              <p className="text-sm pl-6 truncate">
                {currentData.company || (
                  <span className="text-muted-foreground italic">No company</span>
                )}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5 overflow-hidden">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              Email
            </Label>
            {isEditing ? (
              <Input
                type="email"
                value={editedCustomer.email || ""}
                onChange={(e) =>
                  setEditedCustomer((prev) => ({
                    ...prev,
                    email: e.target.value || null,
                  }))
                }
                placeholder="email@example.com"
              />
            ) : (
              <p className="text-sm pl-6 truncate">
                {currentData.email ? (
                  <a
                    href={`mailto:${currentData.email}`}
                    className="text-primary hover:underline truncate block"
                  >
                    {currentData.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">No email</span>
                )}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5 overflow-hidden">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              Phone
            </Label>
            {isEditing ? (
              <Input
                type="tel"
                value={editedCustomer.phone || ""}
                onChange={(e) =>
                  setEditedCustomer((prev) => ({
                    ...prev,
                    phone: e.target.value || null,
                  }))
                }
                placeholder="+1 (555) 000-0000"
              />
            ) : (
              <p className="text-sm pl-6 truncate">
                {currentData.phone ? (
                  <a
                    href={`tel:${currentData.phone}`}
                    className="text-primary hover:underline truncate block"
                  >
                    {currentData.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">No phone</span>
                )}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5 overflow-hidden">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              Address
            </Label>
            {isEditing ? (
              <Input
                value={editedCustomer.address || ""}
                onChange={(e) =>
                  setEditedCustomer((prev) => ({
                    ...prev,
                    address: e.target.value || null,
                  }))
                }
                placeholder="123 Main St, City, State"
              />
            ) : (
              <p className="text-sm pl-6 truncate">
                {currentData.address || (
                  <span className="text-muted-foreground italic">No address</span>
                )}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5 overflow-hidden">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4 shrink-0" />
              Tags
            </Label>
            {isEditing ? (
              <TagSelector
                personTags={personTags}
                selectedTags={editedCustomer.tags || []}
                onChange={(tags) =>
                  setEditedCustomer((prev) => ({
                    ...prev,
                    tags,
                  }))
                }
                placeholder="Select tags..."
              />
            ) : (
              <div className="pl-6 overflow-hidden">
                {currentData.tags && currentData.tags.length > 0 ? (
                  <ColoredTagsDisplay
                    tags={currentData.tags}
                    personTags={personTags}
                    maxDisplay={10}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    No tags
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5 overflow-hidden">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              Notes
            </Label>
            {isEditing ? (
              <Textarea
                value={editedCustomer.notes || ""}
                onChange={(e) =>
                  setEditedCustomer((prev) => ({
                    ...prev,
                    notes: e.target.value || null,
                  }))
                }
                placeholder="Add notes about this person..."
                rows={3}
              />
            ) : (
              <p className="text-sm pl-6 line-clamp-2 break-all">
                {currentData.notes || (
                  <span className="text-muted-foreground italic">No notes</span>
                )}
              </p>
            )}
          </div>

          {/* Timestamps */}
          <div className="pt-2 border-t space-y-1">
            <p className="text-xs text-muted-foreground">
              Created: {formatDateTime(new Date(currentData.created_at))}
              {currentData.created_by_user && (
                <> by <span className="font-medium text-foreground">{currentData.created_by_user.name || currentData.created_by_user.email || "Unknown"}</span></>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Updated: {formatDateTime(new Date(currentData.updated_at))}
              {currentData.updated_by_user && (
                <> by <span className="font-medium text-foreground">{currentData.updated_by_user.name || currentData.updated_by_user.email || "Unknown"}</span></>
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
