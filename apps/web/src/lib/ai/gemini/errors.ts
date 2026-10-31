/**
 * Typed Error Hierarchy for Google Gemini Multimodal Operations.
 */

export class GeminiError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, code: string = "GEMINI_ERROR", retryable: boolean = false) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.retryable = retryable;
  }
}

export class GeminiConfigError extends GeminiError {
  constructor(message: string = "Gemini API key is not configured or uses placeholder credentials.") {
    super(message, "GEMINI_CONFIG_ERROR", false);
    this.name = "GeminiConfigError";
  }
}

export class GeminiQuotaError extends GeminiError {
  constructor(message: string = "Gemini API quota or rate limit exceeded. Please retry shortly.") {
    super(message, "GEMINI_QUOTA_ERROR", true);
    this.name = "GeminiQuotaError";
  }
}

export class GeminiUnavailableError extends GeminiError {
  constructor(message: string = "Gemini AI service is temporarily unavailable.") {
    super(message, "GEMINI_UNAVAILABLE_ERROR", true);
    this.name = "GeminiUnavailableError";
  }
}

export class GeminiValidationError extends GeminiError {
  public readonly issues: unknown[];

  constructor(message: string, issues: unknown[] = []) {
    super(message, "GEMINI_VALIDATION_ERROR", false);
    this.name = "GeminiValidationError";
    this.issues = issues;
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(message: string = "Gemini API request timed out.") {
    super(message, "GEMINI_TIMEOUT_ERROR", true);
    this.name = "GeminiTimeoutError";
  }
}
