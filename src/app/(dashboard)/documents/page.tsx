import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { DocumentsView } from "@/components/documents/documents-view";

export default async function DocumentsPage() {
  const supabase = await createClient();

  // Fetch documents and flags in parallel
  // Filter out soft-deleted documents (deleted_at is NULL)
  const [documentsResult, flagsResult] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("document_flags")
      .select("document_id, resolved")
  ]);

  if (documentsResult.error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading documents: {documentsResult.error.message}</p>
      </div>
    );
  }

  // Fetch customers for documents that have customer_id
  const customerIds = [...new Set(
    (documentsResult.data || [])
      .filter(doc => doc.customer_id)
      .map(doc => doc.customer_id as string)
  )];

  let customersMap: Record<string, { name: string; company: string | null }> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, company")
      .in("id", customerIds);

    if (customers) {
      customersMap = Object.fromEntries(
        customers.map(c => [c.id, { name: c.name, company: c.company }])
      );
    }
  }

  // Calculate flag counts per document
  const flagCountsByDocument = new Map<string, { total: number; unresolved: number }>();
  if (flagsResult.data) {
    for (const flag of flagsResult.data) {
      const existing = flagCountsByDocument.get(flag.document_id) || { total: 0, unresolved: 0 };
      existing.total++;
      if (!flag.resolved) {
        existing.unresolved++;
      }
      flagCountsByDocument.set(flag.document_id, existing);
    }
  }

  // Merge flag counts and customers into documents
  const documents = (documentsResult.data || []).map(doc => ({
    ...doc,
    customers: doc.customer_id ? customersMap[doc.customer_id] || null : null,
    flag_count: flagCountsByDocument.get(doc.id)?.total || 0,
    unresolved_flag_count: flagCountsByDocument.get(doc.id)?.unresolved || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            View and manage your uploaded documents
          </p>
        </div>
        <Link href="/documents/calendar">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
        </Link>
      </div>

      <DocumentsView documents={documents || []} />
    </div>
  );
}
