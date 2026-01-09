"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PersonTag } from "@/types/database";
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
import { Tags, Plus, Trash2 } from "lucide-react";
import { createPersonTag, deletePersonTag } from "@/app/(dashboard)/people/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PersonTagsDialogProps {
  personTags: PersonTag[];
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

export { COLOR_OPTIONS };

export function PersonTagsDialog({ personTags }: PersonTagsDialogProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("bg-blue-500");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast.error("Please enter a tag name");
      return;
    }

    startTransition(async () => {
      const result = await createPersonTag(newTagName, newTagColor);

      if (result.error) {
        toast.error("Failed to create tag", { description: result.error });
      } else {
        toast.success("Tag created");
        setNewTagName("");
        setNewTagColor("bg-blue-500");
        router.refresh();
      }
    });
  };

  const handleDeleteTag = (id: string, name: string) => {
    startTransition(async () => {
      const result = await deletePersonTag(id);

      if (result.error) {
        toast.error("Failed to delete tag", { description: result.error });
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
          <Tags className="h-4 w-4 mr-2" />
          Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Person Tags</DialogTitle>
          <DialogDescription>
            Manage tags for your organization. Tags help categorize and organize your people.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Tags */}
          <div className="space-y-2">
            <Label>Current Tags</Label>
            {personTags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tags yet. Create one below.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {personTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn("w-4 h-4 rounded-full shrink-0", tag.color)} />
                      <span className="font-medium truncate flex-1 w-0">{tag.name}</span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{tag.name}&quot;? People using this tag will have it removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTag(tag.id, tag.name)}
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

          {/* Create New Tag */}
          <div className="space-y-3 pt-4 border-t">
            <Label>Create New Tag</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Tag name (e.g., VIP)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTagName.trim()) {
                    handleCreateTag();
                  }
                }}
              />
              <Button
                onClick={handleCreateTag}
                disabled={isPending || !newTagName.trim()}
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
                    onClick={() => setNewTagColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.value,
                      newTagColor === color.value
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
