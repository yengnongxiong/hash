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
import { Plus, ChevronDown, X } from "lucide-react";
import { createAppointment } from "@/app/(dashboard)/dates/actions";
import { toast } from "sonner";
import { Customer, AppointmentType } from "@/types/database";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CreateAppointmentDialogProps {
  customers: Pick<Customer, "id" | "name" | "company">[];
  appointmentTypes?: AppointmentType[];
}

export function CreateAppointmentDialog({ customers, appointmentTypes = [] }: CreateAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [peoplePopoverOpen, setPeoplePopoverOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Add selected customer IDs to form data
    formData.delete("customer_ids"); // Remove any existing
    selectedCustomerIds.forEach((id) => {
      formData.append("customer_ids", id);
    });

    startTransition(async () => {
      const result = await createAppointment(formData);
      if (result.error) {
        toast.error("Failed to create date", { description: result.error });
      } else {
        toast.success("Date created");
        setOpen(false);
        setSelectedCustomerIds([]);
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

  const selectedCustomers = customers.filter((c) => selectedCustomerIds.includes(c.id));

  // Default to tomorrow 9 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const defaultStart = tomorrow.toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) setSelectedCustomerIds([]);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Date
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Date</DialogTitle>
          <DialogDescription>
            Create a new date. Only title and start time are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Meeting with client"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>People</Label>
              <Popover open={peoplePopoverOpen} onOpenChange={setPeoplePopoverOpen}>
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
                <PopoverContent className="w-[250px] p-0" align="start">
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {customers.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">No people found</p>
                    ) : (
                      customers.map((customer) => (
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
                            <p className="text-sm truncate">{customer.name}</p>
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
                    <Badge key={customer.id} variant="secondary" className="gap-1">
                      {customer.name}
                      <button
                        type="button"
                        onClick={() => removeCustomer(customer.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment_type_id">Type</Label>
              <Select name="appointment_type_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                defaultValue={defaultStart}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time (optional)</Label>
              <Input
                id="end_time"
                name="end_time"
                type="datetime-local"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="Office, Zoom, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
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
