"use client";

import { useRouter } from "next/navigation";
import { DocumentFlags } from "./document-flags";
import type { Tables } from "@/types/database";

type DbDocumentFlag = Tables<"document_flags"> & {
  resolved_by_user?: { name: string | null; email: string } | null;
};

interface DocumentFlagsWrapperProps {
  documentId: string;
  initialFlags: DbDocumentFlag[];
}

export function DocumentFlagsWrapper({
  documentId,
  initialFlags,
}: DocumentFlagsWrapperProps) {
  const router = useRouter();

  const handleFlagResolved = () => {
    // Refresh the page to get updated flags
    router.refresh();
  };

  // Convert database flags to component format
  const flags = initialFlags.map((flag) => ({
    id: flag.id,
    document_id: flag.document_id || documentId,
    flag_type: flag.flag_type,
    severity: flag.severity || "info",
    message: flag.message,
    details: (flag.details as Record<string, unknown>) || {},
    resolved: flag.resolved ?? false,
    resolved_at: flag.resolved_at ?? undefined,
    resolved_by_user: flag.resolved_by_user,
    created_at: flag.created_at || new Date().toISOString(),
  }));

  return <DocumentFlags flags={flags} onFlagResolved={handleFlagResolved} />;
}
