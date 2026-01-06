"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Users,
  FileText,
  Upload,
  Settings,
  Kanban,
  Calendar,
  Search,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pages = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "overview"] },
  { name: "People", href: "/customers", icon: Users, keywords: ["crm", "contacts", "customers", "clients"] },
  { name: "Dates", href: "/dates", icon: Calendar, keywords: ["appointments", "meetings", "schedule", "due", "calendar"] },
  { name: "Documents", href: "/documents", icon: FileText, keywords: ["files", "pdfs"] },
  { name: "Upload Document", href: "/documents/upload", icon: Upload, keywords: ["new", "add"] },
  { name: "Whiteboard", href: "/whiteboard", icon: Kanban, keywords: ["tasks", "board"] },
  { name: "Settings", href: "/settings", icon: Settings, keywords: ["preferences", "config"] },
];

const actions = [
  { name: "New Person", action: "new-customer", icon: Plus, keywords: ["add", "create", "customer", "contact"] },
  { name: "Upload Document", action: "upload-document", icon: Upload, keywords: ["add", "new"] },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2">
        <Command
          className="rounded-lg border bg-popover text-popover-foreground shadow-md"
          shouldFilter={true}
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="pb-2">
              {pages.map((page) => (
                <Command.Item
                  key={page.href}
                  value={`${page.name} ${page.keywords.join(" ")}`}
                  onSelect={() => runCommand(() => router.push(page.href))}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                  )}
                >
                  <page.icon className="h-4 w-4" />
                  <span>{page.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="pb-2">
              {actions.map((action) => (
                <Command.Item
                  key={action.action}
                  value={`${action.name} ${action.keywords.join(" ")}`}
                  onSelect={() =>
                    runCommand(() => {
                      if (action.action === "new-customer") {
                        router.push("/customers?new=true");
                      } else if (action.action === "upload-document") {
                        router.push("/documents/upload");
                      }
                    })
                  }
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                    "aria-selected:bg-accent aria-selected:text-accent-foreground"
                  )}
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </>
  );
}
