/**
 * Confidence utilities for document processing
 * These are regular functions (not server actions)
 */

// Confidence thresholds for routing
export const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 0.95, // Auto-approve if overall confidence >= 95%
  QUICK_REVIEW: 0.85, // Quick review if 85-95%
  STANDARD_REVIEW: 0.70, // Standard review if 70-85%
  DETAILED_REVIEW: 0.0, // Detailed review if < 70%
} as const;

// Map confidence to review priority
export function getReviewPriority(overallConfidence: number): "quick" | "standard" | "detailed" {
  if (overallConfidence >= CONFIDENCE_THRESHOLDS.QUICK_REVIEW) {
    return "quick";
  } else if (overallConfidence >= CONFIDENCE_THRESHOLDS.STANDARD_REVIEW) {
    return "standard";
  }
  return "detailed";
}

// Calculate numerical confidence from string level
export function confidenceLevelToNumber(level: "high" | "medium" | "low"): number {
  switch (level) {
    case "high":
      return 0.95;
    case "medium":
      return 0.75;
    case "low":
      return 0.5;
    default:
      return 0.5;
  }
}
