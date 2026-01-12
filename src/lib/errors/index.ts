// Centralized Error Handling
export {
  type ErrorCategory,
  type ProcessingError,
  type RetryConfig,
  categorizeError,
  calculateRetryDelay,
  withRetry,
  withTimeout,
  formatErrorForUser,
  logProcessingError,
} from "./document-processing";

// Alert Service
export {
  alertOnProcessingError,
  createSystemAlert,
  dismissSystemAlert,
} from "./alert-service";
