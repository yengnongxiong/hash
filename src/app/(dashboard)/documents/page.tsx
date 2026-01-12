import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3 } from "lucide-react";
import { DocumentsView } from "@/components/documents/documents-view";
import { getDocuments } from "./actions";

interface SearchParams {
  page?: string;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const limit = 50;

  const supabase = await createClient();

  // Fetch paginated documents using the action
  const documentsResult = await getDocuments(page, limit);

  // Fetch flags for the current page's documents
  const documentIds = documentsResult.data.map((doc) => doc.id);
  const { data: flagsData } = await supabase
    .from("document_flags")
    .select("document_id, resolved")
    .in("document_id", documentIds);

  // Calculate flag counts per document
  const flagCountsByDocument = new Map<string, { total: number; unresolved: number }>();
  if (flagsData) {
    for (const flag of flagsData) {
      const existing = flagCountsByDocument.get(flag.document_id) || { total: 0, unresolved: 0 };
      existing.total++;
      if (!flag.resolved) {
        existing.unresolved++;
      }
      flagCountsByDocument.set(flag.document_id, existing);
    }
  }

  // Merge flag counts into documents
  const documents = documentsResult.data.map((doc) => ({
    ...doc,
    flag_count: flagCountsByDocument.get(doc.id)?.total || 0,
    unresolved_flag_count: flagCountsByDocument.get(doc.id)?.unresolved || 0,
  })) as unknown as Parameters<typeof DocumentsView>[0]["documents"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            View and manage your uploaded documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/documents/quality">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Quality
            </Button>
          </Link>
          <Link href="/documents/calendar">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
          </Link>
        </div>
      </div>

      <DocumentsView
        documents={documents}
        pagination={{
          page: documentsResult.page,
          totalPages: documentsResult.totalPages,
          total: documentsResult.total,
          limit: documentsResult.limit,
        }}
      />
    </div>
  );
}
