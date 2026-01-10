// Smart Automation - Phase 4 Services
// Provides ML-based anomaly detection, validation, auto-approval, and learning loop

// Anomaly Detection
export {
  type AnomalyType,
  type AnomalyDetection,
  type StatisticalContext,
  getOrganizationAISettings,
  updateOrganizationAISettings,
  detectAmountOutlier,
  resolveAnomaly,
  getUnresolvedAnomalies,
  runAnomalyDetection,
} from "./anomaly-detection";

// Validation
export {
  type RuleType,
  type Severity,
  type ValidationRule,
  type ValidationResult,
  runValidation,
  createValidationRule,
  getValidationRules,
  toggleValidationRule,
  deleteValidationRule,
} from "./validation";

// Auto-Approval
export {
  type AutoApprovalResult,
  checkAutoApproval,
  autoApproveDocument,
  processAutoApproval,
} from "./auto-approval";

// Learning Loop
export {
  type LearningLoopStatus,
  checkRetrainTrigger,
  recordDocumentApproval,
  recordDocumentRejection,
  recordFlagMetrics,
} from "./learning-loop";

// Accuracy Monitoring
export {
  type AccuracyMetrics,
  type AccuracyDashboard,
  getAccuracyMetrics,
  getAccuracyDashboard,
  getDocumentTypeAccuracy,
} from "./accuracy-monitoring";
