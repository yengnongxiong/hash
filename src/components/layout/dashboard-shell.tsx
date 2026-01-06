"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import {
  KeyboardShortcutsDialog,
  useShortcutsDialog,
} from "@/components/layout/keyboard-shortcuts-dialog";

interface DashboardShellProps {
  user: {
    email: string;
    name: string | null;
    organizations?: {
      name: string;
    } | null;
  } | null;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } = useShortcutsDialog();

  // Enable global keyboard shortcuts for navigation
  useKeyboardShortcuts();

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header
            user={user}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6 bg-muted/10">{children}</main>
        </div>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </>
  );
}
