import {
  OCRProvider,
  OCRResult,
  OCRPage,
  ExtractedDocumentData,
  DocumentType,
  ConfidenceLevel,
} from "./types";

const EXTRACTION_PROMPT = `You are an expert document analyst. Analyze this document and extract structured information with confidence scores.

First, identify the document type (invoice, receipt, contract, or other).

Then extract relevant fields based on the document type:

For INVOICES:
- invoiceNumber, vendorName, invoiceDate, dueDate, totalAmount, currency
- lineItems (array of: description, quantity, unitPrice, amount)

For RECEIPTS:
- merchantName, transactionDate, subtotal, tax, total, paymentMethod

For CONTRACTS:
- partyA, partyB, effectiveDate, expirationDate, contractValue

For ALL documents:
- Any important dates (with type: due_date, invoice_date, expiration, effective, transaction, other)
- Any monetary amounts (with type: total, subtotal, tax, line_item, other)

IMPORTANT: Also provide confidence scores for each extracted field:
- "high" = clearly visible, unambiguous, high certainty (>90%)
- "medium" = partially visible or slightly ambiguous (60-90%)
- "low" = unclear, estimated, or uncertain (<60%)

Return your analysis as a JSON object with this structure:
{
  "documentType": "invoice" | "receipt" | "contract" | "other",
  "documentTypeConfidence": "high" | "medium" | "low",
  "fieldConfidence": {
    "invoiceNumber": "high" | "medium" | "low",
    "vendorName": "high" | "medium" | "low",
    ...for each extracted field
  },
  "invoiceNumber": "string or null",
  "vendorName": "string or null",
  "merchantName": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "transactionDate": "YYYY-MM-DD or null",
  "effectiveDate": "YYYY-MM-DD or null",
  "expirationDate": "YYYY-MM-DD or null",
  "totalAmount": number or null,
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "currency": "USD" or other currency code,
  "paymentMethod": "string or null",
  "partyA": "string or null",
  "partyB": "string or null",
  "contractValue": number or null,
  "lineItems": [{"description": "string", "quantity": number, "unitPrice": number, "amount": number}],
  "dates": [{"date": "YYYY-MM-DD", "type": "string", "context": "string"}],
  "amounts": [{"amount": number, "currency": "string", "type": "string", "context": "string"}]
}

Only include fields that are present in the document. Return null for missing fields.
Include fieldConfidence for every non-null field you extract.`;

export class MistralOCRProvider implements OCRProvider {
  name = "mistral";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || "";
    this.model = model || "pixtral-12b-2409";
  }

  async processDocument(fileUrl: string, fileType: string): Promise<OCRResult> {
    try {
      // For images, use the vision chat endpoint
      const isImage = fileType?.startsWith("image/");

      if (isImage) {
        return this.processImage(fileUrl);
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

      // Now use chat completion to extract structured data from the OCR text
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
        // OCR succeeded but extraction failed - still return OCR results
        console.error("Extraction failed, returning raw OCR");
        return {
          success: true,
          rawText,
          pages,
          extractedData: {
            documentType: "other",
            pageCount: pages.length,
            hasImages: false,
            hasTables: false,
          },
        };
      }

      const extractionData = await extractionResponse.json();
      const content = extractionData.choices?.[0]?.message?.content || "";

      // Parse the extracted data
      let extractedData: ExtractedDocumentData;
      try {
        const parsed = JSON.parse(content);
        extractedData = this.normalizeExtractedData(parsed);
        extractedData.pageCount = pages.length;
      } catch {
        extractedData = {
          documentType: "other",
          pageCount: pages.length,
          hasImages: false,
          hasTables: false,
        };
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

  async processImage(imageUrl: string): Promise<OCRResult> {
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: EXTRACTION_PROMPT,
                },
                {
                  type: "image_url",
                  image_url: imageUrl,
                },
              ],
            },
          ],
          max_tokens: 4096,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      let extractedData: ExtractedDocumentData;
      let rawText = "";
      try {
        const parsed = JSON.parse(content);
        extractedData = this.normalizeExtractedData(parsed);
        // Generate human-readable text from extracted data for images
        rawText = this.generateRawTextFromExtraction(extractedData);
      } catch {
        extractedData = {
          documentType: "other",
          pageCount: 1,
          hasImages: true,
          hasTables: false,
        };
        rawText = "Image processed but text extraction failed.";
      }

      return {
        success: true,
        rawText,
        pages: [
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

    return {
      documentType: (parsed.documentType as DocumentType) || "other",
      documentTypeConfidence: (parsed.documentTypeConfidence as ConfidenceLevel) || "high",
      pageCount: 1,
      hasImages: false,
      hasTables: Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0,
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
      // Receipt fields
      merchantName: parsed.merchantName as string | undefined,
      transactionDate: parsed.transactionDate as string | undefined,
      subtotal: parsed.subtotal as number | undefined,
      tax: parsed.tax as number | undefined,
      total: parsed.total as number | undefined,
      paymentMethod: parsed.paymentMethod as string | undefined,
      // Contract fields
      partyA: parsed.partyA as string | undefined,
      partyB: parsed.partyB as string | undefined,
      effectiveDate: parsed.effectiveDate as string | undefined,
      expirationDate: parsed.expirationDate as string | undefined,
      contractValue: parsed.contractValue as number | undefined,
      // General fields
      dates: parsed.dates as ExtractedDocumentData["dates"],
      amounts: parsed.amounts as ExtractedDocumentData["amounts"],
    };
  }
}
