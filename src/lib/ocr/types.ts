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

/**
 * Confidence level for extracted fields
 * high: >90% confident, likely accurate
 * medium: 60-90% confident, may need review
 * low: <60% confident, requires human verification
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * A field value with associated confidence score
 */
export interface ConfidentValue<T> {
  value: T;
  confidence: ConfidenceLevel;
  rawText?: string; // Original text from which value was extracted
}

export interface ExtractedDocumentData {
  documentType?: DocumentType;
  documentTypeConfidence?: ConfidenceLevel;
  pageCount: number;
  hasImages: boolean;
  hasTables: boolean;
  // Overall extraction confidence (average of all fields)
  overallConfidence?: ConfidenceLevel;
  // Field-level confidence scores
  fieldConfidence?: Record<string, ConfidenceLevel>;

  // Invoice fields
  invoiceNumber?: string;
  vendorName?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount?: number;
  currency?: string;
  lineItems?: LineItem[];
  paymentTerms?: string;
  poNumber?: string;

  // Receipt fields
  merchantName?: string;
  transactionDate?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentMethod?: string;

  // Purchase Order fields
  // poNumber already defined above
  poDate?: string;
  deliveryDate?: string;
  shippingAddress?: Address;
  billingAddress?: Address;

  // Bank Statement fields
  accountNumber?: string;
  bankName?: string;
  statementPeriodStart?: string;
  statementPeriodEnd?: string;
  openingBalance?: number;
  closingBalance?: number;
  transactions?: Transaction[];

  // Credit Card Statement fields
  cardholderName?: string;
  statementDate?: string;
  creditLimit?: number;
  currentBalance?: number;
  minimumPayment?: number;

  // Check fields
  checkNumber?: string;
  checkDate?: string;
  amount?: number;
  payee?: string;
  payer?: string;
  memo?: string;
  routingNumber?: string;

  // Contract fields
  partyA?: string;
  partyB?: string;
  effectiveDate?: string;
  expirationDate?: string;
  contractValue?: number;
  contractType?: string;
  terms?: string;

  // Amendment fields
  originalContractRef?: string;
  amendmentDate?: string;
  changes?: string;

  // NDA fields
  term?: string;
  scope?: string;
  jurisdiction?: string;

  // Terms of Service fields
  version?: string;
  companyName?: string;
  keyTerms?: string[];

  // W-2 fields
  employeeName?: string;
  employeeSsnLast4?: string;
  employerName?: string;
  employerEin?: string;
  taxYear?: number;
  wagesTipsCompensation?: number;
  federalIncomeTaxWithheld?: number;
  socialSecurityWages?: number;
  socialSecurityTaxWithheld?: number;
  medicareWages?: number;
  medicareTaxWithheld?: number;
  state?: string;
  stateWages?: number;
  stateIncomeTax?: number;

  // 1099 fields
  recipientName?: string;
  payerName?: string;
  recipientTin?: string;
  payerTin?: string;
  form1099Type?: string;

  // Pay Stub fields
  payPeriodStart?: string;
  payPeriodEnd?: string;
  payDate?: string;
  grossPay?: number;
  netPay?: number;
  deductions?: Deduction[];
  ytdGross?: number;
  ytdNet?: number;

  // Insurance - Policy Declaration fields
  policyNumber?: string;
  insured?: string;
  insurer?: string;
  coverageType?: string;
  coverageLimits?: number;
  premium?: number;
  policyPeriodStart?: string;
  policyPeriodEnd?: string;

  // Insurance - Claim Form fields
  claimNumber?: string;
  dateOfLoss?: string;
  claimDescription?: string;
  amountClaimed?: number;
  claimant?: string;

  // Insurance - Certificate of Insurance fields
  certificateHolder?: string;
  coverageTypes?: string[];
  additionalInsured?: string;

  // HR - Offer Letter fields
  candidateName?: string;
  position?: string;
  salary?: number;
  startDate?: string;
  benefits?: string;
  supervisorName?: string;

  // HR - I-9 fields
  citizenshipStatus?: string;
  documentNumbers?: string[];
  documentExpirationDates?: string[];
  listADocument?: string;
  listBDocument?: string;
  listCDocument?: string;

  // Healthcare - EOB fields
  patientName?: string;
  providerName?: string;
  serviceDate?: string;
  billedAmount?: number;
  allowedAmount?: number;
  patientResponsibility?: number;
  insurancePaid?: number;
  claimStatus?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];

  // Healthcare - Medical Bill fields
  facilityName?: string;
  admissionDate?: string;
  dischargeDate?: string;
  charges?: number;

  // Healthcare - Prescription fields
  prescriber?: string;
  medication?: string;
  dosage?: string;
  quantity?: number;
  refills?: number;
  pharmacyName?: string;
  rxNumber?: string;
  dispensedDate?: string;

  // Real Estate - Lease fields
  landlord?: string;
  tenant?: string;
  propertyAddress?: Address;
  leaseTermStart?: string;
  leaseTermEnd?: string;
  monthlyRent?: number;
  securityDeposit?: number;

  // Real Estate - Mortgage Statement fields
  loanNumber?: string;
  propertyValue?: number;
  principalBalance?: number;
  interestRate?: number;
  escrowBalance?: number;
  nextPaymentDue?: string;
  nextPaymentAmount?: number;

  // Real Estate - Property Tax fields
  assessedValue?: number;
  taxAmount?: number;
  taxYear2?: number; // Different from taxYear for W-2
  parcelNumber?: string;
  taxingAuthority?: string;

  // Shipping - Bill of Lading fields
  shipper?: string;
  consignee?: string;
  carrier?: string;
  origin?: Address;
  destination?: Address;
  weight?: number;
  bolNumber?: string;
  shipDate?: string;

  // Shipping - Packing List fields
  orderNumber?: string;
  items?: PackingItem[];
  packageCount?: number;
  totalWeight?: number;

  // Shipping - Customs Declaration fields
  declaredValue?: number;
  countryOfOrigin?: string;
  hsCodes?: string[];
  importerName?: string;
  exporterName?: string;
  customsEntryNumber?: string;

  // General fields
  dates?: ExtractedDate[];
  amounts?: ExtractedAmount[];
}

export interface Address {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Transaction {
  date?: string;
  description?: string;
  amount?: number;
  type?: "credit" | "debit";
  balance?: number;
}

export interface Deduction {
  name: string;
  amount: number;
  ytdAmount?: number;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

export interface PackingItem {
  itemNumber?: string;
  description: string;
  quantity: number;
  weight?: number;
  dimensions?: string;
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

export type DocumentType =
  // Financial (Tier 1)
  | "invoice"
  | "receipt"
  | "purchase_order"
  | "bank_statement"
  | "credit_card_statement"
  | "check"
  // Legal (Tier 1)
  | "contract"
  | "amendment"
  | "nda"
  | "terms_of_service"
  // HR (Tier 1)
  | "w2"
  | "1099"
  | "pay_stub"
  | "offer_letter"
  | "i9"
  // Insurance (Tier 1)
  | "policy_declaration"
  | "claim_form"
  | "certificate_of_insurance"
  // Healthcare (Tier 2)
  | "eob"
  | "medical_bill"
  | "prescription"
  // Real Estate (Tier 2)
  | "lease"
  | "mortgage_statement"
  | "property_tax"
  // Shipping (Tier 2)
  | "bill_of_lading"
  | "packing_list"
  | "customs_declaration"
  // Fallback
  | "other";

export type DocumentCategory = "financial" | "legal" | "hr" | "insurance" | "healthcare" | "real_estate" | "shipping" | "other";

export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, {
  label: string;
  category: DocumentCategory;
  requiredFields: string[];
  optionalFields: string[];
}> = {
  invoice: {
    label: "Invoice",
    category: "financial",
    requiredFields: ["invoiceNumber", "vendorName", "totalAmount"],
    optionalFields: ["invoiceDate", "dueDate", "currency", "lineItems", "subtotal", "tax", "paymentTerms", "poNumber"],
  },
  receipt: {
    label: "Receipt",
    category: "financial",
    requiredFields: ["merchantName", "total"],
    optionalFields: ["transactionDate", "subtotal", "tax", "paymentMethod", "lineItems"],
  },
  purchase_order: {
    label: "Purchase Order",
    category: "financial",
    requiredFields: ["poNumber", "vendorName"],
    optionalFields: ["poDate", "deliveryDate", "totalAmount", "lineItems", "shippingAddress", "billingAddress"],
  },
  bank_statement: {
    label: "Bank Statement",
    category: "financial",
    requiredFields: ["accountNumber", "statementPeriodStart", "statementPeriodEnd"],
    optionalFields: ["bankName", "openingBalance", "closingBalance", "transactions"],
  },
  credit_card_statement: {
    label: "Credit Card Statement",
    category: "financial",
    requiredFields: ["accountNumber", "statementDate"],
    optionalFields: ["cardholderName", "creditLimit", "currentBalance", "minimumPayment", "dueDate", "transactions"],
  },
  check: {
    label: "Check",
    category: "financial",
    requiredFields: ["checkNumber", "amount", "payee"],
    optionalFields: ["checkDate", "memo", "accountNumber", "routingNumber", "payer"],
  },
  contract: {
    label: "Contract",
    category: "legal",
    requiredFields: ["partyA", "partyB"],
    optionalFields: ["effectiveDate", "expirationDate", "contractValue", "contractType", "terms"],
  },
  amendment: {
    label: "Amendment",
    category: "legal",
    requiredFields: ["originalContractRef", "amendmentDate"],
    optionalFields: ["partyA", "partyB", "changes", "effectiveDate"],
  },
  nda: {
    label: "NDA",
    category: "legal",
    requiredFields: ["partyA", "partyB", "effectiveDate"],
    optionalFields: ["term", "scope", "jurisdiction", "expirationDate"],
  },
  terms_of_service: {
    label: "Terms of Service",
    category: "legal",
    requiredFields: ["effectiveDate"],
    optionalFields: ["version", "companyName", "keyTerms"],
  },
  w2: {
    label: "W-2",
    category: "hr",
    requiredFields: ["employeeName", "employerName", "taxYear", "wagesTipsCompensation"],
    optionalFields: ["employeeSsnLast4", "employerEin", "federalIncomeTaxWithheld", "socialSecurityWages", "socialSecurityTaxWithheld", "medicareWages", "medicareTaxWithheld", "state", "stateWages", "stateIncomeTax"],
  },
  "1099": {
    label: "1099",
    category: "hr",
    requiredFields: ["recipientName", "payerName", "taxYear", "amount"],
    optionalFields: ["recipientTin", "payerTin", "form1099Type"],
  },
  pay_stub: {
    label: "Pay Stub",
    category: "hr",
    requiredFields: ["employeeName", "payPeriodStart", "payPeriodEnd", "grossPay", "netPay"],
    optionalFields: ["employerName", "payDate", "deductions", "ytdGross", "ytdNet"],
  },
  offer_letter: {
    label: "Offer Letter",
    category: "hr",
    requiredFields: ["candidateName", "position", "salary", "startDate"],
    optionalFields: ["employerName", "benefits", "supervisorName"],
  },
  i9: {
    label: "I-9",
    category: "hr",
    requiredFields: ["employeeName", "citizenshipStatus"],
    optionalFields: ["documentNumbers", "documentExpirationDates", "listADocument", "listBDocument", "listCDocument"],
  },
  // Insurance (Tier 1)
  policy_declaration: {
    label: "Policy Declaration",
    category: "insurance",
    requiredFields: ["policyNumber", "insured", "coverageType"],
    optionalFields: ["insurer", "coverageLimits", "premium", "policyPeriodStart", "policyPeriodEnd"],
  },
  claim_form: {
    label: "Claim Form",
    category: "insurance",
    requiredFields: ["claimNumber", "dateOfLoss", "claimDescription"],
    optionalFields: ["claimant", "amountClaimed", "policyNumber"],
  },
  certificate_of_insurance: {
    label: "Certificate of Insurance",
    category: "insurance",
    requiredFields: ["certificateHolder", "insurer", "policyNumber"],
    optionalFields: ["coverageTypes", "coverageLimits", "policyPeriodStart", "policyPeriodEnd", "additionalInsured"],
  },
  // Healthcare (Tier 2)
  eob: {
    label: "Explanation of Benefits",
    category: "healthcare",
    requiredFields: ["patientName", "providerName", "serviceDate"],
    optionalFields: ["billedAmount", "allowedAmount", "patientResponsibility", "insurancePaid", "claimStatus", "diagnosisCodes", "procedureCodes"],
  },
  medical_bill: {
    label: "Medical Bill",
    category: "healthcare",
    requiredFields: ["patientName", "providerName", "charges"],
    optionalFields: ["facilityName", "serviceDate", "admissionDate", "dischargeDate", "diagnosisCodes", "procedureCodes"],
  },
  prescription: {
    label: "Prescription",
    category: "healthcare",
    requiredFields: ["patientName", "prescriber", "medication"],
    optionalFields: ["dosage", "quantity", "refills", "pharmacyName", "rxNumber", "dispensedDate"],
  },
  // Real Estate (Tier 2)
  lease: {
    label: "Lease Agreement",
    category: "real_estate",
    requiredFields: ["landlord", "tenant", "propertyAddress"],
    optionalFields: ["leaseTermStart", "leaseTermEnd", "monthlyRent", "securityDeposit"],
  },
  mortgage_statement: {
    label: "Mortgage Statement",
    category: "real_estate",
    requiredFields: ["loanNumber", "propertyAddress", "principalBalance"],
    optionalFields: ["propertyValue", "interestRate", "escrowBalance", "nextPaymentDue", "nextPaymentAmount"],
  },
  property_tax: {
    label: "Property Tax Bill",
    category: "real_estate",
    requiredFields: ["propertyAddress", "taxAmount", "dueDate"],
    optionalFields: ["assessedValue", "taxYear2", "parcelNumber", "taxingAuthority"],
  },
  // Shipping (Tier 2)
  bill_of_lading: {
    label: "Bill of Lading",
    category: "shipping",
    requiredFields: ["shipper", "consignee", "carrier"],
    optionalFields: ["origin", "destination", "weight", "bolNumber", "shipDate", "lineItems"],
  },
  packing_list: {
    label: "Packing List",
    category: "shipping",
    requiredFields: ["orderNumber", "items"],
    optionalFields: ["shipper", "consignee", "packageCount", "totalWeight", "shipDate"],
  },
  customs_declaration: {
    label: "Customs Declaration",
    category: "shipping",
    requiredFields: ["shipper", "declaredValue", "countryOfOrigin"],
    optionalFields: ["consignee", "hsCodes", "importerName", "exporterName", "customsEntryNumber"],
  },
  // Fallback
  other: {
    label: "Other",
    category: "other",
    requiredFields: [],
    optionalFields: [],
  },
};

// Field categorization for consistent display across document types
export type FieldCategory = "dates" | "amounts" | "parties" | "identifiers" | "addresses" | "other";

export const FIELD_CATEGORIES: Record<FieldCategory, {
  label: string;
  icon: string; // Lucide icon name
  fields: string[];
}> = {
  dates: {
    label: "Important Dates",
    icon: "Calendar",
    fields: [
      // Financial
      "invoiceDate", "dueDate", "transactionDate", "poDate", "deliveryDate",
      "statementPeriodStart", "statementPeriodEnd", "statementDate", "checkDate",
      // Legal
      "effectiveDate", "expirationDate", "amendmentDate",
      // HR
      "taxYear", "payPeriodStart", "payPeriodEnd", "payDate", "startDate",
      "documentExpirationDates",
      // Insurance
      "policyPeriodStart", "policyPeriodEnd", "dateOfLoss",
      // Healthcare
      "serviceDate", "admissionDate", "dischargeDate", "dispensedDate",
      // Real Estate
      "leaseTermStart", "leaseTermEnd", "nextPaymentDue", "taxYear2",
      // Shipping
      "shipDate",
    ],
  },
  amounts: {
    label: "Financial Amounts",
    icon: "DollarSign",
    fields: [
      // Financial
      "totalAmount", "subtotal", "tax", "total", "amount", "openingBalance",
      "closingBalance", "creditLimit", "currentBalance", "minimumPayment",
      // HR
      "grossPay", "netPay", "ytdGross", "ytdNet", "wagesTipsCompensation",
      "federalIncomeTaxWithheld", "socialSecurityWages", "socialSecurityTax",
      "medicareWages", "medicareTax", "salary",
      // Insurance
      "coverageLimits", "premium", "amountClaimed",
      // Healthcare
      "billedAmount", "allowedAmount", "patientResponsibility", "insurancePaid",
      "charges",
      // Real Estate
      "monthlyRent", "securityDeposit", "propertyValue", "principalBalance",
      "escrowBalance", "nextPaymentAmount", "assessedValue", "taxAmount",
      // Shipping
      "weight", "totalWeight", "declaredValue",
    ],
  },
  parties: {
    label: "Parties & Contacts",
    icon: "Users",
    fields: [
      // Financial
      "vendorName", "merchantName", "payee", "payer", "cardholderName", "bankName",
      // Legal
      "partyA", "partyB", "disclosingParty", "receivingParty",
      // HR
      "employeeName", "employerName", "recipientName", "payerName",
      "candidateName", "supervisorName",
      // Insurance
      "insured", "insurer", "claimant", "certificateHolder", "additionalInsured",
      // Healthcare
      "patientName", "providerName", "prescriber", "pharmacyName", "facilityName",
      // Real Estate
      "landlord", "tenant", "taxingAuthority",
      // Shipping
      "shipper", "consignee", "carrier", "importerName", "exporterName",
    ],
  },
  identifiers: {
    label: "Reference Numbers",
    icon: "Hash",
    fields: [
      // Financial
      "invoiceNumber", "poNumber", "accountNumber", "checkNumber", "routingNumber",
      // Legal
      "originalContractRef",
      // HR
      "ssn", "ein", "employeeSsnLast4", "employerEin", "recipientTin", "payerTin",
      "documentNumbers",
      // Insurance
      "policyNumber", "claimNumber",
      // Healthcare
      "diagnosisCodes", "procedureCodes", "rxNumber",
      // Real Estate
      "loanNumber", "parcelNumber",
      // Shipping
      "bolNumber", "orderNumber", "customsEntryNumber", "hsCodes",
    ],
  },
  addresses: {
    label: "Addresses",
    icon: "MapPin",
    fields: [
      "shippingAddress", "billingAddress", "employerAddress", "payerAddress",
      "propertyAddress", "origin", "destination",
    ],
  },
  other: {
    label: "Other Details",
    icon: "FileText",
    fields: [
      // Financial
      "currency", "paymentTerms", "paymentMethod", "memo",
      // Legal
      "purpose", "confidentialInfo", "term", "governingLaw", "jurisdiction",
      "scope", "version", "keyTerms", "terms", "contractType", "changes",
      // HR
      "deductions", "form1099Type", "citizenshipStatus", "listADocument",
      "listBDocument", "listCDocument", "position", "benefits",
      // Insurance
      "coverageType", "coverageTypes", "claimDescription", "claimStatus",
      // Healthcare
      "medication", "dosage", "quantity", "refills",
      // Real Estate
      "interestRate",
      // Shipping
      "items", "packageCount", "countryOfOrigin",
    ],
  },
};

// Helper to get field category
export function getFieldCategory(fieldName: string): FieldCategory {
  for (const [category, config] of Object.entries(FIELD_CATEGORIES)) {
    if (config.fields.includes(fieldName)) {
      return category as FieldCategory;
    }
  }
  return "other";
}

// Helper to get all fields for a document type grouped by category
export function getFieldsByCategory(documentType: DocumentType): Record<FieldCategory, string[]> {
  const typeConfig = DOCUMENT_TYPE_CONFIG[documentType];
  const allFields = [...typeConfig.requiredFields, ...typeConfig.optionalFields];

  const result: Record<FieldCategory, string[]> = {
    dates: [],
    amounts: [],
    parties: [],
    identifiers: [],
    addresses: [],
    other: [],
  };

  for (const field of allFields) {
    const category = getFieldCategory(field);
    result[category].push(field);
  }

  return result;
}

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
