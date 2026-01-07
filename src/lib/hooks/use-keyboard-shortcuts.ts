"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShortcutConfig {
  key: string;
  meta?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(
  additionalShortcuts: ShortcutConfig[] = []
) {
  const router = useRouter();

  useEffect(() => {
    const defaultShortcuts: ShortcutConfig[] = [
      // Navigation shortcuts
      {
        key: "d",
        meta: true,
        shift: true,
        action: () => router.push("/dashboard"),
        description: "Go to Dashboard",
      },
      {
        key: "c",
        meta: true,
        shift: true,
        action: () => router.push("/people"),
        description: "Go to People",
      },
      {
        key: "a",
        meta: true,
        shift: true,
        action: () => router.push("/dates"),
        description: "Go to Dates",
      },
      {
        key: "o",
        meta: true,
        shift: true,
        action: () => router.push("/documents"),
        description: "Go to Documents",
      },
      {
        key: "u",
        meta: true,
        shift: true,
        action: () => router.push("/documents/upload"),
        description: "Upload Document",
      },
      {
        key: "w",
        meta: true,
        shift: true,
        action: () => router.push("/whiteboard"),
        description: "Go to Whiteboard",
      },
      {
        key: "s",
        meta: true,
        shift: true,
        action: () => router.push("/settings"),
        description: "Go to Settings",
      },
    ];

    const allShortcuts = [...defaultShortcuts, ...additionalShortcuts];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of allShortcuts) {
        const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (metaMatch && shiftMatch && ctrlMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, additionalShortcuts]);
}

// Export shortcut list for help display
export const KEYBOARD_SHORTCUTS = [
  { keys: "⌘ + K", description: "Open command palette" },
  { keys: "⌘ + Shift + D", description: "Go to Dashboard" },
  { keys: "⌘ + Shift + C", description: "Go to People" },
  { keys: "⌘ + Shift + A", description: "Go to Dates" },
  { keys: "⌘ + Shift + O", description: "Go to Documents" },
  { keys: "⌘ + Shift + U", description: "Upload Document" },
  { keys: "⌘ + Shift + W", description: "Go to Whiteboard" },
  { keys: "⌘ + Shift + S", description: "Go to Settings" },
  { keys: "?", description: "Show keyboard shortcuts" },
];
