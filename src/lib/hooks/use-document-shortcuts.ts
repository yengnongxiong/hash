"use client";

import { useEffect, useCallback } from "react";

export interface DocumentShortcutActions {
  onApprove?: () => void;
  onReject?: () => void;
  onSkip?: () => void;
  onEdit?: () => void;
  onFlag?: () => void;
  onNextDocument?: () => void;
  onPreviousDocument?: () => void;
  onTogglePreview?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRotate?: () => void;
}

interface UseDocumentShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for document review keyboard shortcuts
 *
 * Default shortcuts:
 * - A: Approve document
 * - R: Reject document
 * - S: Skip to next (without action)
 * - E: Edit extracted data
 * - F: Add flag
 * - J/Down: Next document
 * - K/Up: Previous document
 * - P: Toggle preview panel
 * - +/=: Zoom in
 * - -: Zoom out
 * - Ctrl+R: Rotate preview
 */
export function useDocumentShortcuts(
  actions: DocumentShortcutActions,
  options: UseDocumentShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[role='dialog']") // Ignore in dialogs
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except for specific combos)
      if (event.altKey || (event.metaKey && event.key !== "r")) {
        return;
      }

      let handled = false;

      // Handle shortcuts
      switch (event.key.toLowerCase()) {
        case "a":
          if (!event.ctrlKey && !event.shiftKey && actions.onApprove) {
            actions.onApprove();
            handled = true;
          }
          break;

        case "r":
          if (event.ctrlKey && actions.onRotate) {
            actions.onRotate();
            handled = true;
          } else if (!event.ctrlKey && !event.shiftKey && actions.onReject) {
            actions.onReject();
            handled = true;
          }
          break;

        case "s":
          if (!event.ctrlKey && !event.shiftKey && actions.onSkip) {
            actions.onSkip();
            handled = true;
          }
          break;

        case "e":
          if (!event.ctrlKey && !event.shiftKey && actions.onEdit) {
            actions.onEdit();
            handled = true;
          }
          break;

        case "f":
          if (!event.ctrlKey && !event.shiftKey && actions.onFlag) {
            actions.onFlag();
            handled = true;
          }
          break;

        case "j":
        case "arrowdown":
          if (!event.ctrlKey && actions.onNextDocument) {
            actions.onNextDocument();
            handled = true;
          }
          break;

        case "k":
        case "arrowup":
          if (!event.ctrlKey && actions.onPreviousDocument) {
            actions.onPreviousDocument();
            handled = true;
          }
          break;

        case "p":
          if (!event.ctrlKey && !event.shiftKey && actions.onTogglePreview) {
            actions.onTogglePreview();
            handled = true;
          }
          break;

        case "+":
        case "=":
          if (actions.onZoomIn) {
            actions.onZoomIn();
            handled = true;
          }
          break;

        case "-":
          if (actions.onZoomOut) {
            actions.onZoomOut();
            handled = true;
          }
          break;
      }

      if (handled && preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [actions, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Get shortcut help text for display
 */
export function getDocumentShortcutHelp(): Array<{
  key: string;
  description: string;
  category: string;
}> {
  return [
    // Review Actions
    { key: "A", description: "Approve document", category: "Review" },
    { key: "R", description: "Reject document", category: "Review" },
    { key: "S", description: "Skip to next", category: "Review" },
    { key: "E", description: "Edit extracted data", category: "Review" },
    { key: "F", description: "Add flag", category: "Review" },

    // Navigation
    { key: "J / \u2193", description: "Next document", category: "Navigation" },
    { key: "K / \u2191", description: "Previous document", category: "Navigation" },

    // Preview
    { key: "P", description: "Toggle preview", category: "Preview" },
    { key: "+ / =", description: "Zoom in", category: "Preview" },
    { key: "-", description: "Zoom out", category: "Preview" },
    { key: "Ctrl+R", description: "Rotate preview", category: "Preview" },
  ];
}
