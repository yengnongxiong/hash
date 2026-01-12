import { getOrganizationAISettings } from "@/lib/smart-automation/anomaly-detection";

/**
 * Flag detection configuration
 * These constants can be adjusted to change flag detection behavior
 */

// Type definition for flag thresholds
export interface FlagThresholds {
  PAST_DUE_CRITICAL: number;
  PAST_DUE_WARNING: number;
  HIGH_AMOUNT_WARNING: number;
  HIGH_AMOUNT_CRITICAL: number;
  ROUND_NUMBER_MIN: number;
  CONTRACT_EXPIRATION_WARNING: number;
  MISSING_FIELDS_WARNING: number;
}

// Default thresholds for flag detection (fallback when DB settings unavailable)
export const FLAG_THRESHOLDS: FlagThresholds = {
  // Past due thresholds (in days)
  PAST_DUE_CRITICAL: 30, // Days overdue before critical
  PAST_DUE_WARNING: 7, // Days overdue before warning

  // Amount thresholds
  HIGH_AMOUNT_WARNING: 100000, // Amount that triggers warning
  HIGH_AMOUNT_CRITICAL: 500000, // Amount that triggers critical

  // Round number threshold
  ROUND_NUMBER_MIN: 1000, // Minimum amount for round number check

  // Contract expiration
  CONTRACT_EXPIRATION_WARNING: 30, // Days before expiration to warn

  // Missing fields severity threshold
  MISSING_FIELDS_WARNING: 2, // Number of missing fields for warning vs info
};

/**
 * Fetch flag thresholds from organization settings (database-driven)
 * Falls back to default FLAG_THRESHOLDS if settings unavailable
 */
export async function getFlagThresholds(organizationId: string): Promise<FlagThresholds> {
  const result = await getOrganizationAISettings(organizationId);

  if (!result.success || !result.settings) {
    return FLAG_THRESHOLDS;
  }

  return {
    PAST_DUE_CRITICAL: result.settings.pastDueCriticalDays,
    PAST_DUE_WARNING: result.settings.pastDueWarningDays,
    HIGH_AMOUNT_WARNING: result.settings.highAmountWarning,
    HIGH_AMOUNT_CRITICAL: result.settings.highAmountCritical,
    ROUND_NUMBER_MIN: FLAG_THRESHOLDS.ROUND_NUMBER_MIN, // Keep default
    CONTRACT_EXPIRATION_WARNING: result.settings.contractExpirationWarningDays,
    MISSING_FIELDS_WARNING: FLAG_THRESHOLDS.MISSING_FIELDS_WARNING, // Keep default
  };
}

// Detection methods must match database check constraint: rule, ml, validation
export type DetectionMethod = "rule" | "ml" | "validation";
