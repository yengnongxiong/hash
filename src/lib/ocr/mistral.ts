import {
  OCRProvider,
  OCRResult,
  OCRPage,
  OCRProcessOptions,
  ExtractedDocumentData,
  DocumentType,
  ConfidenceLevel,
} from "./types";
import {
  extractWithFineTunedModel,
  extractWithExperiment,
  isTogetherConfigured,
} from "./together-extraction";

const EXTRACTION_PROMPT = `You are an expert document analyst. Analyze this document and extract structured information with confidence scores.

First, identify the document type from these categories:
- FINANCIAL: invoice, receipt, purchase_order, bank_statement, credit_card_statement, check
- LEGAL: contract, amendment, nda, terms_of_service
- HR: w2, 1099, pay_stub, offer_letter, i9
- INSURANCE: policy_declaration, claim_form, certificate_of_insurance
- HEALTHCARE: eob, medical_bill, prescription
- REAL_ESTATE: lease, mortgage_statement, property_tax
- SHIPPING: bill_of_lading, packing_list, customs_declaration
- other (if none match)

Then extract relevant fields based on the document type:

For INVOICES:
- invoiceNumber, vendorName, invoiceDate, dueDate, totalAmount, currency, paymentTerms, poNumber
- lineItems (array of: description, quantity, unitPrice, amount)

For RECEIPTS:
- merchantName, transactionDate, subtotal, tax, total, paymentMethod
- lineItems (array of: description, quantity, unitPrice, amount)

For PURCHASE ORDERS:
- poNumber, vendorName, poDate, deliveryDate, totalAmount, currency
- lineItems, shippingAddress, billingAddress

For BANK STATEMENTS:
- accountNumber, bankName, statementPeriodStart, statementPeriodEnd
- openingBalance, closingBalance
- transactions (array of: date, description, amount, type: credit/debit, balance)

For CREDIT CARD STATEMENTS:
- accountNumber, cardholderName, statementDate, dueDate
- creditLimit, currentBalance, minimumPayment
- transactions (array of: date, description, amount, type: credit/debit)

For CHECKS:
- checkNumber, checkDate, amount, payee, payer, memo, accountNumber, routingNumber

For CONTRACTS:
- partyA, partyB, effectiveDate, expirationDate, contractValue, contractType, terms

For AMENDMENTS:
- originalContractRef, amendmentDate, partyA, partyB, changes, effectiveDate

For NDAs:
- partyA, partyB, effectiveDate, expirationDate, term, scope, jurisdiction

For TERMS OF SERVICE:
- effectiveDate, version, companyName, keyTerms

For W-2:
- employeeName, employeeSsnLast4 (last 4 digits only), employerName, employerEin, taxYear
- wagesTipsCompensation, federalIncomeTaxWithheld
- socialSecurityWages, socialSecurityTaxWithheld, medicareWages, medicareTaxWithheld
- state, stateWages, stateIncomeTax

For 1099:
- recipientName, payerName, taxYear, amount, form1099Type (NEC, MISC, INT, DIV, etc.)
- recipientTin (last 4 only), payerTin

For PAY STUBS:
- employeeName, employerName, payPeriodStart, payPeriodEnd, payDate
- grossPay, netPay, ytdGross, ytdNet
- deductions (array of: name, amount, ytdAmount)

For OFFER LETTERS:
- candidateName, position, salary, startDate, employerName, benefits, supervisorName

For I-9:
- employeeName, citizenshipStatus, documentNumbers, documentExpirationDates
- listADocument, listBDocument, listCDocument

For POLICY DECLARATIONS (Insurance):
- policyNumber, insured, insurer, coverageType, coverageLimits, premium
- policyPeriodStart, policyPeriodEnd

For CLAIM FORMS (Insurance):
- claimNumber, dateOfLoss, claimDescription, claimant, amountClaimed, policyNumber

For CERTIFICATES OF INSURANCE:
- certificateHolder, insurer, policyNumber, coverageTypes, coverageLimits
- policyPeriodStart, policyPeriodEnd, additionalInsured

For EOB (Explanation of Benefits):
- patientName, providerName, serviceDate, billedAmount, allowedAmount
- patientResponsibility, insurancePaid, claimStatus, diagnosisCodes, procedureCodes

For MEDICAL BILLS:
- patientName, providerName, facilityName, serviceDate, admissionDate, dischargeDate
- charges, diagnosisCodes, procedureCodes

For PRESCRIPTIONS:
- patientName, prescriber, medication, dosage, quantity, refills
- pharmacyName, rxNumber, dispensedDate

For LEASE AGREEMENTS:
- landlord, tenant, propertyAddress, leaseTermStart, leaseTermEnd
- monthlyRent, securityDeposit

For MORTGAGE STATEMENTS:
- loanNumber, propertyAddress, principalBalance, propertyValue, interestRate
- escrowBalance, nextPaymentDue, nextPaymentAmount

For PROPERTY TAX BILLS:
- propertyAddress, assessedValue, taxAmount, dueDate, taxYear2, parcelNumber, taxingAuthority

For BILL OF LADING:
- shipper, consignee, carrier, origin, destination, weight, bolNumber, shipDate
- lineItems (array of: description, quantity, weight)

For PACKING LISTS:
- orderNumber, shipper, consignee, packageCount, totalWeight, shipDate
- items (array of: itemNumber, description, quantity, weight, dimensions)

For CUSTOMS DECLARATIONS:
- shipper, consignee, declaredValue, countryOfOrigin, hsCodes
- importerName, exporterName, customsEntryNumber

For ALL documents:
- Any important dates (with type: due_date, invoice_date, expiration, effective, transaction, service_date, admission, discharge, policy_period, lease_term, other)
- Any monetary amounts (with type: total, subtotal, tax, line_item, balance, wages, deduction, premium, rent, charges, other)

IMPORTANT: Also provide confidence scores for each extracted field:
- "high" = clearly visible, unambiguous, high certainty (>90%)
- "medium" = partially visible or slightly ambiguous (60-90%)
- "low" = unclear, estimated, or uncertain (<60%)

PII HANDLING: For sensitive fields like SSN, only extract the last 4 digits.

Return your analysis as a JSON object with:
{
  "documentType": "invoice" | "receipt" | "purchase_order" | "bank_statement" | "credit_card_statement" | "check" | "contract" | "amendment" | "nda" | "terms_of_service" | "w2" | "1099" | "pay_stub" | "offer_letter" | "i9" | "policy_declaration" | "claim_form" | "certificate_of_insurance" | "eob" | "medical_bill" | "prescription" | "lease" | "mortgage_statement" | "property_tax" | "bill_of_lading" | "packing_list" | "customs_declaration" | "other",
  "documentTypeConfidence": "high" | "medium" | "low",
  "fieldConfidence": { "<fieldName>": "high" | "medium" | "low", ... },
  ...extracted fields based on document type,
  "dates": [{"date": "YYYY-MM-DD", "type": "string", "context": "string"}],
  "amounts": [{"amount": number, "currency": "string", "type": "string", "context": "string"}]
}

Only include fields that are present in the document. Return null for missing fields.
Include fieldConfidence for every non-null field you extract.`;

export class MistralOCRProvider implements OCRProvider {
  name = "mistral";
  private apiKey: string;
  private model: string;
  private useTogetherExtraction: boolean;

  constructor(apiKey?: string, model?: string, useTogetherExtraction?: boolean) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || "";
    this.model = model || "pixtral-12b-2409";
    // Use Together.ai fine-tuned model for extraction if configured
    // Falls back to Mistral if Together API key is not set
    this.useTogetherExtraction = useTogetherExtraction ?? isTogetherConfigured();
  }

  async processDocument(fileUrl: string, fileType: string, options?: OCRProcessOptions): Promise<OCRResult> {
    try {
      // For images, use the vision chat endpoint
      const isImage = fileType?.startsWith("image/");

      if (isImage) {
        return this.processImage(fileUrl, options);
      }

      // For PDFs, use Mistral's dedicated OCR endpoint
      const ocrResponse = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-ocr-latest",
          document: {
            type: "document_url",
            document_url: fileUrl,
          },
        }),
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        throw new Error(`Mistral OCR API error: ${ocrResponse.status} - ${errorText}`);
      }

      const ocrData = await ocrResponse.json();

      // Extract pages from OCR result
      const pages: OCRPage[] = (ocrData.pages || []).map((page: { index: number; markdown: string }, idx: number) => ({
        pageNumber: page.index ?? idx + 1,
        markdown: page.markdown || "",
      }));

      // Combine all page text for extraction
      const rawText = pages.map(p => p.markdown).join("\n\n---\n\n");

      // Extract structured data - use Together.ai fine-tuned model if configured
      let extractedData: ExtractedDocumentData;

      if (this.useTogetherExtraction) {
        // Use Together.ai fine-tuned Llama 3.1 8B model for extraction
        try {
          // Use A/B testing extraction if documentId is provided
          if (options?.documentId) {
            const result = await extractWithExperiment(rawText, options.documentId);
            extractedData = result.data;
          } else {
            extractedData = await extractWithFineTunedModel(rawText);
          }
          extractedData.pageCount = pages.length;
        } catch (togetherError) {
          console.error("Together.ai extraction failed, falling back to Mistral:", togetherError);
          // Fall back to Mistral extraction
          extractedData = await this.extractWithMistral(rawText, pages.length);
        }
      } else {
        // Use Mistral for extraction
        extractedData = await this.extractWithMistral(rawText, pages.length);
      }

      return {
        success: true,
        rawText,
        pages,
        extractedData,
      };
    } catch (error) {
      console.error("Mistral OCR error:", error);
      return {
        success: false,
        rawText: "",
        pages: [],
        extractedData: {
          documentType: "other",
          pageCount: 0,
          hasImages: false,
          hasTables: false,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async processImage(imageUrl: string, options?: OCRProcessOptions): Promise<OCRResult> {
    try {
      // Step 1: Use Mistral OCR to extract raw text from the image
      const ocrResponse = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-ocr-latest",
          document: {
            type: "image_url",
            image_url: imageUrl,
          },
        }),
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        throw new Error(`Mistral OCR API error: ${ocrResponse.status} - ${errorText}`);
      }

      const ocrData = await ocrResponse.json();

      // Extract text from OCR result
      const pages: OCRPage[] = (ocrData.pages || []).map((page: { index: number; markdown: string }, idx: number) => ({
        pageNumber: page.index ?? idx + 1,
        markdown: page.markdown || "",
        images: [imageUrl],
      }));

      // Combine all page text
      const rawText = pages.map(p => p.markdown).join("\n\n---\n\n") || "No text extracted from image.";

      // Step 2: Extract structured data using Together.ai fine-tuned model or Mistral
      let extractedData: ExtractedDocumentData;

      if (this.useTogetherExtraction) {
        // Use Together.ai fine-tuned Llama 3.1 8B model for extraction
        try {
          // Use A/B testing extraction if documentId is provided
          if (options?.documentId) {
            const result = await extractWithExperiment(rawText, options.documentId);
            extractedData = result.data;
          } else {
            extractedData = await extractWithFineTunedModel(rawText);
          }
          extractedData.pageCount = pages.length || 1;
          extractedData.hasImages = true;
        } catch (togetherError) {
          console.error("Together.ai extraction failed, falling back to Mistral:", togetherError);
          extractedData = await this.extractWithMistral(rawText, pages.length || 1);
          extractedData.hasImages = true;
        }
      } else {
        extractedData = await this.extractWithMistral(rawText, pages.length || 1);
        extractedData.hasImages = true;
      }

      return {
        success: true,
        rawText,
        pages: pages.length > 0 ? pages : [
          {
            pageNumber: 1,
            markdown: rawText,
            images: [imageUrl],
          },
        ],
        extractedData,
      };
    } catch (error) {
      console.error("Mistral OCR error:", error);
      return {
        success: false,
        rawText: "",
        pages: [],
        extractedData: {
          documentType: "other",
          pageCount: 0,
          hasImages: false,
          hasTables: false,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Extract structured data using Mistral's chat completion API
   * Used as fallback when Together.ai is not configured or fails
   */
  private async extractWithMistral(rawText: string, pageCount: number): Promise<ExtractedDocumentData> {
    const extractionResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\nDocument text:\n${rawText}`,
          },
        ],
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!extractionResponse.ok) {
      console.error("Mistral extraction failed");
      return {
        documentType: "other",
        pageCount,
        hasImages: false,
        hasTables: false,
      };
    }

    const extractionData = await extractionResponse.json();
    const content = extractionData.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(content);
      const extractedData = this.normalizeExtractedData(parsed);
      extractedData.pageCount = pageCount;
      return extractedData;
    } catch {
      return {
        documentType: "other",
        pageCount,
        hasImages: false,
        hasTables: false,
      };
    }
  }

  private generateRawTextFromExtraction(data: ExtractedDocumentData): string {
    const lines: string[] = [];

    // Document type
    if (data.documentType && data.documentType !== "other") {
      lines.push(`Document Type: ${data.documentType.charAt(0).toUpperCase() + data.documentType.slice(1)}`);
    }

    // Invoice fields
    if (data.invoiceNumber) lines.push(`Invoice Number: ${data.invoiceNumber}`);
    if (data.vendorName) lines.push(`Vendor: ${data.vendorName}`);
    if (data.invoiceDate) lines.push(`Invoice Date: ${data.invoiceDate}`);
    if (data.dueDate) lines.push(`Due Date: ${data.dueDate}`);
    if (data.totalAmount !== undefined) {
      lines.push(`Total Amount: ${data.currency || "USD"} ${data.totalAmount}`);
    }

    // Receipt fields
    if (data.merchantName) lines.push(`Merchant: ${data.merchantName}`);
    if (data.transactionDate) lines.push(`Transaction Date: ${data.transactionDate}`);
    if (data.subtotal !== undefined) lines.push(`Subtotal: ${data.subtotal}`);
    if (data.tax !== undefined) lines.push(`Tax: ${data.tax}`);
    if (data.total !== undefined) lines.push(`Total: ${data.total}`);
    if (data.paymentMethod) lines.push(`Payment Method: ${data.paymentMethod}`);

    // Contract fields
    if (data.partyA) lines.push(`Party A: ${data.partyA}`);
    if (data.partyB) lines.push(`Party B: ${data.partyB}`);
    if (data.effectiveDate) lines.push(`Effective Date: ${data.effectiveDate}`);
    if (data.expirationDate) lines.push(`Expiration Date: ${data.expirationDate}`);
    if (data.contractValue !== undefined) lines.push(`Contract Value: ${data.contractValue}`);

    // Line items
    if (data.lineItems && data.lineItems.length > 0) {
      lines.push("");
      lines.push("Line Items:");
      for (const item of data.lineItems) {
        const itemLine = [
          item.description,
          item.quantity ? `Qty: ${item.quantity}` : null,
          item.unitPrice ? `@ ${item.unitPrice}` : null,
          item.amount ? `= ${item.amount}` : null,
        ].filter(Boolean).join(" | ");
        lines.push(`  - ${itemLine}`);
      }
    }

    return lines.length > 0 ? lines.join("\n") : "No text content extracted from image.";
  }

  private normalizeExtractedData(parsed: Record<string, unknown>): ExtractedDocumentData {
    // Calculate overall confidence from field confidences
    const fieldConfidence = parsed.fieldConfidence as Record<string, ConfidenceLevel> | undefined;
    let overallConfidence: ConfidenceLevel = "high";

    if (fieldConfidence) {
      const confidenceValues = Object.values(fieldConfidence);
      const lowCount = confidenceValues.filter(c => c === "low").length;
      const mediumCount = confidenceValues.filter(c => c === "medium").length;

      if (lowCount > confidenceValues.length * 0.3) {
        overallConfidence = "low";
      } else if (mediumCount > confidenceValues.length * 0.3 || lowCount > 0) {
        overallConfidence = "medium";
      }
    }

    const hasTables = (Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0) ||
                      (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) ||
                      (Array.isArray(parsed.deductions) && parsed.deductions.length > 0);

    return {
      documentType: (parsed.documentType as DocumentType) || "other",
      documentTypeConfidence: (parsed.documentTypeConfidence as ConfidenceLevel) || "high",
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

      // Insurance - Policy Declaration fields
      policyNumber: parsed.policyNumber as string | undefined,
      insured: parsed.insured as string | undefined,
      insurer: parsed.insurer as string | undefined,
      coverageType: parsed.coverageType as string | undefined,
      coverageLimits: parsed.coverageLimits as number | undefined,
      premium: parsed.premium as number | undefined,
      policyPeriodStart: parsed.policyPeriodStart as string | undefined,
      policyPeriodEnd: parsed.policyPeriodEnd as string | undefined,

      // Insurance - Claim Form fields
      claimNumber: parsed.claimNumber as string | undefined,
      dateOfLoss: parsed.dateOfLoss as string | undefined,
      claimDescription: parsed.claimDescription as string | undefined,
      amountClaimed: parsed.amountClaimed as number | undefined,
      claimant: parsed.claimant as string | undefined,

      // Insurance - Certificate of Insurance fields
      certificateHolder: parsed.certificateHolder as string | undefined,
      coverageTypes: parsed.coverageTypes as string[] | undefined,
      additionalInsured: parsed.additionalInsured as string | undefined,

      // Healthcare - EOB fields
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

      // Healthcare - Medical Bill fields
      facilityName: parsed.facilityName as string | undefined,
      admissionDate: parsed.admissionDate as string | undefined,
      dischargeDate: parsed.dischargeDate as string | undefined,
      charges: parsed.charges as number | undefined,

      // Healthcare - Prescription fields
      prescriber: parsed.prescriber as string | undefined,
      medication: parsed.medication as string | undefined,
      dosage: parsed.dosage as string | undefined,
      quantity: parsed.quantity as number | undefined,
      refills: parsed.refills as number | undefined,
      pharmacyName: parsed.pharmacyName as string | undefined,
      rxNumber: parsed.rxNumber as string | undefined,
      dispensedDate: parsed.dispensedDate as string | undefined,

      // Real Estate - Lease fields
      landlord: parsed.landlord as string | undefined,
      tenant: parsed.tenant as string | undefined,
      propertyAddress: parsed.propertyAddress as ExtractedDocumentData["propertyAddress"],
      leaseTermStart: parsed.leaseTermStart as string | undefined,
      leaseTermEnd: parsed.leaseTermEnd as string | undefined,
      monthlyRent: parsed.monthlyRent as number | undefined,
      securityDeposit: parsed.securityDeposit as number | undefined,

      // Real Estate - Mortgage Statement fields
      loanNumber: parsed.loanNumber as string | undefined,
      propertyValue: parsed.propertyValue as number | undefined,
      principalBalance: parsed.principalBalance as number | undefined,
      interestRate: parsed.interestRate as number | undefined,
      escrowBalance: parsed.escrowBalance as number | undefined,
      nextPaymentDue: parsed.nextPaymentDue as string | undefined,
      nextPaymentAmount: parsed.nextPaymentAmount as number | undefined,

      // Real Estate - Property Tax fields
      assessedValue: parsed.assessedValue as number | undefined,
      taxAmount: parsed.taxAmount as number | undefined,
      taxYear2: parsed.taxYear2 as number | undefined,
      parcelNumber: parsed.parcelNumber as string | undefined,
      taxingAuthority: parsed.taxingAuthority as string | undefined,

      // Shipping - Bill of Lading fields
      shipper: parsed.shipper as string | undefined,
      consignee: parsed.consignee as string | undefined,
      carrier: parsed.carrier as string | undefined,
      origin: parsed.origin as ExtractedDocumentData["origin"],
      destination: parsed.destination as ExtractedDocumentData["destination"],
      weight: parsed.weight as number | undefined,
      bolNumber: parsed.bolNumber as string | undefined,
      shipDate: parsed.shipDate as string | undefined,

      // Shipping - Packing List fields
      orderNumber: parsed.orderNumber as string | undefined,
      items: parsed.items as ExtractedDocumentData["items"],
      packageCount: parsed.packageCount as number | undefined,
      totalWeight: parsed.totalWeight as number | undefined,

      // Shipping - Customs Declaration fields
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
}
