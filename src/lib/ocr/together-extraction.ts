/**
 * Together.ai Fine-Tuned Model Integration
 *
 * Uses our fine-tuned Mistral-7B model for document extraction.
 * Falls back to standard Mistral API if fine-tuned model is unavailable.
 */

// Document types supported by the extraction model
type DocumentType =
  | "invoice"
  | "receipt"
  | "contract"
  | "w2"
  | "form"
  | "bank_statement"
  | "purchase_order"
  | "other";

// Together.ai API configuration
const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

// Fine-tuned model ID (set after training completes)
// Format: <org>/<model-name> e.g., "yourorg/hash-document-extraction"
const FINE_TUNED_MODEL = process.env.TOGETHER_FINE_TUNED_MODEL;
const FALLBACK_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

interface ExtractionResult {
  document_type: DocumentType;
  confidence: number;
  fields: Record<string, FieldValue>;
}

interface FieldValue {
  value: string | number | object;
  confidence?: number;
}

interface TogetherMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

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

const SYSTEM_PROMPT = `You are an expert document extraction assistant. Your task is to analyze document text (from OCR) and extract structured data. Always respond with valid JSON containing the document type and extracted fields. Be precise and extract all available information.

For each field, include the extracted value. Focus on accuracy over completeness - it's better to leave a field empty than to guess incorrectly.

Document types: invoice, receipt, contract, w2, form, bank_statement, purchase_order, other

Common fields by type:
- Invoice: invoice_number, invoice_date, due_date, vendor_name, customer_name, line_items, subtotal, tax, total, payment_terms
- Receipt: merchant_name, date, time, line_items, subtotal, tax, total, payment_method
- Contract: contract_type, parties, effective_date, expiration_date, contract_value, terms
- W2: tax_year, employer_name, employer_ein, employee_name, wages, federal_tax_withheld`;

/**
 * Extract structured data from document text using fine-tuned model
 */
export async function extractWithFineTunedModel(
  ocrText: string,
  options?: {
    expectedType?: DocumentType;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ExtractionResult> {
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY environment variable not set");
  }

  // Use fine-tuned model if available, otherwise fallback
  const model = FINE_TUNED_MODEL || FALLBACK_MODEL;

  // Build the user prompt
  let userPrompt = "Extract structured data from this document:\n\n" + ocrText;

  if (options?.expectedType) {
    userPrompt = `Extract structured data from this ${options.expectedType}:\n\n${ocrText}`;
  }

  const messages: TogetherMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options?.maxTokens ?? 2000,
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

    // Parse the JSON response
    const result = JSON.parse(content);

    // Normalize the response format
    return normalizeExtractionResult(result);
  } catch (error) {
    console.error("Together extraction error:", error);
    throw error;
  }
}

/**
 * Classify document type using fine-tuned model
 */
export async function classifyDocumentType(
  ocrText: string
): Promise<{ type: DocumentType; confidence: number }> {
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY environment variable not set");
  }

  const model = FINE_TUNED_MODEL || FALLBACK_MODEL;

  const messages: TogetherMessage[] = [
    {
      role: "system",
      content:
        "You are a document classification expert. Classify the document type and respond with JSON: {\"document_type\": \"type\", \"confidence\": 0.95}",
    },
    {
      role: "user",
      content: `Classify this document into one of: invoice, receipt, contract, w2, form, bank_statement, purchase_order, other.\n\n${ocrText.slice(0, 2000)}`,
    },
  ];

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 100,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Together API error: ${response.status}`);
    }

    const data: TogetherResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return { type: "other", confidence: 0.5 };
    }

    const result = JSON.parse(content);
    return {
      type: (result.document_type || "other") as DocumentType,
      confidence: result.confidence ?? 0.8,
    };
  } catch (error) {
    console.error("Document classification error:", error);
    return { type: "other", confidence: 0.5 };
  }
}

/**
 * Normalize extraction result to consistent format
 */
function normalizeExtractionResult(result: Record<string, unknown>): ExtractionResult {
  // Handle different response formats
  const documentType = (result.document_type ||
    result.type ||
    "other") as DocumentType;

  // Extract fields, removing document_type from fields object
  const fields: Record<string, FieldValue> = {};

  const rawFields = result.fields || result;

  for (const [key, value] of Object.entries(rawFields)) {
    if (key === "document_type" || key === "type" || key === "confidence") {
      continue;
    }

    // Normalize field value
    if (typeof value === "object" && value !== null && "value" in value) {
      fields[key] = value as FieldValue;
    } else {
      fields[key] = { value: value as string | number | object };
    }
  }

  return {
    document_type: documentType,
    confidence: (result.confidence as number) ?? 0.85,
    fields,
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
 * Test the fine-tuned model with a sample document
 */
export async function testFineTunedModel(): Promise<{
  success: boolean;
  model: string;
  latencyMs: number;
  result?: ExtractionResult;
  error?: string;
}> {
  const start = Date.now();
  const model = getCurrentModel();

  const sampleInvoice = `
ACME Corporation
123 Business Street
New York, NY 10001

INVOICE

Invoice #: INV-2024-001
Date: January 15, 2024
Due Date: February 14, 2024

Bill To:
XYZ Company
456 Client Avenue
Los Angeles, CA 90001

Description                    Qty    Price     Amount
Consulting Services            10     $150.00   $1,500.00
Software License               1      $500.00   $500.00

                               Subtotal:        $2,000.00
                               Tax (8%):        $160.00
                               Total:           $2,160.00

Payment Terms: Net 30
`;

  try {
    const result = await extractWithFineTunedModel(sampleInvoice, {
      expectedType: "invoice",
    });

    return {
      success: true,
      model,
      latencyMs: Date.now() - start,
      result,
    };
  } catch (error) {
    return {
      success: false,
      model,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
