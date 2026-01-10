/**
 * Document Processing Error Handling
 * Provides centralized error handling, retry logic, and user-friendly messages
 */

export type ErrorCategory =
  | "network" // Transient network issues
  | "timeout" // Processing took too long
  | "rate_limit" // API rate limiting
  | "invalid_document" // Document can't be processed
  | "ocr_failed" // OCR extraction failed
  | "extraction_failed" // Data extraction failed
  | "validation_failed" // Document validation failed
  | "storage_failed" // File storage issues
  | "authentication" // Auth issues
  | "unknown"; // Unknown errors

export interface ProcessingError {
  category: ErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  retryAfterMs?: number;
  details?: Record<string, unknown>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Categorize an error based on its characteristics
 */
export function categorizeError(error: unknown): ProcessingError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name;

    // Network errors
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      name === "TypeError"
    ) {
      return {
        category: "network",
        code: "NETWORK_ERROR",
        message: error.message,
        userMessage: "Unable to connect to the processing service. Please check your connection and try again.",
        isRetryable: true,
        retryAfterMs: 5000,
      };
    }

    // Timeout errors
    if (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("aborted")
    ) {
      return {
        category: "timeout",
        code: "TIMEOUT_ERROR",
        message: error.message,
        userMessage: "Document processing took too long. The document may be too large or complex. Please try again.",
        isRetryable: true,
        retryAfterMs: 10000,
      };
    }

    // Rate limiting
    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("429")
    ) {
      return {
        category: "rate_limit",
        code: "RATE_LIMIT_ERROR",
        message: error.message,
        userMessage: "Processing service is busy. Please wait a moment and try again.",
        isRetryable: true,
        retryAfterMs: 60000,
      };
    }

    // OCR-specific errors
    if (
      message.includes("ocr") ||
      message.includes("text extraction") ||
      message.includes("cannot read document")
    ) {
      return {
        category: "ocr_failed",
        code: "OCR_FAILED",
        message: error.message,
        userMessage: "Unable to read text from this document. Please ensure the document is clear and try again.",
        isRetryable: true,
        retryAfterMs: 5000,
      };
    }

    // Invalid document
    if (
      message.includes("invalid") ||
      message.includes("unsupported format") ||
      message.includes("corrupt")
    ) {
      return {
        category: "invalid_document",
        code: "INVALID_DOCUMENT",
        message: error.message,
        userMessage: "This document format is not supported or the file may be corrupted. Please try a different file.",
        isRetryable: false,
      };
    }

    // Storage errors
    if (
      message.includes("storage") ||
      message.includes("upload failed") ||
      message.includes("bucket")
    ) {
      return {
        category: "storage_failed",
        code: "STORAGE_ERROR",
        message: error.message,
        userMessage: "Failed to save the document. Please try again.",
        isRetryable: true,
        retryAfterMs: 5000,
      };
    }

    // Authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("authentication") ||
      message.includes("401") ||
      message.includes("403")
    ) {
      return {
        category: "authentication",
        code: "AUTH_ERROR",
        message: error.message,
        userMessage: "Your session has expired. Please sign in again.",
        isRetryable: false,
      };
    }

    // API errors with status codes
    const statusMatch = message.match(/(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      if (status >= 500) {
        return {
          category: "network",
          code: `API_ERROR_${status}`,
          message: error.message,
          userMessage: "The processing service is temporarily unavailable. Please try again in a few minutes.",
          isRetryable: true,
          retryAfterMs: 30000,
        };
      }
    }
  }

  // Unknown error
  return {
    category: "unknown",
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : String(error),
    userMessage: "An unexpected error occurred. Please try again or contact support if the issue persists.",
    isRetryable: true,
    retryAfterMs: 5000,
  };
}

/**
 * Calculate delay for retry with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.round(delay + jitter);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<{ success: true; data: T } | { success: false; error: ProcessingError; attempts: number }> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: ProcessingError | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      lastError = categorizeError(error);

      // Don't retry if error is not retryable
      if (!lastError.isRetryable) {
        return { success: false, error: lastError, attempts: attempt + 1 };
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= retryConfig.maxRetries) {
        break;
      }

      // Wait before retrying
      const delay = lastError.retryAfterMs ?? calculateRetryDelay(attempt, retryConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError || {
      category: "unknown",
      code: "RETRY_EXHAUSTED",
      message: "All retry attempts failed",
      userMessage: "Unable to process the document after multiple attempts. Please try again later.",
      isRetryable: false,
    },
    attempts: retryConfig.maxRetries + 1,
  };
}

/**
 * Create a timeout wrapper for async operations
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName: string = "operation"
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Format error for display to user
 */
export function formatErrorForUser(error: ProcessingError): {
  title: string;
  message: string;
  action?: string;
} {
  switch (error.category) {
    case "network":
      return {
        title: "Connection Error",
        message: error.userMessage,
        action: "Check your internet connection and try again.",
      };
    case "timeout":
      return {
        title: "Processing Timeout",
        message: error.userMessage,
        action: "Try uploading a smaller file or wait a few minutes.",
      };
    case "rate_limit":
      return {
        title: "Service Busy",
        message: error.userMessage,
        action: "Please wait a moment before trying again.",
      };
    case "invalid_document":
      return {
        title: "Invalid Document",
        message: error.userMessage,
        action: "Try uploading a different file format (PDF, PNG, JPG).",
      };
    case "ocr_failed":
      return {
        title: "Text Extraction Failed",
        message: error.userMessage,
        action: "Ensure the document is clear and not too blurry.",
      };
    case "authentication":
      return {
        title: "Session Expired",
        message: error.userMessage,
        action: "Please sign in again to continue.",
      };
    case "storage_failed":
      return {
        title: "Upload Failed",
        message: error.userMessage,
        action: "Try again or contact support.",
      };
    default:
      return {
        title: "Error",
        message: error.userMessage,
        action: "Please try again or contact support.",
      };
  }
}

/**
 * Log error for debugging (server-side only)
 */
export function logProcessingError(
  error: ProcessingError,
  context: {
    documentId?: string;
    userId?: string;
    organizationId?: string;
    operation?: string;
  }
): void {
  console.error("[Document Processing Error]", {
    ...error,
    context,
    timestamp: new Date().toISOString(),
  });
}
