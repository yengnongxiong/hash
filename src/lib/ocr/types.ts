/**
 * OCR Provider Types
 * Abstraction layer for document OCR processing
 */

export interface OCRPage {
  pageNumber: number;
  markdown: string;
  images?: string[];
  tables?: string[];
}

export interface OCRResult {
  success: boolean;
  rawText: string;
  pages: OCRPage[];
  extractedData: ExtractedDocumentData;
  error?: string;
}

export interface ExtractedDocumentData {
  documentType?: DocumentType;
  pageCount: number;
  hasImages: boolean;
  hasTables: boolean;
  // Invoice fields
  invoiceNumber?: string;
  vendorName?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount?: number;
  currency?: string;
  lineItems?: LineItem[];
  // Receipt fields
  merchantName?: string;
  transactionDate?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentMethod?: string;
  // Contract fields
  partyA?: string;
  partyB?: string;
  effectiveDate?: string;
  expirationDate?: string;
  contractValue?: number;
  // General fields
  dates?: ExtractedDate[];
  amounts?: ExtractedAmount[];
}

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

export interface ExtractedDate {
  date: string;
  type: "due_date" | "invoice_date" | "expiration" | "effective" | "transaction" | "other";
  context?: string;
}

export interface ExtractedAmount {
  amount: number;
  currency?: string;
  type: "total" | "subtotal" | "tax" | "line_item" | "other";
  context?: string;
}

export type DocumentType = "invoice" | "receipt" | "contract" | "other";

export interface OCRProvider {
  name: string;
  processDocument(fileUrl: string, fileType: string): Promise<OCRResult>;
  processImage(imageUrl: string): Promise<OCRResult>;
}

export interface OCRProviderConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}
