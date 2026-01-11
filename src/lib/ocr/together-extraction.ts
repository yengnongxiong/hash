/**
 * Together.ai Fine-Tuned Model Integration
 *
 * Uses our fine-tuned Llama 3.1 8B model for document extraction.
 * Falls back to base Llama 3.1 8B if fine-tuned model is unavailable.
 * Supports A/B testing via experiment-service integration.
 */

import { ExtractedDocumentData, DocumentType, ConfidenceLevel } from "./types";
import {
  selectModelForDocument,
  recordExperimentResult,
  type ModelType,
} from "../ml";

// Together.ai API configuration
const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

// Fine-tuned model ID (serverless LoRA on Llama 3.1 8B)
const FINE_TUNED_MODEL = process.env.TOGETHER_FINE_TUNED_MODEL;
const FALLBACK_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

interface TogetherResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Comprehensive extraction prompt matching Mistral's capabilities
const EXTRACTION_PROMPT = `You are an expert document extraction assistant. Your task is to analyze document text (from OCR) and extract structured data. Always respond with valid JSON.

First, identify the document type from these categories:
- FINANCIAL: invoice, receipt, purchase_order, bank_statement, credit_card_statement, check
- LEGAL: contract, amendment, nda, terms_of_service
- HR: w2, 1099, pay_stub, offer_letter, i9
- INSURANCE: policy_declaration, claim_form, certificate_of_insurance
- HEALTHCARE: eob, medical_bill, prescription
- REAL_ESTATE: lease, mortgage_statement, property_tax
- SHIPPING: bill_of_lading, packing_list, customs_declaration
- other (if none match)

CRITICAL: You MUST extract the ACTUAL VALUES for each field, not just confidence scores. Include BOTH the actual value AND a confidence level for each field.

For INVOICES, extract these fields with their ACTUAL VALUES:
- invoiceNumber: The invoice number/ID (e.g., "INV-3337")
- vendorName: The seller/vendor company name
- invoiceDate: Date in YYYY-MM-DD format (e.g., "2016-01-25")
- dueDate: Due date in YYYY-MM-DD format (e.g., "2016-01-31")
- totalAmount: The total amount as a number (e.g., 93.50)
- currency: Currency code (e.g., "USD", "AUD")
- paymentTerms: Payment terms text
- poNumber: Purchase order number if present
- lineItems: Array of {description, quantity, unitPrice, amount}

For RECEIPTS: merchantName, transactionDate, subtotal, tax, total, paymentMethod, lineItems
For CONTRACTS: partyA, partyB, effectiveDate, expirationDate, contractValue, contractType, terms
For W-2: employeeName, employeeSsnLast4, employerName, employerEin, taxYear, wagesTipsCompensation, federalIncomeTaxWithheld
For BANK STATEMENTS: accountNumber, bankName, statementPeriodStart, statementPeriodEnd, openingBalance, closingBalance, transactions

Return JSON with this EXACT structure (example for invoice):
{
  "documentType": "invoice",
  "documentTypeConfidence": "high",
  "invoiceNumber": "INV-3337",
  "vendorName": "ACME Corp",
  "invoiceDate": "2016-01-25",
  "dueDate": "2016-01-31",
  "totalAmount": 93.50,
  "currency": "USD",
  "lineItems": [{"description": "Web Design", "quantity": 1, "unitPrice": 85, "amount": 85}],
  "fieldConfidence": {
    "invoiceNumber": "high",
    "vendorName": "high",
    "dueDate": "high",
    "totalAmount": "high"
  }
}

IMPORTANT: The field values (invoiceNumber, vendorName, dueDate, totalAmount, etc.) MUST be included at the top level of the JSON, NOT nested inside fieldConfidence.

Focus on accuracy - it's better to leave a field empty than guess incorrectly.
PII HANDLING: For SSN, only extract the last 4 digits.`;

/**
 * Extract structured data from document text using fine-tuned model
 * Returns data in ExtractedDocumentData format for compatibility with existing system
 */
export async function extractWithFineTunedModel(
  ocrText: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ExtractedDocumentData> {
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY environment variable not set");
  }

  // Use fine-tuned model if available, otherwise fallback
  const model = FINE_TUNED_MODEL || FALLBACK_MODEL;

  const userPrompt = `${EXTRACTION_PROMPT}\n\nDocument text:\n${ocrText}`;

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together API error: ${response.status} - ${error}`);
    }

    const data: TogetherResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response content from Together API");
    }

    // Parse and normalize to ExtractedDocumentData format
    const parsed = JSON.parse(content);

    // Validate that extraction has actual values, not just confidence scores
    validateExtraction(parsed, ocrText);

    return normalizeToExtractedDocumentData(parsed);
  } catch (error) {
    console.error("Together extraction error:", error);
    // Re-throw so Mistral fallback can be triggered
    throw error;
  }
}

/**
 * Validate that the extraction contains actual field values, not just confidence scores.
 * Throws an error if the extraction appears incomplete or suspicious.
 */
function validateExtraction(parsed: Record<string, unknown>, ocrText: string): void {
  const documentType = parsed.documentType as string;
  const fieldConfidence = parsed.fieldConfidence as Record<string, unknown> | undefined;

  // Check if OCR text contains invoice-like content but extraction returned "other"
  // This catches cases where the model failed to properly classify the document
  const lowerText = ocrText.toLowerCase();
  const hasInvoiceKeywords =
    (lowerText.includes('invoice') || lowerText.includes('inv-')) &&
    (lowerText.includes('total') || lowerText.includes('amount')) &&
    (lowerText.includes('due date') || lowerText.includes('due:'));

  if (hasInvoiceKeywords && documentType === 'other') {
    console.error('Document contains invoice keywords but was classified as "other"');
    throw new Error('Document appears to be an invoice but was misclassified');
  }

  // If fieldConfidence is empty but document looks like it should have fields, fail
  if (!fieldConfidence || Object.keys(fieldConfidence).length === 0) {
    if (documentType !== 'other' || hasInvoiceKeywords) {
      console.error(`Empty fieldConfidence for documentType: ${documentType}`);
      throw new Error(`No fields extracted for document type: ${documentType}`);
    }
    return; // Allow "other" documents with no fields if text doesn't look like known types
  }

  // Check that fields mentioned in fieldConfidence have actual values
  const fieldsWithConfidence = Object.keys(fieldConfidence);
  const missingValues: string[] = [];

  for (const field of fieldsWithConfidence) {
    // Skip confidence-related meta fields
    if (field === 'documentType' || field === 'documentTypeConfidence') continue;

    // Check if the actual value exists at the top level
    const value = parsed[field];
    if (value === undefined || value === null) {
      missingValues.push(field);
    }
  }

  // If more than 50% of fields with confidence scores are missing values,
  // the extraction is incomplete and should fall back to Mistral
  if (fieldsWithConfidence.length > 0 && missingValues.length > fieldsWithConfidence.length * 0.5) {
    console.error(`Incomplete extraction: fields with confidence but no values: ${missingValues.join(', ')}`);
    throw new Error(`Incomplete extraction: ${missingValues.length}/${fieldsWithConfidence.length} fields missing values`);
  }

  // For specific document types, ensure critical fields are present
  if (documentType === 'invoice') {
    const criticalFields = ['invoiceNumber', 'vendorName', 'totalAmount'];
    const missingCritical = criticalFields.filter(f =>
      fieldConfidence[f] && (parsed[f] === undefined || parsed[f] === null)
    );
    if (missingCritical.length > 0) {
      console.error(`Invoice missing critical fields: ${missingCritical.join(', ')}`);
      throw new Error(`Invoice extraction incomplete: missing ${missingCritical.join(', ')}`);
    }
  }
}

/**
 * Normalize Together.ai response to ExtractedDocumentData format
 */
function normalizeToExtractedDocumentData(
  parsed: Record<string, unknown>
): ExtractedDocumentData {
  // Calculate overall confidence from field confidences
  const fieldConfidence = parsed.fieldConfidence as Record<string, ConfidenceLevel> | undefined;
  let overallConfidence: ConfidenceLevel = "high";

  if (fieldConfidence) {
    const confidenceValues = Object.values(fieldConfidence);
    const lowCount = confidenceValues.filter((c) => c === "low").length;
    const mediumCount = confidenceValues.filter((c) => c === "medium").length;

    if (lowCount > confidenceValues.length * 0.3) {
      overallConfidence = "low";
    } else if (mediumCount > confidenceValues.length * 0.3 || lowCount > 0) {
      overallConfidence = "medium";
    }
  }

  const hasTables =
    (Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0) ||
    (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) ||
    (Array.isArray(parsed.deductions) && parsed.deductions.length > 0);

  return {
    documentType: (parsed.documentType as DocumentType) || "other",
    documentTypeConfidence:
      (parsed.documentTypeConfidence as ConfidenceLevel) || "high",
    pageCount: 1,
    hasImages: false,
    hasTables,
    overallConfidence,
    fieldConfidence: fieldConfidence || {},

    // Invoice fields
    invoiceNumber: parsed.invoiceNumber as string | undefined,
    vendorName: parsed.vendorName as string | undefined,
    invoiceDate: parsed.invoiceDate as string | undefined,
    dueDate: parsed.dueDate as string | undefined,
    totalAmount: parsed.totalAmount as number | undefined,
    currency: (parsed.currency as string) || "USD",
    lineItems: parsed.lineItems as ExtractedDocumentData["lineItems"],
    paymentTerms: parsed.paymentTerms as string | undefined,
    poNumber: parsed.poNumber as string | undefined,

    // Receipt fields
    merchantName: parsed.merchantName as string | undefined,
    transactionDate: parsed.transactionDate as string | undefined,
    subtotal: parsed.subtotal as number | undefined,
    tax: parsed.tax as number | undefined,
    total: parsed.total as number | undefined,
    paymentMethod: parsed.paymentMethod as string | undefined,

    // Purchase Order fields
    poDate: parsed.poDate as string | undefined,
    deliveryDate: parsed.deliveryDate as string | undefined,
    shippingAddress: parsed.shippingAddress as ExtractedDocumentData["shippingAddress"],
    billingAddress: parsed.billingAddress as ExtractedDocumentData["billingAddress"],

    // Bank Statement fields
    accountNumber: parsed.accountNumber as string | undefined,
    bankName: parsed.bankName as string | undefined,
    statementPeriodStart: parsed.statementPeriodStart as string | undefined,
    statementPeriodEnd: parsed.statementPeriodEnd as string | undefined,
    openingBalance: parsed.openingBalance as number | undefined,
    closingBalance: parsed.closingBalance as number | undefined,
    transactions: parsed.transactions as ExtractedDocumentData["transactions"],

    // Credit Card Statement fields
    cardholderName: parsed.cardholderName as string | undefined,
    statementDate: parsed.statementDate as string | undefined,
    creditLimit: parsed.creditLimit as number | undefined,
    currentBalance: parsed.currentBalance as number | undefined,
    minimumPayment: parsed.minimumPayment as number | undefined,

    // Check fields
    checkNumber: parsed.checkNumber as string | undefined,
    checkDate: parsed.checkDate as string | undefined,
    amount: parsed.amount as number | undefined,
    payee: parsed.payee as string | undefined,
    payer: parsed.payer as string | undefined,
    memo: parsed.memo as string | undefined,
    routingNumber: parsed.routingNumber as string | undefined,

    // Contract fields
    partyA: parsed.partyA as string | undefined,
    partyB: parsed.partyB as string | undefined,
    effectiveDate: parsed.effectiveDate as string | undefined,
    expirationDate: parsed.expirationDate as string | undefined,
    contractValue: parsed.contractValue as number | undefined,
    contractType: parsed.contractType as string | undefined,
    terms: parsed.terms as string | undefined,

    // Amendment fields
    originalContractRef: parsed.originalContractRef as string | undefined,
    amendmentDate: parsed.amendmentDate as string | undefined,
    changes: parsed.changes as string | undefined,

    // NDA fields
    term: parsed.term as string | undefined,
    scope: parsed.scope as string | undefined,
    jurisdiction: parsed.jurisdiction as string | undefined,

    // Terms of Service fields
    version: parsed.version as string | undefined,
    companyName: parsed.companyName as string | undefined,
    keyTerms: parsed.keyTerms as string[] | undefined,

    // W-2 fields
    employeeName: parsed.employeeName as string | undefined,
    employeeSsnLast4: parsed.employeeSsnLast4 as string | undefined,
    employerName: parsed.employerName as string | undefined,
    employerEin: parsed.employerEin as string | undefined,
    taxYear: parsed.taxYear as number | undefined,
    wagesTipsCompensation: parsed.wagesTipsCompensation as number | undefined,
    federalIncomeTaxWithheld: parsed.federalIncomeTaxWithheld as number | undefined,
    socialSecurityWages: parsed.socialSecurityWages as number | undefined,
    socialSecurityTaxWithheld: parsed.socialSecurityTaxWithheld as number | undefined,
    medicareWages: parsed.medicareWages as number | undefined,
    medicareTaxWithheld: parsed.medicareTaxWithheld as number | undefined,
    state: parsed.state as string | undefined,
    stateWages: parsed.stateWages as number | undefined,
    stateIncomeTax: parsed.stateIncomeTax as number | undefined,

    // 1099 fields
    recipientName: parsed.recipientName as string | undefined,
    payerName: parsed.payerName as string | undefined,
    recipientTin: parsed.recipientTin as string | undefined,
    payerTin: parsed.payerTin as string | undefined,
    form1099Type: parsed.form1099Type as string | undefined,

    // Pay Stub fields
    payPeriodStart: parsed.payPeriodStart as string | undefined,
    payPeriodEnd: parsed.payPeriodEnd as string | undefined,
    payDate: parsed.payDate as string | undefined,
    grossPay: parsed.grossPay as number | undefined,
    netPay: parsed.netPay as number | undefined,
    deductions: parsed.deductions as ExtractedDocumentData["deductions"],
    ytdGross: parsed.ytdGross as number | undefined,
    ytdNet: parsed.ytdNet as number | undefined,

    // Offer Letter fields
    candidateName: parsed.candidateName as string | undefined,
    position: parsed.position as string | undefined,
    salary: parsed.salary as number | undefined,
    startDate: parsed.startDate as string | undefined,
    benefits: parsed.benefits as string | undefined,
    supervisorName: parsed.supervisorName as string | undefined,

    // I-9 fields
    citizenshipStatus: parsed.citizenshipStatus as string | undefined,
    documentNumbers: parsed.documentNumbers as string[] | undefined,
    documentExpirationDates: parsed.documentExpirationDates as string[] | undefined,
    listADocument: parsed.listADocument as string | undefined,
    listBDocument: parsed.listBDocument as string | undefined,
    listCDocument: parsed.listCDocument as string | undefined,

    // Insurance fields
    policyNumber: parsed.policyNumber as string | undefined,
    insured: parsed.insured as string | undefined,
    insurer: parsed.insurer as string | undefined,
    coverageType: parsed.coverageType as string | undefined,
    coverageLimits: parsed.coverageLimits as number | undefined,
    premium: parsed.premium as number | undefined,
    policyPeriodStart: parsed.policyPeriodStart as string | undefined,
    policyPeriodEnd: parsed.policyPeriodEnd as string | undefined,
    claimNumber: parsed.claimNumber as string | undefined,
    dateOfLoss: parsed.dateOfLoss as string | undefined,
    claimDescription: parsed.claimDescription as string | undefined,
    amountClaimed: parsed.amountClaimed as number | undefined,
    claimant: parsed.claimant as string | undefined,
    certificateHolder: parsed.certificateHolder as string | undefined,
    coverageTypes: parsed.coverageTypes as string[] | undefined,
    additionalInsured: parsed.additionalInsured as string | undefined,

    // Healthcare fields
    patientName: parsed.patientName as string | undefined,
    providerName: parsed.providerName as string | undefined,
    serviceDate: parsed.serviceDate as string | undefined,
    billedAmount: parsed.billedAmount as number | undefined,
    allowedAmount: parsed.allowedAmount as number | undefined,
    patientResponsibility: parsed.patientResponsibility as number | undefined,
    insurancePaid: parsed.insurancePaid as number | undefined,
    claimStatus: parsed.claimStatus as string | undefined,
    diagnosisCodes: parsed.diagnosisCodes as string[] | undefined,
    procedureCodes: parsed.procedureCodes as string[] | undefined,
    facilityName: parsed.facilityName as string | undefined,
    admissionDate: parsed.admissionDate as string | undefined,
    dischargeDate: parsed.dischargeDate as string | undefined,
    charges: parsed.charges as number | undefined,
    prescriber: parsed.prescriber as string | undefined,
    medication: parsed.medication as string | undefined,
    dosage: parsed.dosage as string | undefined,
    quantity: parsed.quantity as number | undefined,
    refills: parsed.refills as number | undefined,
    pharmacyName: parsed.pharmacyName as string | undefined,
    rxNumber: parsed.rxNumber as string | undefined,
    dispensedDate: parsed.dispensedDate as string | undefined,

    // Real Estate fields
    landlord: parsed.landlord as string | undefined,
    tenant: parsed.tenant as string | undefined,
    propertyAddress: parsed.propertyAddress as ExtractedDocumentData["propertyAddress"],
    leaseTermStart: parsed.leaseTermStart as string | undefined,
    leaseTermEnd: parsed.leaseTermEnd as string | undefined,
    monthlyRent: parsed.monthlyRent as number | undefined,
    securityDeposit: parsed.securityDeposit as number | undefined,
    loanNumber: parsed.loanNumber as string | undefined,
    propertyValue: parsed.propertyValue as number | undefined,
    principalBalance: parsed.principalBalance as number | undefined,
    interestRate: parsed.interestRate as number | undefined,
    escrowBalance: parsed.escrowBalance as number | undefined,
    nextPaymentDue: parsed.nextPaymentDue as string | undefined,
    nextPaymentAmount: parsed.nextPaymentAmount as number | undefined,
    assessedValue: parsed.assessedValue as number | undefined,
    taxAmount: parsed.taxAmount as number | undefined,
    taxYear2: parsed.taxYear2 as number | undefined,
    parcelNumber: parsed.parcelNumber as string | undefined,
    taxingAuthority: parsed.taxingAuthority as string | undefined,

    // Shipping fields
    shipper: parsed.shipper as string | undefined,
    consignee: parsed.consignee as string | undefined,
    carrier: parsed.carrier as string | undefined,
    origin: parsed.origin as ExtractedDocumentData["origin"],
    destination: parsed.destination as ExtractedDocumentData["destination"],
    weight: parsed.weight as number | undefined,
    bolNumber: parsed.bolNumber as string | undefined,
    shipDate: parsed.shipDate as string | undefined,
    orderNumber: parsed.orderNumber as string | undefined,
    items: parsed.items as ExtractedDocumentData["items"],
    packageCount: parsed.packageCount as number | undefined,
    totalWeight: parsed.totalWeight as number | undefined,
    declaredValue: parsed.declaredValue as number | undefined,
    countryOfOrigin: parsed.countryOfOrigin as string | undefined,
    hsCodes: parsed.hsCodes as string[] | undefined,
    importerName: parsed.importerName as string | undefined,
    exporterName: parsed.exporterName as string | undefined,
    customsEntryNumber: parsed.customsEntryNumber as string | undefined,

    // General fields
    dates: parsed.dates as ExtractedDocumentData["dates"],
    amounts: parsed.amounts as ExtractedDocumentData["amounts"],
  };
}

/**
 * Check if Together.ai is configured and available
 */
export function isTogetherConfigured(): boolean {
  return !!process.env.TOGETHER_API_KEY;
}

/**
 * Get the current model being used
 */
export function getCurrentModel(): string {
  return FINE_TUNED_MODEL || FALLBACK_MODEL;
}

/**
 * Check if using fine-tuned model vs fallback
 */
export function isUsingFineTunedModel(): boolean {
  return !!FINE_TUNED_MODEL;
}

/**
 * Extract with A/B testing support
 *
 * This function:
 * 1. Checks for running experiments
 * 2. Selects control or treatment model based on traffic allocation
 * 3. Performs extraction with the selected model
 * 4. Records the result for experiment tracking
 *
 * @param ocrText - The raw text from OCR
 * @param documentId - The document ID (for result tracking)
 * @param options - Extraction options
 * @returns Extracted data with experiment metadata
 */
export async function extractWithExperiment(
  ocrText: string,
  documentId: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{
  data: ExtractedDocumentData;
  experimentId?: string;
  modelVersionId?: string;
  isControl?: boolean;
}> {
  const startTime = Date.now();

  // Select model for this document (handles A/B testing)
  const modelSelection = await selectModelForDocument("document_extraction" as ModelType);

  let model = FINE_TUNED_MODEL || FALLBACK_MODEL;
  let experimentId: string | undefined;
  let modelVersionId: string | undefined;
  let isControl: boolean | undefined;

  if (modelSelection.success && modelSelection.modelVersion) {
    // Use the model from A/B testing selection
    model = modelSelection.modelVersion.modelId || model;
    experimentId = modelSelection.experimentId;
    modelVersionId = modelSelection.modelVersion.id;
    isControl = modelSelection.isControl;
  }

  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY environment variable not set");
  }

  const userPrompt = `${EXTRACTION_PROMPT}\n\nDocument text:\n${ocrText}`;

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together API error: ${response.status} - ${error}`);
    }

    const data: TogetherResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response content from Together API");
    }

    const parsed = JSON.parse(content);
    validateExtraction(parsed, ocrText);
    const extractedData = normalizeToExtractedDocumentData(parsed);

    const processingTimeMs = Date.now() - startTime;

    // Record experiment result if in an experiment
    if (experimentId && modelVersionId && isControl !== undefined) {
      // Calculate overall confidence as a number
      const confidenceScore = extractedData.overallConfidence === "high" ? 0.9 :
        extractedData.overallConfidence === "medium" ? 0.7 : 0.5;

      await recordExperimentResult(
        experimentId,
        documentId,
        modelVersionId,
        isControl,
        confidenceScore,
        processingTimeMs
      );
    }

    return {
      data: extractedData,
      experimentId,
      modelVersionId,
      isControl,
    };
  } catch (error) {
    console.error("Together extraction error:", error);
    throw error;
  }
}
