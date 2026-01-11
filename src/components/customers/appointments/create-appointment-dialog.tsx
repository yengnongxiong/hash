"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, ChevronDown, X, Search, Check } from "lucide-react";
import { createAppointment } from "@/app/(dashboard)/dates/actions";
import { toast } from "sonner";
import { Customer, AppointmentType } from "@/types/database";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { OrganizationMember } from "@/components/dates/dates-view";

interface CreateAppointmentDialogProps {
  customers: Pick<Customer, "id" | "name" | "company" | "customer_number">[];
  appointmentTypes?: AppointmentType[];
  organizationMembers?: OrganizationMember[];
  // Controlled mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: Date;
}

export function CreateAppointmentDialog({
  customers,
  appointmentTypes = [],
  organizationMembers = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultDate,
}: CreateAppointmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [peoplePopoverOpen, setPeoplePopoverOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const router = useRouter();

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Add selected customer IDs to form data
    formData.delete("customer_ids"); // Remove any existing
    selectedCustomerIds.forEach((id) => {
      formData.append("customer_ids", id);
    });

    // Add selected assignee IDs to form data
    formData.delete("assignee_ids"); // Remove any existing
    selectedAssigneeIds.forEach((id) => {
      formData.append("assignee_ids", id);
    });

    // Add selected type ID to form data
    formData.delete("date_type_id"); // Remove any existing
    if (selectedTypeId) {
      formData.set("date_type_id", selectedTypeId);
    }

    startTransition(async () => {
      const result = await createAppointment(formData);
      if (result.error) {
        toast.error("Failed to create date", { description: result.error });
      } else {
        toast.success("Date created");
        setOpen(false);
        setSelectedCustomerIds([]);
        setSelectedAssigneeIds([]);
        setSelectedTypeId(null);
        router.refresh();
      }
    });
  };

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

  const selectedCustomers = customers.filter((c) => selectedCustomerIds.includes(c.id));
  const selectedAssignees = organizationMembers.filter((m) => selectedAssigneeIds.includes(m.id));

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

  // Get selected type
  const selectedType = appointmentTypes.find((t) => t.id === selectedTypeId);

  // Helper to format date for datetime-local input (in local timezone)
  const formatForDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Default to provided date at 9 AM, or tomorrow 9 AM
  const getDefaultStart = () => {
    if (defaultDate) {
      const date = new Date(defaultDate);
      date.setHours(9, 0, 0, 0);
      return formatForDateTimeLocal(date);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return formatForDateTimeLocal(tomorrow);
  };
  const defaultStart = getDefaultStart();

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        setSelectedCustomerIds([]);
        setSelectedAssigneeIds([]);
        setSelectedTypeId(null);
        setTypeSearch("");
        setTypePopoverOpen(false);
      }
    }}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Date
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Schedule Date</DialogTitle>
          <DialogDescription>
            Create a new date. Only title and start time are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto overflow-x-hidden flex-1">
          <div className="space-y-2 overflow-hidden">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Meeting with client"
              required
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
                      <span className="truncate max-w-[100px]">{customer.name}</span>
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
                    {selectedTypeId ? (
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
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                        !selectedTypeId && "bg-muted"
                      )}
                      onClick={() => {
                        setSelectedTypeId(null);
                        setTypePopoverOpen(false);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full border border-muted-foreground/50 shrink-0" />
                      <span>No type</span>
                      {!selectedTypeId && <Check className="h-3 w-3 ml-auto" />}
                    </button>
                    {filteredTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                          selectedTypeId === type.id && "bg-muted"
                        )}
                        onClick={() => {
                          setSelectedTypeId(type.id);
                          setTypePopoverOpen(false);
                        }}
                      >
                        <div className={cn("w-2 h-2 rounded-full shrink-0", type.color)} />
                        <span className="truncate" title={type.name}>{type.name}</span>
                        {selectedTypeId === type.id && <Check className="h-3 w-3 ml-auto shrink-0" />}
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
                      <span className="truncate max-w-[120px]">{member.name || member.email}</span>
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
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                defaultValue={defaultStart}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2 overflow-hidden min-w-0">
              <Label htmlFor="end_time">End Time (optional)</Label>
              <Input
                id="end_time"
                name="end_time"
                type="datetime-local"
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2 overflow-hidden">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="Office, Zoom, etc."
              className="w-full"
              maxLength={500}
            />
          </div>

          <div className="space-y-2 overflow-hidden">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Additional notes..."
              rows={3}
              className="w-full resize-none break-words"
              maxLength={2000}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Date"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
