/**
 * Flag detection configuration
 * These constants can be adjusted to change flag detection behavior
 */

// Configurable thresholds for flag detection
export const FLAG_THRESHOLDS = {
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
} as const;

export type DetectionMethod = "rule_based" | "ml_model" | "pattern_match" | "manual";
