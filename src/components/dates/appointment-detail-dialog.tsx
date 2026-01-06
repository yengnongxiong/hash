"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppointmentWithRelations, AppointmentType, Customer } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Pencil, Trash2, X, Calendar, MapPin, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { updateAppointment, deleteAppointment } from "@/app/(dashboard)/dates/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppointmentDetailDialogProps {
  appointment: AppointmentWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Pick<Customer, "id" | "name" | "company">[];
  appointmentTypes: AppointmentType[];
}

export function AppointmentDetailDialog({
  appointment,
  open,
  onOpenChange,
  customers,
  appointmentTypes,
}: AppointmentDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"scheduled" | "completed" | "cancelled">("scheduled");
  const [appointmentTypeId, setAppointmentTypeId] = useState<string | null>(null);

  // Reset form when appointment changes or dialog opens
  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      setCustomerId(appointment.customer_id);
      setStartTime(appointment.start_time.slice(0, 16));
      setEndTime(appointment.end_time?.slice(0, 16) || "");
      setLocation(appointment.location || "");
      setDescription(appointment.description || "");
      setStatus(appointment.status);
      setAppointmentTypeId(appointment.appointment_types?.id || null);
    }
    // Always reset to view mode when dialog opens
    if (open) {
      setIsEditing(false);
    }
  }, [appointment, open]);

  const handleSave = () => {
    if (!appointment) return;

    startTransition(async () => {
      const result = await updateAppointment(appointment.id, {
        title,
        customer_id: customerId,
        start_time: startTime,
        end_time: endTime || null,
        location: location || null,
        description: description || null,
        status,
        appointment_type_id: appointmentTypeId,
      });

      if (result.error) {
        toast.error("Failed to update appointment", { description: result.error });
      } else {
        toast.success("Appointment updated");
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!appointment) return;

    startTransition(async () => {
      const result = await deleteAppointment(appointment.id);

      if (result.error) {
        toast.error("Failed to delete appointment", { description: result.error });
      } else {
        toast.success("Appointment deleted");
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  if (!appointment) return null;

  const selectedType = appointmentTypes.find((t) => t.id === appointmentTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? (
                "Edit Appointment"
              ) : (
                <>
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      appointment.appointment_types?.color || "bg-blue-500"
                    )}
                  />
                  {appointment.title}
                </>
              )}
            </DialogTitle>
            {!isEditing && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this appointment? This action cannot be undone.
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
            )}
          </div>
          <DialogDescription>
            {isEditing ? "Update the appointment details below." : "View appointment details."}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Appointment title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customer">Person</Label>
              <Select
                value={customerId || "none"}
                onValueChange={(v) => setCustomerId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No person</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.company && ` - ${customer.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={appointmentTypeId || "none"}
                onValueChange={(v) => setAppointmentTypeId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No type</SelectItem>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", type.color)} />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Time *</Label>
                <Input
                  id="edit-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Time (optional)</Label>
                <Input
                  id="edit-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, Zoom, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending || !title || !startTime}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(new Date(appointment.start_time), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(appointment.start_time), "h:mm a")}
                  {appointment.end_time && (
                    <> - {format(new Date(appointment.end_time), "h:mm a")}</>
                  )}
                </p>
              </div>
            </div>

            {/* Person */}
            {appointment.customers && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{appointment.customers.name}</p>
                  {appointment.customers.company && (
                    <p className="text-sm text-muted-foreground">
                      {appointment.customers.company}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {appointment.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p>{appointment.location}</p>
              </div>
            )}

            {/* Type & Status */}
            <div className="flex items-center gap-3">
              {appointment.appointment_types && (
                <Badge variant="outline" className="gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", appointment.appointment_types.color)} />
                  {appointment.appointment_types.name}
                </Badge>
              )}
              <Badge
                variant={
                  appointment.status === "cancelled"
                    ? "secondary"
                    : appointment.status === "completed"
                    ? "outline"
                    : "default"
                }
              >
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
            </div>

            {/* Description */}
            {appointment.description && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{appointment.description}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              <p>Created: {format(new Date(appointment.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
              <p>Updated: {format(new Date(appointment.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
