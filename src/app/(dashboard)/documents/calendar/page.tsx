import { createClient } from "@/lib/supabase/server";
import { DocumentCalendar } from "@/components/documents/document-calendar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ExtractedData {
  dueDate?: string;
  invoiceDate?: string;
  expirationDate?: string;
  effectiveDate?: string;
  transactionDate?: string;
  dates?: Array<{
    date: string;
    type: string;
    context?: string;
  }>;
}

interface DocumentDate {
  id: string;
  documentId: string;
  documentName: string;
  documentNumber: string | null;
  date: Date;
  type: string;
  context?: string;
}

export default async function DocumentCalendarPage() {
  const supabase = await createClient();

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, file_name, document_number, extracted_data, document_type")
    .eq("status", "completed")
    .not("extracted_data", "is", null);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading documents: {error.message}</p>
      </div>
    );
  }

  // Extract dates from all documents
  const documentDates: DocumentDate[] = [];

  for (const doc of documents || []) {
    const data = doc.extracted_data as ExtractedData | null;
    if (!data) continue;

    // Standard date fields
    if (data.dueDate) {
      documentDates.push({
        id: `${doc.id}-due`,
        documentId: doc.id,
        documentName: doc.file_name,
        documentNumber: doc.document_number,
        date: new Date(data.dueDate),
        type: "due_date",
        context: "Due Date",
      });
    }

    if (data.invoiceDate) {
      documentDates.push({
        id: `${doc.id}-invoice`,
        documentId: doc.id,
        documentName: doc.file_name,
        documentNumber: doc.document_number,
        date: new Date(data.invoiceDate),
        type: "invoice_date",
        context: "Invoice Date",
      });
    }

    if (data.expirationDate) {
      documentDates.push({
        id: `${doc.id}-expiration`,
        documentId: doc.id,
        documentName: doc.file_name,
        documentNumber: doc.document_number,
        date: new Date(data.expirationDate),
        type: "expiration",
        context: "Expiration Date",
      });
    }

    if (data.effectiveDate) {
      documentDates.push({
        id: `${doc.id}-effective`,
        documentId: doc.id,
        documentName: doc.file_name,
        documentNumber: doc.document_number,
        date: new Date(data.effectiveDate),
        type: "effective",
        context: "Effective Date",
      });
    }

    if (data.transactionDate) {
      documentDates.push({
        id: `${doc.id}-transaction`,
        documentId: doc.id,
        documentName: doc.file_name,
        documentNumber: doc.document_number,
        date: new Date(data.transactionDate),
        type: "transaction",
        context: "Transaction Date",
      });
    }

    // Additional dates array
    if (data.dates && Array.isArray(data.dates)) {
      for (const dateEntry of data.dates) {
        if (dateEntry.date) {
          documentDates.push({
            id: `${doc.id}-${dateEntry.type}-${dateEntry.date}`,
            documentId: doc.id,
            documentName: doc.file_name,
            documentNumber: doc.document_number,
            date: new Date(dateEntry.date),
            type: dateEntry.type,
            context: dateEntry.context || dateEntry.type,
          });
        }
      }
    }
  }

  // Sort by date
  documentDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Document Calendar</h1>
            <p className="text-muted-foreground">
              View important dates from your documents
            </p>
          </div>
        </div>
      </div>

      <DocumentCalendar dates={documentDates} />
    </div>
  );
}
