import { createClient } from "@/lib/supabase/server";
import { DatesView } from "@/components/dates/dates-view";

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

interface DateEntry {
  id: string;
  type: "appointment" | "document";
  title: string;
  date: Date;
  endDate?: Date;
  category: string;
  entityId: string;
  entityName?: string;
  status?: string;
  location?: string;
}

export default async function DatesPage() {
  const supabase = await createClient();

  // Fetch appointments
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*, customers(name, company)")
    .order("start_time", { ascending: true });

  // Fetch customers for creating new appointments
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, company")
    .order("name");

  // Fetch documents with dates
  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, file_name, document_number, extracted_data, document_type")
    .eq("status", "completed")
    .not("extracted_data", "is", null);

  if (appointmentsError) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          Error loading dates: {appointmentsError.message}
        </p>
      </div>
    );
  }

  // Combine all dates
  const allDates: DateEntry[] = [];

  // Add appointments
  for (const apt of appointments || []) {
    allDates.push({
      id: apt.id,
      type: "appointment",
      title: apt.title,
      date: new Date(apt.start_time),
      endDate: apt.end_time ? new Date(apt.end_time) : undefined,
      category: "appointment",
      entityId: apt.id,
      entityName: apt.customers?.name || undefined,
      status: apt.status,
      location: apt.location || undefined,
    });
  }

  // Add document dates
  for (const doc of documents || []) {
    const data = doc.extracted_data as ExtractedData | null;
    if (!data) continue;

    if (data.dueDate) {
      allDates.push({
        id: `${doc.id}-due`,
        type: "document",
        title: doc.file_name,
        date: new Date(data.dueDate),
        category: "due_date",
        entityId: doc.id,
        entityName: doc.document_number || undefined,
      });
    }

    if (data.invoiceDate) {
      allDates.push({
        id: `${doc.id}-invoice`,
        type: "document",
        title: doc.file_name,
        date: new Date(data.invoiceDate),
        category: "invoice_date",
        entityId: doc.id,
        entityName: doc.document_number || undefined,
      });
    }

    if (data.expirationDate) {
      allDates.push({
        id: `${doc.id}-expiration`,
        type: "document",
        title: doc.file_name,
        date: new Date(data.expirationDate),
        category: "expiration",
        entityId: doc.id,
        entityName: doc.document_number || undefined,
      });
    }

    if (data.effectiveDate) {
      allDates.push({
        id: `${doc.id}-effective`,
        type: "document",
        title: doc.file_name,
        date: new Date(data.effectiveDate),
        category: "effective",
        entityId: doc.id,
        entityName: doc.document_number || undefined,
      });
    }

    if (data.transactionDate) {
      allDates.push({
        id: `${doc.id}-transaction`,
        type: "document",
        title: doc.file_name,
        date: new Date(data.transactionDate),
        category: "transaction",
        entityId: doc.id,
        entityName: doc.document_number || undefined,
      });
    }

    // Additional dates array
    if (data.dates && Array.isArray(data.dates)) {
      for (const dateEntry of data.dates) {
        if (dateEntry.date) {
          allDates.push({
            id: `${doc.id}-${dateEntry.type}-${dateEntry.date}`,
            type: "document",
            title: doc.file_name,
            date: new Date(dateEntry.date),
            category: dateEntry.type || "other",
            entityId: doc.id,
            entityName: dateEntry.context || doc.document_number || undefined,
          });
        }
      }
    }
  }

  // Sort by date
  allDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dates</h1>
        <p className="text-muted-foreground">
          View appointments and important document dates in one place.
        </p>
      </div>

      <DatesView
        dates={allDates}
        appointments={appointments || []}
        customers={customers || []}
      />
    </div>
  );
}
