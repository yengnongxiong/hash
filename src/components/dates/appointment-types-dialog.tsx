"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppointmentType } from "@/types/database";
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
import { Settings, Plus, Trash2 } from "lucide-react";
import { createAppointmentType, deleteAppointmentType } from "@/app/(dashboard)/dates/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppointmentTypesDialogProps {
  appointmentTypes: AppointmentType[];
}

const COLOR_OPTIONS = [
  { value: "bg-blue-500", label: "Blue" },
  { value: "bg-green-500", label: "Green" },
  { value: "bg-purple-500", label: "Purple" },
  { value: "bg-red-500", label: "Red" },
  { value: "bg-orange-500", label: "Orange" },
  { value: "bg-yellow-500", label: "Yellow" },
  { value: "bg-pink-500", label: "Pink" },
  { value: "bg-indigo-500", label: "Indigo" },
  { value: "bg-teal-500", label: "Teal" },
  { value: "bg-gray-500", label: "Gray" },
];

export function AppointmentTypesDialog({ appointmentTypes }: AppointmentTypesDialogProps) {
  const [open, setOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("bg-blue-500");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreateType = () => {
    if (!newTypeName.trim()) {
      toast.error("Please enter a type name");
      return;
    }

    startTransition(async () => {
      const result = await createAppointmentType(newTypeName, newTypeColor);

      if (result.error) {
        toast.error("Failed to create type", { description: result.error });
      } else {
        toast.success("Date type created");
        setNewTypeName("");
        setNewTypeColor("bg-blue-500");
        router.refresh();
      }
    });
  };

  const handleDeleteType = (id: string, name: string) => {
    startTransition(async () => {
      const result = await deleteAppointmentType(id);

      if (result.error) {
        toast.error("Failed to delete type", { description: result.error });
      } else {
        toast.success(`"${name}" deleted`);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Types
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Date Types</DialogTitle>
          <DialogDescription>
            Manage date types for your organization. Types help categorize and color-code your dates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Types */}
          <div className="space-y-2">
            <Label>Current Types</Label>
            {appointmentTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No date types yet. Create one below.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {appointmentTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-4 h-4 rounded-full", type.color)} />
                      <span className="font-medium">{type.name}</span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Type</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{type.name}&quot;? Dates using this type will have their type cleared.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteType(type.id, type.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Type */}
          <div className="space-y-3 pt-4 border-t">
            <Label>Create New Type</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type name (e.g., Interview)"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCreateType}
                disabled={isPending || !newTypeName.trim()}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewTypeColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.value,
                      newTypeColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary"
                        : "hover:scale-110"
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
