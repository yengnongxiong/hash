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
import { Pencil, Trash2, X, Calendar, MapPin, User, Clock, Search, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { updateAppointment, deleteAppointment } from "@/app/(dashboard)/dates/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppointmentDetailDialogProps {
  appointment: AppointmentWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Pick<Customer, "id" | "name" | "company" | "customer_number">[];
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
  const [peoplePopoverOpen, setPeoplePopoverOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"scheduled" | "completed" | "cancelled">("scheduled");
  const [appointmentTypeId, setAppointmentTypeId] = useState<string | null>(null);

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer) => {
    if (!peopleSearch) return true;
    const searchLower = peopleSearch.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.company?.toLowerCase().includes(searchLower) ||
      customer.customer_number?.toLowerCase().includes(searchLower)
    );
  });

  // Get selected customer
  const selectedCustomer = customerId ? customers.find((c) => c.id === customerId) : null;

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
    // Always reset to view mode and clear search when dialog opens
    if (open) {
      setIsEditing(false);
      setPeopleSearch("");
      setPeoplePopoverOpen(false);
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
        toast.error("Failed to update date", { description: result.error });
      } else {
        toast.success("Date updated");
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
        toast.error("Failed to delete date", { description: result.error });
      } else {
        toast.success("Date deleted");
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  if (!appointment) return null;

  const selectedType = appointmentTypes.find((t) => t.id === appointmentTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader className="pr-20 shrink-0">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            {isEditing ? (
              "Edit Date"
            ) : (
              <>
                <div
                  className={cn(
                    "w-3 h-3 rounded-full shrink-0",
                    appointment.appointment_types?.color || "border border-muted-foreground"
                  )}
                />
                <span className="truncate">{appointment.title}</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the date details below." : "View date details."}
          </DialogDescription>
        </DialogHeader>

        {/* Action buttons - positioned absolutely with enough space from close button */}
        {!isEditing && (
          <div className="absolute right-14 top-4 flex items-center gap-1 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit date</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete date</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Date</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this date? This action cannot be undone.
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
            </TooltipProvider>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Date title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customer">Person</Label>
              <Popover open={peoplePopoverOpen} onOpenChange={(open) => {
                setPeoplePopoverOpen(open);
                if (!open) setPeopleSearch("");
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedCustomer ? (
                      <span className="truncate">
                        {selectedCustomer.name}
                        {selectedCustomer.customer_number && (
                          <span className="text-muted-foreground ml-2 font-mono text-xs">
                            {selectedCustomer.customer_number}
                          </span>
                        )}
                      </span>
                    ) : (
                      "Select a person"
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search people..."
                        value={peopleSearch}
                        onChange={(e) => setPeopleSearch(e.target.value)}
                        className="pl-8 h-8"
                      />
                    </div>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-1">
                    {/* No person option */}
                    <div
                      className={cn(
                        "flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer",
                        customerId === null && "bg-muted"
                      )}
                      onClick={() => {
                        setCustomerId(null);
                        setPeoplePopoverOpen(false);
                        setPeopleSearch("");
                      }}
                    >
                      <span className="text-sm text-muted-foreground">No person</span>
                    </div>
                    {filteredCustomers.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground text-center">
                        {customers.length === 0 ? "No people found" : "No matches found"}
                      </p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className={cn(
                            "flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer",
                            customerId === customer.id && "bg-muted"
                          )}
                          onClick={() => {
                            setCustomerId(customer.id);
                            setPeoplePopoverOpen(false);
                            setPeopleSearch("");
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm truncate">{customer.name}</p>
                              {customer.customer_number && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {customer.customer_number}
                                </span>
                              )}
                            </div>
                            {customer.company && (
                              <p className="text-xs text-muted-foreground truncate">
                                {customer.company}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", type.color)} />
                        <span className="truncate">{type.name}</span>
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
          <div className="space-y-4 overflow-y-auto flex-1">
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
              <div className="flex items-start gap-3 overflow-hidden">
                <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{appointment.customers.name}</p>
                  {appointment.customers.company && (
                    <p className="text-sm text-muted-foreground truncate">
                      {appointment.customers.company}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {appointment.location && (
              <div className="flex items-start gap-3 overflow-hidden">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="truncate min-w-0 flex-1">{appointment.location}</p>
              </div>
            )}

            {/* Type & Status */}
            <div className="flex items-center gap-3">
              {appointment.appointment_types && (
                <Badge variant="outline" className="gap-1.5 max-w-[150px]">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", appointment.appointment_types.color)} />
                  <span className="truncate">{appointment.appointment_types.name}</span>
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
                <div className="max-h-[150px] overflow-y-auto">
                  <p className="text-sm break-words whitespace-pre-wrap">{appointment.description}</p>
                </div>
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
