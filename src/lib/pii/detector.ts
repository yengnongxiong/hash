/**
 * PII (Personally Identifiable Information) Detection and Redaction
 *
 * Detects and optionally redacts sensitive information from documents:
 * - Social Security Numbers (SSN)
 * - Credit Card Numbers
 * - Bank Account Numbers
 * - Email Addresses
 * - Phone Numbers
 * - Dates of Birth
 * - Addresses
 * - Names (context-dependent)
 */

export type PIIType =
  | "ssn"
  | "credit_card"
  | "bank_account"
  | "email"
  | "phone"
  | "date_of_birth"
  | "address"
  | "name"
  | "ein"
  | "passport"
  | "driver_license";

export interface PIIMatch {
  type: PIIType;
  value: string;
  redactedValue: string;
  startIndex: number;
  endIndex: number;
  confidence: "high" | "medium" | "low";
  context?: string;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  matches: PIIMatch[];
  redactedText?: string;
  summary: {
    totalMatches: number;
    byType: Record<PIIType, number>;
    highConfidenceCount: number;
  };
}

interface PIIPatternConfig {
  pattern: RegExp;
  redactor: (match: string) => string;
  confidence: "high" | "medium" | "low";
  validate?: (match: string) => boolean;
}

// SSN redactor - show only last 4 digits
function redactSSN(match: string): string {
  const clean = match.replace(/[-\s]/g, "");
  return "***-**-" + clean.slice(-4);
}

// Credit card redactor - show only last 4 digits
function redactCreditCard(match: string): string {
  const clean = match.replace(/[-\s]/g, "");
  return "****-****-****-" + clean.slice(-4);
}

// Bank account redactor - show only last 4 digits
function redactBankAccount(match: string): string {
  return "****" + match.slice(-4);
}

// Email redactor - partially mask local part
function redactEmail(match: string): string {
  const atIndex = match.indexOf("@");
  if (atIndex === -1) return "***@***.***";
  const local = match.slice(0, atIndex);
  const domain = match.slice(atIndex + 1);
  const redactedLocal = local.length > 2 ? local[0] + "***" + local.slice(-1) : "***";
  return redactedLocal + "@" + domain;
}

// Phone redactor - show only last 4 digits
function redactPhone(match: string): string {
  const clean = match.replace(/[-.\s()+]/g, "");
  return "***-***-" + clean.slice(-4);
}

// Date redactor
function redactDate(): string {
  return "**/**/****";
}

// EIN redactor - show only last 4 digits
function redactEIN(match: string): string {
  const clean = match.replace(/[-\s]/g, "");
  return "**-***" + clean.slice(-4);
}

// Passport redactor
function redactPassport(match: string): string {
  return match[0] + "****" + match.slice(-2);
}

// Driver license redactor
function redactDriverLicense(match: string): string {
  return "****" + match.slice(-4);
}

// Address redactor
function redactAddress(): string {
  return "[ADDRESS REDACTED]";
}

// Name redactor
function redactName(match: string): string {
  const parts = match.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts[0][0] + "*** " + parts[parts.length - 1][0] + "***";
  }
  return "[NAME REDACTED]";
}

// Validate SSN
function validateSSN(match: string): boolean {
  const clean = match.replace(/[-\s]/g, "");
  const area = clean.slice(0, 3);
  const group = clean.slice(3, 5);
  const serial = clean.slice(5, 9);
  return area !== "000" && group !== "00" && serial !== "0000";
}

// Validate credit card using Luhn algorithm
function validateCreditCard(match: string): boolean {
  const clean = match.replace(/[-\s]/g, "");
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// Validate phone number
function validatePhone(match: string): boolean {
  const clean = match.replace(/[-.\s()+]/g, "");
  return clean.length >= 10 && clean.length <= 11;
}

// Validate EIN
function validateEIN(match: string): boolean {
  const clean = match.replace(/[-\s]/g, "");
  return clean.length === 9;
}

// PII Detection Patterns
const PII_PATTERNS: Record<PIIType, PIIPatternConfig> = {
  ssn: {
    pattern: /\b(\d{3}[-\s]?\d{2}[-\s]?\d{4})\b/g,
    redactor: redactSSN,
    confidence: "high",
    validate: validateSSN,
  },
  credit_card: {
    pattern: /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{6}[-\s]?\d{5})\b/g,
    redactor: redactCreditCard,
    confidence: "high",
    validate: validateCreditCard,
  },
  bank_account: {
    pattern: /\b(\d{8,17})\b/g,
    redactor: redactBankAccount,
    confidence: "low",
  },
  email: {
    pattern: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi,
    redactor: redactEmail,
    confidence: "high",
  },
  phone: {
    pattern: /\b(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/g,
    redactor: redactPhone,
    confidence: "medium",
    validate: validatePhone,
  },
  date_of_birth: {
    pattern: /\b((?:DOB|Date of Birth|Birth Date|Born)[:\s]*)?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/gi,
    redactor: redactDate,
    confidence: "medium",
  },
  ein: {
    pattern: /\b(\d{2}[-\s]?\d{7})\b/g,
    redactor: redactEIN,
    confidence: "medium",
    validate: validateEIN,
  },
  passport: {
    pattern: /\b([A-Z]{1,2}\d{6,9})\b/gi,
    redactor: redactPassport,
    confidence: "low",
  },
  driver_license: {
    pattern: /\b([A-Z]\d{7,8}|\d{7,9})\b/gi,
    redactor: redactDriverLicense,
    confidence: "low",
  },
  address: {
    pattern: /\b(\d{1,5}\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)\.?(?:\s+(?:Apt|Apartment|Suite|Ste|Unit|#)\s*\d+)?)\b/gi,
    redactor: redactAddress,
    confidence: "medium",
  },
  name: {
    pattern: /(?:(?:Name|Patient|Employee|Tenant|Landlord|Buyer|Seller)[:\s]+)([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/g,
    redactor: redactName,
    confidence: "medium",
  },
};

/**
 * Detect PII in text
 */
export function detectPII(
  text: string,
  options?: {
    types?: PIIType[];
    minConfidence?: "high" | "medium" | "low";
  }
): PIIDetectionResult {
  const typesToCheck = options?.types || (Object.keys(PII_PATTERNS) as PIIType[]);
  const minConfidence = options?.minConfidence || "low";

  const confidenceOrder: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const matches: PIIMatch[] = [];
  const byType: Record<PIIType, number> = {} as Record<PIIType, number>;

  for (const type of typesToCheck) {
    const config = PII_PATTERNS[type];
    if (!config) continue;

    if (confidenceOrder[config.confidence] < confidenceOrder[minConfidence]) {
      continue;
    }

    config.pattern.lastIndex = 0;

    let match;
    while ((match = config.pattern.exec(text)) !== null) {
      const value = match[1] || match[0];

      if (config.validate && !config.validate(value)) {
        continue;
      }

      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 20);
      const context = text.slice(contextStart, contextEnd);

      matches.push({
        type,
        value,
        redactedValue: config.redactor(value),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: config.confidence,
        context,
      });

      byType[type] = (byType[type] || 0) + 1;
    }
  }

  matches.sort((a, b) => a.startIndex - b.startIndex);

  return {
    hasPII: matches.length > 0,
    matches,
    summary: {
      totalMatches: matches.length,
      byType,
      highConfidenceCount: matches.filter((m) => m.confidence === "high").length,
    },
  };
}

/**
 * Redact PII from text
 */
export function redactPII(
  text: string,
  options?: {
    types?: PIIType[];
    minConfidence?: "high" | "medium" | "low";
  }
): PIIDetectionResult {
  const detection = detectPII(text, options);

  if (!detection.hasPII) {
    return {
      ...detection,
      redactedText: text,
    };
  }

  let redactedText = text;
  const sortedMatches = [...detection.matches].sort((a, b) => b.startIndex - a.startIndex);

  for (const match of sortedMatches) {
    const before = redactedText.slice(0, match.startIndex);
    const after = redactedText.slice(match.endIndex);
    redactedText = before + match.redactedValue + after;
  }

  return {
    ...detection,
    redactedText,
  };
}

/**
 * Check if extracted data contains PII fields
 */
export function checkExtractedDataForPII(
  data: Record<string, unknown>
): {
  hasSensitiveFields: boolean;
  sensitiveFields: string[];
  recommendations: string[];
} {
  const sensitiveFieldPatterns = [
    /ssn/i,
    /social.*security/i,
    /tax.*id/i,
    /tin/i,
    /ein/i,
    /credit.*card/i,
    /card.*number/i,
    /bank.*account/i,
    /account.*number/i,
    /routing/i,
    /passport/i,
    /driver.*license/i,
    /date.*birth/i,
    /dob/i,
  ];

  const sensitiveFields: string[] = [];
  const recommendations: string[] = [];

  function checkObject(obj: Record<string, unknown>, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? prefix + "." + key : key;
      const isSensitive = sensitiveFieldPatterns.some((pattern) => pattern.test(key));

      if (isSensitive) {
        sensitiveFields.push(fullKey);

        if (/ssn/i.test(key) && typeof value === "string" && value.length > 4) {
          recommendations.push("Consider storing only last 4 digits of " + fullKey);
        }
        if (/credit.*card|card.*number/i.test(key)) {
          recommendations.push(fullKey + " should be tokenized, not stored directly");
        }
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        checkObject(value as Record<string, unknown>, fullKey);
      }
    }
  }

  checkObject(data);

  return {
    hasSensitiveFields: sensitiveFields.length > 0,
    sensitiveFields,
    recommendations,
  };
}

/**
 * Mask PII for display purposes
 */
export function maskPIIForDisplay(value: string, type: PIIType): string {
  const config = PII_PATTERNS[type];
  if (!config) {
    if (value.length <= 4) return "****";
    return value[0] + "*".repeat(value.length - 2) + value[value.length - 1];
  }

  return config.redactor(value);
}
