"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppointmentWithDetails, AppointmentType, Customer } from "@/types/database";
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
import { Pencil, Trash2, X, Calendar, MapPin, User, Clock, Search, ChevronDown, Check } from "lucide-react";
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
import { updateAppointment, deleteAppointment, updateAppointmentNotes } from "@/app/(dashboard)/dates/actions";
import { formatDistanceToNow } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { OrganizationMember } from "@/components/dates/dates-view";

interface AppointmentDetailDialogProps {
  appointment: AppointmentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Pick<Customer, "id" | "name" | "company" | "customer_number">[];
  appointmentTypes: AppointmentType[];
  organizationMembers?: OrganizationMember[];
}

export function AppointmentDetailDialog({
  appointment,
  open,
  onOpenChange,
  customers,
  appointmentTypes,
  organizationMembers = [],
}: AppointmentDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [peoplePopoverOpen, setPeoplePopoverOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"scheduled" | "completed" | "cancelled">("scheduled");
  const [appointmentTypeId, setAppointmentTypeId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

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

  // Filter organization members based on search
  const filteredAssignees = organizationMembers.filter((member) => {
    if (!assigneeSearch) return true;
    const searchLower = assigneeSearch.toLowerCase();
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower)
    );
  });

  // Filter appointment types based on search
  const filteredTypes = appointmentTypes.filter((type) => {
    if (!typeSearch) return true;
    return type.name.toLowerCase().includes(typeSearch.toLowerCase());
  });

  // Get selected customers and assignees
  const selectedCustomers = customers.filter((c) => selectedCustomerIds.includes(c.id));
  const selectedAssignees = organizationMembers.filter((m) => selectedAssigneeIds.includes(m.id));

  // Toggle functions
  const toggleCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const removeCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerId));
  };

  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(assigneeId)
        ? prev.filter((id) => id !== assigneeId)
        : [...prev, assigneeId]
    );
  };

  const removeAssignee = (assigneeId: string) => {
    setSelectedAssigneeIds((prev) => prev.filter((id) => id !== assigneeId));
  };

  // Helper to format date for datetime-local input (converts to local timezone)
  const formatForDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Reset form when appointment changes or dialog opens
  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      // Use customer_ids array if available, otherwise fall back to customer_id
      const customerIds = appointment.customer_ids || (appointment.customer_id ? [appointment.customer_id] : []);
      setSelectedCustomerIds(customerIds);
      setSelectedAssigneeIds(appointment.assignee_ids || []);
      setStartTime(formatForDateTimeLocal(appointment.start_time));
      setEndTime(appointment.end_time ? formatForDateTimeLocal(appointment.end_time) : "");
      setLocation(appointment.location || "");
      setDescription(appointment.description || "");
      setStatus((appointment.status || "scheduled") as "scheduled" | "completed" | "cancelled");
      setAppointmentTypeId(appointment.appointment_types?.id || null);
      setNotes(appointment.notes || "");
    }
    // Always reset to view mode and clear search when dialog opens
    if (open) {
      setIsEditing(false);
      setIsEditingNotes(false);
      setPeopleSearch("");
      setPeoplePopoverOpen(false);
      setAssigneeSearch("");
      setAssigneePopoverOpen(false);
      setTypeSearch("");
      setTypePopoverOpen(false);
    }
  }, [appointment, open]);

  const handleSave = () => {
    if (!appointment) return;

    startTransition(async () => {
      const result = await updateAppointment(appointment.id, {
        title,
        customer_id: selectedCustomerIds.length > 0 ? selectedCustomerIds[0] : null,
        customer_ids: selectedCustomerIds.length > 0 ? selectedCustomerIds : null,
        assignee_ids: selectedAssigneeIds.length > 0 ? selectedAssigneeIds : null,
        start_time: startTime,
        end_time: endTime || null,
        location: location || null,
        description: description || null,
        status,
        date_type_id: appointmentTypeId,
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

  // Quick status change handler (for view mode)
  const handleQuickStatusChange = (newStatus: "scheduled" | "completed" | "cancelled") => {
    if (!appointment) return;

    startTransition(async () => {
      const result = await updateAppointment(appointment.id, { status: newStatus });
      if (result.error) {
        toast.error("Failed to update status", { description: result.error });
      } else {
        toast.success(`Status changed to ${newStatus}`);
        setStatus(newStatus); // Update local state for immediate feedback
        router.refresh();
      }
    });
  };

  // Save notes handler
  const handleSaveNotes = () => {
    if (!appointment) return;

    startTransition(async () => {
      const result = await updateAppointmentNotes(appointment.id, notes || null);
      if (result.error) {
        toast.error("Failed to save notes", { description: result.error });
      } else {
        toast.success("Notes saved");
        setIsEditingNotes(false);
        router.refresh();
      }
    });
  };

  if (!appointment) return null;

  const selectedType = appointmentTypes.find((t) => t.id === appointmentTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 min-w-0 pr-24">
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
                <span className="truncate block max-w-[calc(100%-2rem)]">{appointment.title}</span>
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
          <div className="space-y-4 overflow-y-auto overflow-x-hidden flex-1">
            <div className="space-y-2 overflow-hidden">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Date title"
                className="w-full"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 overflow-hidden">
              <div className="space-y-2 overflow-hidden min-w-0">
                <Label>People</Label>
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
                      {selectedCustomerIds.length === 0
                        ? "Select people"
                        : `${selectedCustomerIds.length} selected`}
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
                    <div
                      className="max-h-[250px] overflow-y-auto overscroll-contain p-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {filteredCustomers.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground text-center">
                          {customers.length === 0 ? "No people found" : "No matches found"}
                        </p>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => toggleCustomer(customer.id)}
                          >
                            <Checkbox
                              checked={selectedCustomerIds.includes(customer.id)}
                              onCheckedChange={() => toggleCustomer(customer.id)}
                            />
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
                {selectedCustomers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedCustomers.map((customer) => (
                      <Badge key={customer.id} variant="secondary" className="gap-1 max-w-full">
                        <span className="truncate max-w-[80px]">{customer.name}</span>
                        {customer.customer_number && (
                          <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                            {customer.customer_number}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCustomer(customer.id)}
                          className="ml-1 hover:text-destructive shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 overflow-hidden min-w-0">
                <Label>Type</Label>
                <Popover open={typePopoverOpen} onOpenChange={(open) => {
                  setTypePopoverOpen(open);
                  if (!open) setTypeSearch("");
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal overflow-hidden"
                    >
                      {appointmentTypeId ? (
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", selectedType?.color)} />
                          <span className="truncate">{selectedType?.name}</span>
                        </div>
                      ) : (
                        "Select a type"
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search types..."
                          value={typeSearch}
                          onChange={(e) => setTypeSearch(e.target.value)}
                          className="pl-8 h-8"
                        />
                      </div>
                    </div>
                    <div
                      className="max-h-[200px] overflow-y-auto overscroll-contain p-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <button
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                          !appointmentTypeId && "bg-muted"
                        )}
                        onClick={() => {
                          setAppointmentTypeId(null);
                          setTypePopoverOpen(false);
                        }}
                      >
                        <div className="w-2 h-2 rounded-full border border-muted-foreground/50 shrink-0" />
                        <span>No type</span>
                        {!appointmentTypeId && <Check className="h-3 w-3 ml-auto" />}
                      </button>
                      {filteredTypes.map((type) => (
                        <button
                          key={type.id}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                            appointmentTypeId === type.id && "bg-muted"
                          )}
                          onClick={() => {
                            setAppointmentTypeId(type.id);
                            setTypePopoverOpen(false);
                          }}
                        >
                          <div className={cn("w-2 h-2 rounded-full shrink-0", type.color)} />
                          <span className="truncate" title={type.name}>{type.name}</span>
                          {appointmentTypeId === type.id && <Check className="h-3 w-3 ml-auto shrink-0" />}
                        </button>
                      ))}
                      {filteredTypes.length === 0 && typeSearch && (
                        <p className="p-2 text-sm text-muted-foreground text-center">
                          No types found
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Assignee field */}
            {organizationMembers.length > 0 && (
              <div className="space-y-2 overflow-hidden">
                <Label>Assignee</Label>
                <Popover open={assigneePopoverOpen} onOpenChange={(open) => {
                  setAssigneePopoverOpen(open);
                  if (!open) setAssigneeSearch("");
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {selectedAssigneeIds.length === 0
                        ? "Select team members"
                        : `${selectedAssigneeIds.length} assigned`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search team members..."
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          className="pl-8 h-8"
                        />
                      </div>
                    </div>
                    <div
                      className="max-h-[250px] overflow-y-auto overscroll-contain p-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {filteredAssignees.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground text-center">
                          {organizationMembers.length === 0 ? "No team members found" : "No matches found"}
                        </p>
                      ) : (
                        filteredAssignees.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => toggleAssignee(member.id)}
                          >
                            <Checkbox
                              checked={selectedAssigneeIds.includes(member.id)}
                              onCheckedChange={() => toggleAssignee(member.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{member.name || member.email}</p>
                              {member.name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.email}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedAssignees.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAssignees.map((member) => (
                      <Badge key={member.id} variant="secondary" className="gap-1 max-w-full">
                        <span className="truncate max-w-[100px]">{member.name || member.email}</span>
                        <button
                          type="button"
                          onClick={() => removeAssignee(member.id)}
                          className="ml-1 hover:text-destructive shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 overflow-hidden">
              <div className="space-y-2 overflow-hidden min-w-0">
                <Label htmlFor="edit-start">Start Time *</Label>
                <Input
                  id="edit-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2 overflow-hidden min-w-0">
                <Label htmlFor="edit-end">End Time (optional)</Label>
                <Input
                  id="edit-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2 overflow-hidden">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, Zoom, etc."
                className="w-full"
                maxLength={500}
              />
            </div>

            <div className="space-y-2 overflow-hidden">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full resize-none break-words"
                maxLength={2000}
              />
            </div>

            <div className="space-y-2 overflow-hidden">
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
                {(() => {
                  const startDate = new Date(appointment.start_time);
                  const endDate = appointment.end_time ? new Date(appointment.end_time) : null;
                  const isSameDay = endDate &&
                    startDate.getFullYear() === endDate.getFullYear() &&
                    startDate.getMonth() === endDate.getMonth() &&
                    startDate.getDate() === endDate.getDate();

                  if (endDate && !isSameDay) {
                    // Multi-day event
                    return (
                      <>
                        <p className="font-medium">
                          {format(startDate, "EEEE, MMMM d, yyyy")} → {format(endDate, "EEEE, MMMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(startDate, "h:mm a")} → {format(endDate, "h:mm a")}
                        </p>
                      </>
                    );
                  } else {
                    // Same day or no end time
                    return (
                      <>
                        <p className="font-medium">
                          {format(startDate, "EEEE, MMMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(startDate, "h:mm a")}
                          {endDate && <> - {format(endDate, "h:mm a")}</>}
                        </p>
                      </>
                    );
                  }
                })()}
              </div>
            </div>

            {/* People */}
            {selectedCustomers.length > 0 && (
              <div className="flex items-start gap-3 overflow-hidden">
                <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground mb-1">People</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCustomers.map((customer) => (
                      <Badge key={customer.id} variant="secondary" className="gap-1">
                        <span className="truncate max-w-[100px]">{customer.name}</span>
                        {customer.customer_number && (
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {customer.customer_number}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Assignees */}
            {appointment.assignees && appointment.assignees.length > 0 && (
              <div className="flex items-start gap-3 overflow-hidden">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Assignees</p>
                  <div className="flex flex-wrap gap-1">
                    {appointment.assignees.map((assignee) => (
                      <Badge key={assignee.id} variant="outline" className="truncate max-w-[150px]">
                        {assignee.name || assignee.email}
                      </Badge>
                    ))}
                  </div>
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
                <Badge variant="outline" className="gap-1.5 max-w-[180px]" title={appointment.appointment_types.name}>
                  <div className={cn("w-2 h-2 rounded-full shrink-0", appointment.appointment_types.color)} />
                  <span className="truncate">{appointment.appointment_types.name}</span>
                </Badge>
              )}
              {/* Clickable status badge with colors */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                    disabled={isPending}
                  >
                    {(() => {
                      const startDate = new Date(appointment.start_time);
                      const today = new Date();
                      const isToday = startDate.toDateString() === today.toDateString();
                      const isPastDate = startDate < today && !isToday;

                      if (status === "completed") {
                        return (
                          <Badge className="cursor-pointer hover:opacity-80 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                            Completed
                          </Badge>
                        );
                      } else if (status === "cancelled") {
                        return (
                          <Badge variant="secondary" className="cursor-pointer hover:opacity-80">
                            Cancelled
                          </Badge>
                        );
                      } else if (isPastDate) {
                        return (
                          <Badge className="cursor-pointer hover:opacity-80 bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                            Overdue
                          </Badge>
                        );
                      } else if (isToday) {
                        return (
                          <Badge className="cursor-pointer hover:opacity-80 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Today
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="cursor-pointer hover:opacity-80 bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                            Upcoming
                          </Badge>
                        );
                      }
                    })()}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  <div className="flex flex-col">
                    <button
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                        status === "scheduled" && "font-medium"
                      )}
                      onClick={() => handleQuickStatusChange("scheduled")}
                    >
                      {status === "scheduled" && <Check className="h-3 w-3" />}
                      <span className={status === "scheduled" ? "" : "ml-5"}>Scheduled</span>
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                        status === "completed" && "font-medium"
                      )}
                      onClick={() => handleQuickStatusChange("completed")}
                    >
                      {status === "completed" && <Check className="h-3 w-3" />}
                      <span className={status === "completed" ? "" : "ml-5"}>Completed</span>
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                        status === "cancelled" && "font-medium"
                      )}
                      onClick={() => handleQuickStatusChange("cancelled")}
                    >
                      {status === "cancelled" && <Check className="h-3 w-3" />}
                      <span className={status === "cancelled" ? "" : "ml-5"}>Cancelled</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            {appointment.description && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <div className="max-h-[150px] overflow-y-auto">
                  <p className="text-sm break-words whitespace-pre-wrap">{appointment.description}</p>
                </div>
              </div>
            )}

            {/* Team Notes with user attribution */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Team Notes</p>
                {!isEditingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    {notes ? "Edit" : "Add Note"}
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNotes(appointment.notes || "");
                        setIsEditingNotes(false);
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isPending}
                    >
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : notes ? (
                <div>
                  <div className="max-h-[100px] overflow-y-auto">
                    <p className="text-sm break-words whitespace-pre-wrap">{notes}</p>
                  </div>
                  {appointment.notes_updated_at && appointment.notes_user && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated by {appointment.notes_user.name || appointment.notes_user.email} • {formatDistanceToNow(new Date(appointment.notes_updated_at))}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes yet</p>
              )}
            </div>

            {/* Timestamps with user info */}
            <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>
                  Created on {format(new Date(appointment.created_at || new Date()), "MMM d, yyyy 'at' h:mm a")}
                  {appointment.created_by_user && (
                    <> by <span className="font-medium text-foreground">{appointment.created_by_user.name || appointment.created_by_user.email}</span></>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>
                  Updated on {format(new Date(appointment.updated_at || new Date()), "MMM d, yyyy 'at' h:mm a")}
                  {(() => {
                    const updatedUser = appointment.updated_by_user || appointment.created_by_user;
                    return updatedUser ? (
                      <> by <span className="font-medium text-foreground">{updatedUser.name || updatedUser.email}</span></>
                    ) : null;
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
