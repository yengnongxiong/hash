"use client";

import { useState, useTransition } from "react";
import { Save, X, Edit2, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateDocumentExtractedData } from "@/app/(dashboard)/documents/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database";

type ConfidenceLevel = "high" | "medium" | "low";

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
  confidence?: ConfidenceLevel;
  onSave: (field: string, value: string | number | null) => Promise<void>;
}

// Confidence indicator component
function ConfidenceIndicator({ confidence }: { confidence?: ConfidenceLevel }) {
  if (!confidence) return null;

  const config = {
    high: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      color: "text-green-500",
      label: "High confidence",
      description: "This value was clearly identified",
    },
    medium: {
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      color: "text-yellow-500",
      label: "Medium confidence",
      description: "This value may need verification",
    },
    low: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      color: "text-red-500",
      label: "Low confidence",
      description: "This value requires review",
    },
  };

  const { icon, color, label, description } = config[confidence];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help", color)}>{icon}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EditableField({
  label,
  value,
  field,
  type = "text",
  confidence,
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

  // Determine border color based on confidence
  const borderClass = confidence === "low"
    ? "border-l-2 border-l-red-400 pl-2"
    : confidence === "medium"
    ? "border-l-2 border-l-yellow-400 pl-2"
    : "";

  return (
    <div
      className={cn(
        "group cursor-pointer hover:bg-muted/50 rounded p-2 -m-2",
        borderClass
      )}
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">{label}</label>
            <ConfidenceIndicator confidence={confidence} />
          </div>
          <p className="text-sm font-medium truncate">
            {value !== null && value !== undefined ? (
              String(value)
            ) : (
              <span className="text-muted-foreground italic">Not detected</span>
            )}
          </p>
        </div>
        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
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
  const fieldConfidence = (data.fieldConfidence as Record<string, ConfidenceLevel>) || {};
  const overallConfidence = data.overallConfidence as ConfidenceLevel | undefined;

  // Helper to get confidence for a field
  const getConfidence = (field: string): ConfidenceLevel | undefined => {
    return fieldConfidence[field];
  };

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
    purchase_order: "Purchase Order",
    bank_statement: "Bank Statement",
    credit_card_statement: "Credit Card Statement",
    check: "Check",
    amendment: "Amendment",
    nda: "NDA",
    terms_of_service: "Terms of Service",
    w2: "W-2",
    "1099": "1099",
    pay_stub: "Pay Stub",
    other: "Other",
  }[documentType || "other"] || "Other";

  // Count confidence levels
  const confidenceCounts = Object.values(fieldConfidence).reduce(
    (acc, conf) => {
      acc[conf] = (acc[conf] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={isPending ? "opacity-70" : ""}>
      <Tabs defaultValue="structured" className="h-full">
        <TabsList className="mb-4">
          <TabsTrigger value="structured">Extracted Data</TabsTrigger>
          <TabsTrigger value="raw">Raw Text</TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="space-y-4">
          {/* Document Type Badge with Confidence Summary */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Document Type:</span>
              <Badge variant="outline">{documentTypeLabel}</Badge>
            </div>
            {Object.keys(fieldConfidence).length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-l pl-3">
                <span>Extraction Quality:</span>
                {confidenceCounts.high && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    {confidenceCounts.high} high
                  </Badge>
                )}
                {confidenceCounts.medium && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                    {confidenceCounts.medium} needs review
                  </Badge>
                )}
                {confidenceCounts.low && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                    {confidenceCounts.low} low
                  </Badge>
                )}
              </div>
            )}
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
                  confidence={getConfidence("invoiceNumber")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Vendor Name"
                  value={data.vendorName as string}
                  field="vendorName"
                  confidence={getConfidence("vendorName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Invoice Date"
                  value={data.invoiceDate as string}
                  field="invoiceDate"
                  type="date"
                  confidence={getConfidence("invoiceDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Due Date"
                  value={data.dueDate as string}
                  field="dueDate"
                  type="date"
                  confidence={getConfidence("dueDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Total Amount"
                  value={data.totalAmount as number}
                  field="totalAmount"
                  type="number"
                  confidence={getConfidence("totalAmount")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Currency"
                  value={data.currency as string}
                  field="currency"
                  confidence={getConfidence("currency")}
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
                  confidence={getConfidence("merchantName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Transaction Date"
                  value={data.transactionDate as string}
                  field="transactionDate"
                  type="date"
                  confidence={getConfidence("transactionDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Subtotal"
                  value={data.subtotal as number}
                  field="subtotal"
                  type="number"
                  confidence={getConfidence("subtotal")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Tax"
                  value={data.tax as number}
                  field="tax"
                  type="number"
                  confidence={getConfidence("tax")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Total"
                  value={data.total as number}
                  field="total"
                  type="number"
                  confidence={getConfidence("total")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Payment Method"
                  value={data.paymentMethod as string}
                  field="paymentMethod"
                  confidence={getConfidence("paymentMethod")}
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
                  confidence={getConfidence("partyA")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Party B"
                  value={data.partyB as string}
                  field="partyB"
                  confidence={getConfidence("partyB")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Effective Date"
                  value={data.effectiveDate as string}
                  field="effectiveDate"
                  type="date"
                  confidence={getConfidence("effectiveDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Expiration Date"
                  value={data.expirationDate as string}
                  field="expirationDate"
                  type="date"
                  confidence={getConfidence("expirationDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Contract Value"
                  value={data.contractValue as number}
                  field="contractValue"
                  type="number"
                  confidence={getConfidence("contractValue")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Contract Type"
                  value={data.contractType as string}
                  field="contractType"
                  confidence={getConfidence("contractType")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Purchase Order Fields */}
          {documentType === "purchase_order" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Purchase Order Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="PO Number"
                  value={data.poNumber as string}
                  field="poNumber"
                  confidence={getConfidence("poNumber")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Vendor Name"
                  value={data.vendorName as string}
                  field="vendorName"
                  confidence={getConfidence("vendorName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="PO Date"
                  value={data.poDate as string}
                  field="poDate"
                  type="date"
                  confidence={getConfidence("poDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Delivery Date"
                  value={data.deliveryDate as string}
                  field="deliveryDate"
                  type="date"
                  confidence={getConfidence("deliveryDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Total Amount"
                  value={data.totalAmount as number}
                  field="totalAmount"
                  type="number"
                  confidence={getConfidence("totalAmount")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Currency"
                  value={data.currency as string}
                  field="currency"
                  confidence={getConfidence("currency")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Bank Statement Fields */}
          {documentType === "bank_statement" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Bank Statement Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Account Number"
                  value={data.accountNumber as string}
                  field="accountNumber"
                  confidence={getConfidence("accountNumber")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Bank Name"
                  value={data.bankName as string}
                  field="bankName"
                  confidence={getConfidence("bankName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Statement Period Start"
                  value={data.statementPeriodStart as string}
                  field="statementPeriodStart"
                  type="date"
                  confidence={getConfidence("statementPeriodStart")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Statement Period End"
                  value={data.statementPeriodEnd as string}
                  field="statementPeriodEnd"
                  type="date"
                  confidence={getConfidence("statementPeriodEnd")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Opening Balance"
                  value={data.openingBalance as number}
                  field="openingBalance"
                  type="number"
                  confidence={getConfidence("openingBalance")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Closing Balance"
                  value={data.closingBalance as number}
                  field="closingBalance"
                  type="number"
                  confidence={getConfidence("closingBalance")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Credit Card Statement Fields */}
          {documentType === "credit_card_statement" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Credit Card Statement Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Account Number"
                  value={data.accountNumber as string}
                  field="accountNumber"
                  confidence={getConfidence("accountNumber")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Cardholder Name"
                  value={data.cardholderName as string}
                  field="cardholderName"
                  confidence={getConfidence("cardholderName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Statement Date"
                  value={data.statementDate as string}
                  field="statementDate"
                  type="date"
                  confidence={getConfidence("statementDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Due Date"
                  value={data.dueDate as string}
                  field="dueDate"
                  type="date"
                  confidence={getConfidence("dueDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Credit Limit"
                  value={data.creditLimit as number}
                  field="creditLimit"
                  type="number"
                  confidence={getConfidence("creditLimit")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Current Balance"
                  value={data.currentBalance as number}
                  field="currentBalance"
                  type="number"
                  confidence={getConfidence("currentBalance")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Minimum Payment"
                  value={data.minimumPayment as number}
                  field="minimumPayment"
                  type="number"
                  confidence={getConfidence("minimumPayment")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Check Fields */}
          {documentType === "check" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Check Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Check Number"
                  value={data.checkNumber as string}
                  field="checkNumber"
                  confidence={getConfidence("checkNumber")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Check Date"
                  value={data.checkDate as string}
                  field="checkDate"
                  type="date"
                  confidence={getConfidence("checkDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Amount"
                  value={data.amount as number}
                  field="amount"
                  type="number"
                  confidence={getConfidence("amount")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Payee"
                  value={data.payee as string}
                  field="payee"
                  confidence={getConfidence("payee")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Payer"
                  value={data.payer as string}
                  field="payer"
                  confidence={getConfidence("payer")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Memo"
                  value={data.memo as string}
                  field="memo"
                  confidence={getConfidence("memo")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Amendment Fields */}
          {documentType === "amendment" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Amendment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Original Contract Ref"
                  value={data.originalContractRef as string}
                  field="originalContractRef"
                  confidence={getConfidence("originalContractRef")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Amendment Date"
                  value={data.amendmentDate as string}
                  field="amendmentDate"
                  type="date"
                  confidence={getConfidence("amendmentDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Party A"
                  value={data.partyA as string}
                  field="partyA"
                  confidence={getConfidence("partyA")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Party B"
                  value={data.partyB as string}
                  field="partyB"
                  confidence={getConfidence("partyB")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Changes"
                  value={data.changes as string}
                  field="changes"
                  confidence={getConfidence("changes")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* NDA Fields */}
          {documentType === "nda" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">NDA Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Party A"
                  value={data.partyA as string}
                  field="partyA"
                  confidence={getConfidence("partyA")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Party B"
                  value={data.partyB as string}
                  field="partyB"
                  confidence={getConfidence("partyB")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Effective Date"
                  value={data.effectiveDate as string}
                  field="effectiveDate"
                  type="date"
                  confidence={getConfidence("effectiveDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Expiration Date"
                  value={data.expirationDate as string}
                  field="expirationDate"
                  type="date"
                  confidence={getConfidence("expirationDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Term"
                  value={data.term as string}
                  field="term"
                  confidence={getConfidence("term")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Scope"
                  value={data.scope as string}
                  field="scope"
                  confidence={getConfidence("scope")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Jurisdiction"
                  value={data.jurisdiction as string}
                  field="jurisdiction"
                  confidence={getConfidence("jurisdiction")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Terms of Service Fields */}
          {documentType === "terms_of_service" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Terms of Service Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Effective Date"
                  value={data.effectiveDate as string}
                  field="effectiveDate"
                  type="date"
                  confidence={getConfidence("effectiveDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Version"
                  value={data.version as string}
                  field="version"
                  confidence={getConfidence("version")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Company Name"
                  value={data.companyName as string}
                  field="companyName"
                  confidence={getConfidence("companyName")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* W-2 Fields */}
          {documentType === "w2" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">W-2 Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Employee Name"
                  value={data.employeeName as string}
                  field="employeeName"
                  confidence={getConfidence("employeeName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="SSN (Last 4)"
                  value={data.employeeSsnLast4 as string}
                  field="employeeSsnLast4"
                  confidence={getConfidence("employeeSsnLast4")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Employer Name"
                  value={data.employerName as string}
                  field="employerName"
                  confidence={getConfidence("employerName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Employer EIN"
                  value={data.employerEin as string}
                  field="employerEin"
                  confidence={getConfidence("employerEin")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Tax Year"
                  value={data.taxYear as number}
                  field="taxYear"
                  type="number"
                  confidence={getConfidence("taxYear")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Wages, Tips, Compensation"
                  value={data.wagesTipsCompensation as number}
                  field="wagesTipsCompensation"
                  type="number"
                  confidence={getConfidence("wagesTipsCompensation")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Federal Income Tax Withheld"
                  value={data.federalIncomeTaxWithheld as number}
                  field="federalIncomeTaxWithheld"
                  type="number"
                  confidence={getConfidence("federalIncomeTaxWithheld")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Social Security Wages"
                  value={data.socialSecurityWages as number}
                  field="socialSecurityWages"
                  type="number"
                  confidence={getConfidence("socialSecurityWages")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Social Security Tax Withheld"
                  value={data.socialSecurityTaxWithheld as number}
                  field="socialSecurityTaxWithheld"
                  type="number"
                  confidence={getConfidence("socialSecurityTaxWithheld")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Medicare Wages"
                  value={data.medicareWages as number}
                  field="medicareWages"
                  type="number"
                  confidence={getConfidence("medicareWages")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Medicare Tax Withheld"
                  value={data.medicareTaxWithheld as number}
                  field="medicareTaxWithheld"
                  type="number"
                  confidence={getConfidence("medicareTaxWithheld")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* 1099 Fields */}
          {documentType === "1099" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">1099 Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Recipient Name"
                  value={data.recipientName as string}
                  field="recipientName"
                  confidence={getConfidence("recipientName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Payer Name"
                  value={data.payerName as string}
                  field="payerName"
                  confidence={getConfidence("payerName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Tax Year"
                  value={data.taxYear as number}
                  field="taxYear"
                  type="number"
                  confidence={getConfidence("taxYear")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Amount"
                  value={data.amount as number}
                  field="amount"
                  type="number"
                  confidence={getConfidence("amount")}
                  onSave={handleSave}
                />
                <EditableField
                  label="1099 Type"
                  value={data.form1099Type as string}
                  field="form1099Type"
                  confidence={getConfidence("form1099Type")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Pay Stub Fields */}
          {documentType === "pay_stub" && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Pay Stub Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <EditableField
                  label="Employee Name"
                  value={data.employeeName as string}
                  field="employeeName"
                  confidence={getConfidence("employeeName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Employer Name"
                  value={data.employerName as string}
                  field="employerName"
                  confidence={getConfidence("employerName")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Pay Period Start"
                  value={data.payPeriodStart as string}
                  field="payPeriodStart"
                  type="date"
                  confidence={getConfidence("payPeriodStart")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Pay Period End"
                  value={data.payPeriodEnd as string}
                  field="payPeriodEnd"
                  type="date"
                  confidence={getConfidence("payPeriodEnd")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Pay Date"
                  value={data.payDate as string}
                  field="payDate"
                  type="date"
                  confidence={getConfidence("payDate")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Gross Pay"
                  value={data.grossPay as number}
                  field="grossPay"
                  type="number"
                  confidence={getConfidence("grossPay")}
                  onSave={handleSave}
                />
                <EditableField
                  label="Net Pay"
                  value={data.netPay as number}
                  field="netPay"
                  type="number"
                  confidence={getConfidence("netPay")}
                  onSave={handleSave}
                />
                <EditableField
                  label="YTD Gross"
                  value={data.ytdGross as number}
                  field="ytdGross"
                  type="number"
                  confidence={getConfidence("ytdGross")}
                  onSave={handleSave}
                />
                <EditableField
                  label="YTD Net"
                  value={data.ytdNet as number}
                  field="ytdNet"
                  type="number"
                  confidence={getConfidence("ytdNet")}
                  onSave={handleSave}
                />
              </CardContent>
            </Card>
          )}

          {/* Line Items (for invoices, receipts, purchase orders) */}
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
