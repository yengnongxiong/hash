"use client";

import { useState, useTransition } from "react";
import { Save, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateDocumentExtractedData } from "@/app/(dashboard)/documents/[id]/actions";
import { toast } from "sonner";
import type { Json } from "@/types/database";

interface ExtractedDataViewProps {
  documentId: string;
  documentType: string | null;
  rawText: string | null;
  extractedData: Json;
}

interface EditableFieldProps {
  label: string;
  value: string | number | null | undefined;
  field: string;
  type?: "text" | "number" | "date";
  onSave: (field: string, value: string | number | null) => Promise<void>;
}

function EditableField({
  label,
  value,
  field,
  type = "text",
  onSave,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalValue =
        type === "number" && editValue
          ? parseFloat(editValue)
          : editValue || null;
      await onSave(field, finalValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value ?? ""));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">{label}</label>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            type={type === "number" ? "number" : type === "date" ? "date" : "text"}
            className="h-8 mt-1"
            autoFocus
          />
        </div>
        <div className="flex gap-1 pt-5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer hover:bg-muted/50 rounded p-2 -m-2"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-start justify-between">
        <div>
          <label className="text-xs text-muted-foreground">{label}</label>
          <p className="text-sm font-medium">
            {value !== null && value !== undefined ? (
              String(value)
            ) : (
              <span className="text-muted-foreground italic">Not detected</span>
            )}
          </p>
        </div>
        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
      </div>
    </div>
  );
}

export function ExtractedDataView({
  documentId,
  documentType,
  rawText,
  extractedData,
}: ExtractedDataViewProps) {
  const [isPending, startTransition] = useTransition();
  const data = extractedData as Record<string, unknown>;

  const handleSave = async (field: string, value: string | number | null) => {
    startTransition(async () => {
      const result = await updateDocumentExtractedData(documentId, field, value);
      if (result.error) {
        toast.error("Failed to update", { description: result.error });
      } else {
        toast.success("Field updated");
      }
    });
  };

  const documentTypeLabel = {
    invoice: "Invoice",
    receipt: "Receipt",
    contract: "Contract",
    other: "Other",
  }[documentType || "other"];

  return (
    <div className={isPending ? "opacity-70" : ""}>
      <Tabs defaultValue="structured" className="h-full">
        <TabsList className="mb-4">
          <TabsTrigger value="structured">Extracted Data</TabsTrigger>
          <TabsTrigger value="raw">Raw Text</TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="space-y-4">
          {/* Document Type Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Document Type:</span>
            <Badge variant="outline">{documentTypeLabel}</Badge>
          </div>

          {/* Invoice Fields */}
          {(documentType === "invoice" || !documentType) && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Invoice Number"
                  value={data.invoiceNumber as string}
                  field="invoiceNumber"
                  onSave={handleSave}
                />
                <EditableField
                  label="Vendor Name"
                  value={data.vendorName as string}
                  field="vendorName"
                  onSave={handleSave}
                />
                <EditableField
                  label="Invoice Date"
                  value={data.invoiceDate as string}
                  field="invoiceDate"
                  type="date"
                  onSave={handleSave}
                />
                <EditableField
                  label="Due Date"
                  value={data.dueDate as string}
                  field="dueDate"
                  type="date"
                  onSave={handleSave}
                />
                <EditableField
                  label="Total Amount"
                  value={data.totalAmount as number}
                  field="totalAmount"
                  type="number"
                  onSave={handleSave}
                />
                <EditableField
                  label="Currency"
                  value={data.currency as string}
                  field="currency"
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Receipt Fields */}
          {documentType === "receipt" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Receipt Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Merchant Name"
                  value={data.merchantName as string}
                  field="merchantName"
                  onSave={handleSave}
                />
                <EditableField
                  label="Transaction Date"
                  value={data.transactionDate as string}
                  field="transactionDate"
                  type="date"
                  onSave={handleSave}
                />
                <EditableField
                  label="Subtotal"
                  value={data.subtotal as number}
                  field="subtotal"
                  type="number"
                  onSave={handleSave}
                />
                <EditableField
                  label="Tax"
                  value={data.tax as number}
                  field="tax"
                  type="number"
                  onSave={handleSave}
                />
                <EditableField
                  label="Total"
                  value={data.total as number}
                  field="total"
                  type="number"
                  onSave={handleSave}
                />
                <EditableField
                  label="Payment Method"
                  value={data.paymentMethod as string}
                  field="paymentMethod"
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Contract Fields */}
          {documentType === "contract" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Contract Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Party A"
                  value={data.partyA as string}
                  field="partyA"
                  onSave={handleSave}
                />
                <EditableField
                  label="Party B"
                  value={data.partyB as string}
                  field="partyB"
                  onSave={handleSave}
                />
                <EditableField
                  label="Effective Date"
                  value={data.effectiveDate as string}
                  field="effectiveDate"
                  type="date"
                  onSave={handleSave}
                />
                <EditableField
                  label="Expiration Date"
                  value={data.expirationDate as string}
                  field="expirationDate"
                  type="date"
                  onSave={handleSave}
                />
                <EditableField
                  label="Contract Value"
                  value={data.contractValue as number}
                  field="contractValue"
                  type="number"
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Line Items (for invoices) */}
          {Array.isArray(data.lineItems) && data.lineItems.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Qty</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(data.lineItems as Array<{
                        description?: string;
                        quantity?: number;
                        unitPrice?: number;
                        amount?: number;
                      }>).map((item, i) => (
                        <tr key={i}>
                          <td className="p-2">{item.description || "-"}</td>
                          <td className="p-2 text-right">{item.quantity ?? "-"}</td>
                          <td className="p-2 text-right">
                            {item.unitPrice != null ? `$${item.unitPrice.toFixed(2)}` : "-"}
                          </td>
                          <td className="p-2 text-right">
                            {item.amount != null ? `$${item.amount.toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Raw Extracted Text</CardTitle>
            </CardHeader>
            <CardContent>
              {rawText ? (
                <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg max-h-[500px] overflow-auto">
                  {rawText}
                </pre>
              ) : (
                <p className="text-muted-foreground italic">
                  No text extracted from this document
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
