"use server";

import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/database";

export type RuleType = "format" | "range" | "comparison" | "cross_field" | "statistical" | "custom";
export type Severity = "info" | "warning" | "error" | "critical";

export interface ValidationRule {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  ruleType: RuleType;
  documentTypes: string[] | null;
  fieldName: string | null;
  ruleConfig: Record<string, unknown>;
  severity: Severity;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  passed: boolean;
  ruleName: string;
  ruleType: RuleType;
  fieldName?: string;
  message: string;
  severity: Severity;
  details?: Record<string, unknown>;
}

// Built-in validation rules
const BUILT_IN_RULES: Array<{
  name: string;
  description: string;
  ruleType: RuleType;
  documentTypes: string[] | null;
  fieldName: string | null;
  severity: Severity;
  validate: (data: Record<string, unknown>, documentType?: string) => ValidationResult | null;
}> = [
  {
    name: "Date Order Validation",
    description: "Due date must be after invoice date",
    ruleType: "cross_field",
    documentTypes: ["invoice"],
    fieldName: null,
    severity: "error",
    validate: (data) => {
      const invoiceDate = data.invoice_date || data.date;
      const dueDate = data.due_date;

      if (!invoiceDate || !dueDate) return null;

      const invoice = new Date(invoiceDate as string);
      const due = new Date(dueDate as string);

      if (due < invoice) {
        return {
          passed: false,
          ruleName: "Date Order Validation",
          ruleType: "cross_field",
          message: "Due date cannot be before invoice date",
          severity: "error",
          details: { invoiceDate, dueDate },
        };
      }
      return null;
    },
  },
  {
    name: "Line Items Total Validation",
    description: "Sum of line items should equal subtotal",
    ruleType: "cross_field",
    documentTypes: ["invoice", "receipt"],
    fieldName: null,
    severity: "warning",
    validate: (data) => {
      const lineItems = data.line_items as Array<{ amount?: number; quantity?: number; unit_price?: number }> | undefined;
      const subtotal = data.subtotal as number | undefined;

      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) return null;
      if (subtotal === undefined) return null;

      const calculatedTotal = lineItems.reduce((sum, item) => {
        if (item.amount) return sum + item.amount;
        if (item.quantity && item.unit_price) return sum + (item.quantity * item.unit_price);
        return sum;
      }, 0);

      const tolerance = 0.01 * subtotal; // 1% tolerance
      if (Math.abs(calculatedTotal - subtotal) > tolerance) {
        return {
          passed: false,
          ruleName: "Line Items Total Validation",
          ruleType: "cross_field",
          message: `Line items total (${calculatedTotal.toFixed(2)}) doesn't match subtotal (${subtotal.toFixed(2)})`,
          severity: "warning",
          details: { calculatedTotal, subtotal, difference: Math.abs(calculatedTotal - subtotal) },
        };
      }
      return null;
    },
  },
  {
    name: "Tax Calculation Validation",
    description: "Total should equal subtotal plus tax",
    ruleType: "cross_field",
    documentTypes: ["invoice", "receipt"],
    fieldName: null,
    severity: "warning",
    validate: (data) => {
      const subtotal = data.subtotal as number | undefined;
      const tax = data.tax as number | undefined;
      const total = data.total as number | undefined;

      if (subtotal === undefined || total === undefined) return null;

      const taxAmount = tax || 0;
      const expectedTotal = subtotal + taxAmount;
      const tolerance = 0.01 * total; // 1% tolerance

      if (Math.abs(expectedTotal - total) > tolerance) {
        return {
          passed: false,
          ruleName: "Tax Calculation Validation",
          ruleType: "cross_field",
          message: `Total (${total.toFixed(2)}) doesn't match subtotal + tax (${expectedTotal.toFixed(2)})`,
          severity: "warning",
          details: { subtotal, tax: taxAmount, expectedTotal, actualTotal: total },
        };
      }
      return null;
    },
  },
  {
    name: "Email Format Validation",
    description: "Email addresses must be in valid format",
    ruleType: "format",
    documentTypes: null,
    fieldName: "email",
    severity: "warning",
    validate: (data) => {
      const email = data.email as string | undefined;
      if (!email) return null;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          passed: false,
          ruleName: "Email Format Validation",
          ruleType: "format",
          fieldName: "email",
          message: `Invalid email format: ${email}`,
          severity: "warning",
          details: { email },
        };
      }
      return null;
    },
  },
  {
    name: "Positive Amount Validation",
    description: "Amounts must be positive",
    ruleType: "range",
    documentTypes: null,
    fieldName: null,
    severity: "error",
    validate: (data) => {
      const amountFields = ["total", "subtotal", "amount", "tax"];
      for (const field of amountFields) {
        const value = data[field] as number | undefined;
        if (value !== undefined && value < 0) {
          return {
            passed: false,
            ruleName: "Positive Amount Validation",
            ruleType: "range",
            fieldName: field,
            message: `${field} cannot be negative: ${value}`,
            severity: "error",
            details: { field, value },
          };
        }
      }
      return null;
    },
  },
  {
    name: "Future Date Warning",
    description: "Dates in the far future may indicate errors",
    ruleType: "range",
    documentTypes: null,
    fieldName: null,
    severity: "info",
    validate: (data) => {
      const dateFields = ["invoice_date", "date", "transaction_date"];
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      for (const field of dateFields) {
        const value = data[field] as string | undefined;
        if (value) {
          const date = new Date(value);
          if (date > oneYearFromNow) {
            return {
              passed: false,
              ruleName: "Future Date Warning",
              ruleType: "range",
              fieldName: field,
              message: `${field} is more than one year in the future`,
              severity: "info",
              details: { field, value },
            };
          }
        }
      }
      return null;
    },
  },
];

/**
 * Run cross-field and format validations on extracted data
 */
export async function runValidation(
  documentId: string,
  extractedData: Record<string, unknown>,
  documentType?: string
): Promise<{
  success: boolean;
  results: ValidationResult[];
  passedCount: number;
  failedCount: number;
  error?: string;
}> {
  const results: ValidationResult[] = [];

  // Run built-in rules
  for (const rule of BUILT_IN_RULES) {
    // Check if rule applies to this document type
    if (rule.documentTypes && documentType && !rule.documentTypes.includes(documentType)) {
      continue;
    }

    const result = rule.validate(extractedData, documentType);
    if (result) {
      results.push(result);
    }
  }

  // Get custom validation rules from database
  const supabase = await createClient();

  const { data: customRules, error } = await supabase
    .from("validation_rules")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch custom validation rules:", error);
  }

  // Run custom rules
  if (customRules) {
    for (const rule of customRules) {
      // Check document type filter
      if (rule.document_types && documentType && !rule.document_types.includes(documentType)) {
        continue;
      }

      const config = rule.rule_config as Record<string, unknown>;
      const result = runCustomRule(rule.rule_type as RuleType, rule.name, rule.field_name, config, extractedData, rule.severity as Severity);
      if (result) {
        results.push(result);
      }
    }
  }

  const failedCount = results.filter(r => !r.passed).length;
  const passedCount = results.length - failedCount;

  return {
    success: true,
    results,
    passedCount,
    failedCount,
  };
}

/**
 * Run a custom validation rule
 */
function runCustomRule(
  ruleType: RuleType,
  ruleName: string,
  fieldName: string | null,
  config: Record<string, unknown>,
  data: Record<string, unknown>,
  severity: Severity
): ValidationResult | null {
  switch (ruleType) {
    case "range": {
      if (!fieldName) return null;
      const value = data[fieldName] as number | undefined;
      if (value === undefined) return null;

      const min = config.min as number | undefined;
      const max = config.max as number | undefined;

      if (min !== undefined && value < min) {
        return {
          passed: false,
          ruleName,
          ruleType,
          fieldName,
          message: `${fieldName} (${value}) is below minimum (${min})`,
          severity,
          details: { value, min, max },
        };
      }
      if (max !== undefined && value > max) {
        return {
          passed: false,
          ruleName,
          ruleType,
          fieldName,
          message: `${fieldName} (${value}) exceeds maximum (${max})`,
          severity,
          details: { value, min, max },
        };
      }
      return null;
    }

    case "format": {
      if (!fieldName) return null;
      const value = data[fieldName] as string | undefined;
      if (!value) return null;

      const pattern = config.pattern as string | undefined;
      if (!pattern) return null;

      // Limit pattern length to prevent ReDoS attacks
      if (pattern.length > 500) {
        console.warn(`Regex pattern too long for rule ${ruleName}, skipping`);
        return null;
      }

      // Wrap regex in try-catch to handle invalid patterns
      let regex: RegExp;
      try {
        regex = new RegExp(pattern);
      } catch {
        console.error(`Invalid regex pattern for rule ${ruleName}`);
        return null;
      }

      // Set a timeout for regex execution to prevent ReDoS
      const timeoutMs = 100;
      const startTime = Date.now();
      let matched = false;
      try {
        matched = regex.test(value.substring(0, 10000)); // Limit input length
        if (Date.now() - startTime > timeoutMs) {
          console.warn(`Regex execution took too long for rule ${ruleName}`);
        }
      } catch {
        console.error(`Regex execution failed for rule ${ruleName}`);
        return null;
      }

      if (!matched) {
        return {
          passed: false,
          ruleName,
          ruleType,
          fieldName,
          message: `${fieldName} doesn't match expected format`,
          severity,
          details: { value, pattern },
        };
      }
      return null;
    }

    case "comparison": {
      const field1 = config.field1 as string | undefined;
      const field2 = config.field2 as string | undefined;
      const operator = config.operator as string | undefined;

      if (!field1 || !field2 || !operator) return null;

      const value1 = data[field1] as number | string | undefined;
      const value2 = data[field2] as number | string | undefined;

      if (value1 === undefined || value2 === undefined) return null;

      let passed = false;
      switch (operator) {
        case "eq": passed = value1 === value2; break;
        case "ne": passed = value1 !== value2; break;
        case "gt": passed = value1 > value2; break;
        case "gte": passed = value1 >= value2; break;
        case "lt": passed = value1 < value2; break;
        case "lte": passed = value1 <= value2; break;
      }

      if (!passed) {
        return {
          passed: false,
          ruleName,
          ruleType,
          message: `Comparison failed: ${field1} (${value1}) ${operator} ${field2} (${value2})`,
          severity,
          details: { field1, value1, field2, value2, operator },
        };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Create a custom validation rule
 */
export async function createValidationRule(
  input: {
    name: string;
    description?: string;
    ruleType: RuleType;
    documentTypes?: string[];
    fieldName?: string;
    ruleConfig: Record<string, unknown>;
    severity?: Severity;
  }
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return { success: false, error: "No organization found" };
  }

  const { data, error } = await supabase
    .from("validation_rules")
    .insert({
      organization_id: userData.organization_id,
      name: input.name,
      description: input.description,
      rule_type: input.ruleType,
      document_types: input.documentTypes,
      field_name: input.fieldName,
      rule_config: input.ruleConfig as Json,
      severity: input.severity || "warning",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, ruleId: data.id };
}

/**
 * Get validation rules for the organization
 */
export async function getValidationRules(): Promise<{
  success: boolean;
  rules?: ValidationRule[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("validation_rules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    rules: data?.map(r => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      description: r.description,
      ruleType: r.rule_type as RuleType,
      documentTypes: r.document_types,
      fieldName: r.field_name,
      ruleConfig: r.rule_config as Record<string, unknown>,
      severity: (r.severity || "warning") as Severity,
      isActive: r.is_active ?? true,
      createdAt: r.created_at || "",
      updatedAt: r.updated_at || "",
    })),
  };
}

/**
 * Toggle validation rule active status
 */
export async function toggleValidationRule(
  ruleId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("validation_rules")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", ruleId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a validation rule
 */
export async function deleteValidationRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("validation_rules")
    .delete()
    .eq("id", ruleId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
