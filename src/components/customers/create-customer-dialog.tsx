"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCustomer } from "@/app/(dashboard)/people/actions";
import { toast } from "sonner";
import { PersonTag } from "@/types/database";
import { TagSelector } from "./tag-selector";

interface CreateCustomerDialogProps {
  personTags: PersonTag[];
}

export function CreateCustomerDialog({ personTags }: CreateCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    // Add selected tags to form data
    formData.set("tags", selectedTags.join(","));

    startTransition(async () => {
      const result = await createCustomer(formData);

      if (result.error) {
        toast.error("Failed to add person", {
          description: result.error,
        });
      } else {
        toast.success("Person added", {
          description: "The person has been added successfully",
        });
        setOpen(false);
        setSelectedTags([]);
        router.refresh();
      }
    });
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedTags([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Person</DialogTitle>
            <DialogDescription>
              Enter the contact details below. You can edit all fields later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="company" className="text-sm font-medium">
                Company
              </label>
              <Input
                id="company"
                name="company"
                placeholder="Acme Inc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="address" className="text-sm font-medium">
                Address
              </label>
              <Input
                id="address"
                name="address"
                placeholder="123 Main St, City, State 12345"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Tags
              </label>
              <TagSelector
                personTags={personTags}
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                placeholder="Select tags..."
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Add any additional notes..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
