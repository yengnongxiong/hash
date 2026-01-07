"use client";

import { useState, useTransition } from "react";
import { Customer } from "@/types/database";
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
  Calendar,
  Pencil,
  Save,
  X,
  Trash2,
} from "lucide-react";
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
import { formatDistanceToNow } from "@/lib/utils/format";

interface CustomerDetailDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
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
}: CustomerDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editedCustomer, setEditedCustomer] = useState<Partial<Customer>>({});
  const router = useRouter();

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
          const originalValue = customer[key as keyof Customer];
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
        setIsEditing(false);
        setEditedCustomer({});
        onUpdate?.();
      }
    });
  };

  const currentData = isEditing
    ? { ...customer, ...editedCustomer }
    : customer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(currentData.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
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
                  <span className="truncate block">{currentData.name}</span>
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

        <div className="space-y-4 mt-4 overflow-hidden max-w-full">
          {/* Company */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
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
              <p className="text-sm pl-6 truncate w-full">
                {currentData.company || (
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
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
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
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
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
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
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            {isEditing ? (
              <Input
                value={(editedCustomer.tags || []).join(", ")}
                onChange={(e) =>
                  setEditedCustomer((prev) => ({
                    ...prev,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="tag1, tag2, tag3"
              />
            ) : (
              <div className="pl-6">
                {currentData.tags && currentData.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-hidden">
                    {currentData.tags.map((tag, index) => (
                      <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs max-w-[120px] truncate">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    No tags
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
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
              <p className="text-sm pl-6 line-clamp-2">
                {currentData.notes || (
                  <span className="text-muted-foreground italic">No notes</span>
                )}
              </p>
            )}
          </div>

          {/* Timestamps */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  Created{" "}
                  {formatDistanceToNow(new Date(currentData.created_at))}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  Updated{" "}
                  {formatDistanceToNow(new Date(currentData.updated_at))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
