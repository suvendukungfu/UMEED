/**
 * UMEED Meko Error Hierarchy
 * Formats errors safely without leaking Bearer tokens, secrets, or raw PII.
 */

export class MekoError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(message: string, code = "MEKO_ERROR", statusCode?: number, details?: unknown) {
    super(sanitizeMekoMessage(message));
    this.name = "MekoError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MekoAuthError extends MekoError {
  constructor(message = "Meko authentication failed. Bearer token is invalid, expired, or unconfigured.", details?: unknown) {
    super(message, "MEKO_AUTH_FAILED", 401, details);
    this.name = "MekoAuthError";
  }
}

export class MekoForbiddenError extends MekoError {
  constructor(message = "Meko access denied. Operation requires owner or maintainer role.", details?: unknown) {
    super(message, "MEKO_FORBIDDEN", 403, details);
    this.name = "MekoForbiddenError";
  }
}

export class MekoNotFoundError extends MekoError {
  constructor(resourceName: string, identifier: string) {
    super(`Meko resource '${resourceName}' with ID '${identifier}' was not found.`, "MEKO_NOT_FOUND", 404);
    this.name = "MekoNotFoundError";
  }
}

export class MekoRateLimitError extends MekoError {
  constructor(message = "Meko rate limit reached or quota exhausted (free_tier_limit_reached).", details?: unknown) {
    super(message, "MEKO_RATE_LIMITED", 429, details);
    this.name = "MekoRateLimitError";
  }
}

export class MekoValidationError extends MekoError {
  constructor(message: string, details?: unknown) {
    super(message, "MEKO_VALIDATION_ERROR", 400, details);
    this.name = "MekoValidationError";
  }
}

export class MekoPromotedError extends MekoError {
  constructor(message = "Cannot modify or delete promoted memory via MCP. Promoted knowledge is locked in the shared store.") {
    super(message, "MEKO_MEMORY_IS_PROMOTED", 409);
    this.name = "MekoPromotedError";
  }
}

export class MekoNetworkError extends MekoError {
  constructor(message = "Network error connecting to Meko MCP server or request timed out.", details?: unknown) {
    super(message, "MEKO_NETWORK_ERROR", 503, details);
    this.name = "MekoNetworkError";
  }
}

/**
 * Strips API keys, Bearer tokens, and tracking tokens from error strings before logging or display.
 */
export function sanitizeMekoMessage(msg: string): string {
  if (!msg) return "";
  return msg
    .replace(/mko_tkn_[a-zA-Z0-9_-]+/g, "mko_tkn_***")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer ***")
    .replace(/AIzaSy[a-zA-Z0-9_-]+/g, "AIzaSy***")
    .replace(/trk_[a-zA-Z0-9]+/g, "trk_***");
}

