import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static serviceUnavailable(message = "Service unavailable") {
    return new ApiError(503, "SERVICE_UNAVAILABLE", message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, "INTERNAL_SERVER_ERROR", message);
  }
}

export interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

/**
 * Formats any caught exception into a clean, safe JSON response.
 * Prevents raw internal database connection strings or stack traces from reaching clients.
 */
export function formatErrorResponse(error: unknown): NextResponse<ErrorResponseBody> {
  const timestamp = new Date().toISOString();

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request payload failed schema validation",
          details: error.flatten(),
          timestamp,
        },
      },
      { status: 400 }
    );
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected internal error occurred."
      : error instanceof Error
      ? error.message
      : "Unknown error";

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message,
        timestamp,
      },
    },
    { status: 500 }
  );
}

