import { NextRequest, NextResponse } from "next/server";
import { IncidentService } from "@/features/incidents/services/incident.service";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";
import { extractClientIp } from "@/lib/security/authorization";
import { ingestionRateLimiter } from "@/lib/security/rate-limit";
import { getServerEnv } from "@/lib/config/env";
import { isMongoConfigured } from "@/lib/db/mongodb";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB limit

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if dedicated Fly.io Mumbai backend is configured
    if (process.env.UMEED_BACKEND_URL) {
      const { forwardToBackend } = await import("@/lib/proxy/backend-proxy");
      return forwardToBackend(request, "/v1/incidents/ingest");
    }

    // 0. Fail-Closed Production Storage Guard:
    // In production, distress intake is strictly disabled without verified MongoDB persistence.
    const env = getServerEnv();
    if (env.NODE_ENV === "production" && !isMongoConfigured(env.MONGODB_URI)) {
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database service is unavailable. The distress report could not be permanently persisted. Distress reporting intake is temporarily unavailable while durable database connectivity is being restored.",
            status: 503,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 503 }
      );
    }

    // 1. Rate Limiting Protection (Intake Flooding Defense)
    const clientIp = extractClientIp(request);
    const rateCheck = ingestionRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many ingestion requests. Please retry shortly.",
            status: 429,
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateCheck.resetTimeMs / 1000).toString(),
          },
        }
      );
    }

    // 1. Enforce Content-Type
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be application/json",
            status: 415,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 415 }
      );
    }

    // 2. Enforce Request Size Limit
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request payload exceeds 1MB limit",
            status: 413,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 413 }
      );
    }

    // 3. Parse JSON Body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Malformed JSON in request body",
            status: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // 4. Delegate to Incident Service
    const service = new IncidentService();
    const result = await service.ingestIncident(rawBody, request.headers);

    const durationMs = Date.now() - startTime;
    logger.info("Incident ingestion API handler completed", "API", {
      public_reference: result.public_reference,
      is_duplicate: result.is_duplicate,
      duration_ms: durationMs,
    });

    // 5. Structure Response
    if (result.is_duplicate) {
      // Idempotent replay: return 200 OK without re-issuing tracking token
      return NextResponse.json(
        {
          status: "success",
          message: "Incident already recorded (idempotent replay)",
          data: {
            public_reference: result.public_reference,
            status: result.incident.status,
            source_type: result.incident.source_type,
            source_reference: result.incident.source_reference,
            incident_type: result.incident.incident_type,
            subject_type: result.incident.subject_type,
            is_duplicate: true,
            is_suspected_duplicate: result.incident.is_suspected_duplicate,
            suspected_duplicate_candidates: result.duplicate_candidates,
            requires_human_review: result.incident.requires_human_review,
            reported_at: result.incident.reported_at,
            created_at: result.incident.created_at,
          },
        },
        { status: 200 }
      );
    }

    // New incident: return 201 Created with tracking token (returned only once)
    const responsePayload = {
      status: "success",
      message: "Incident reported successfully",
      data: {
        public_reference: result.public_reference,
        tracking_token: result.tracking_token, // Provided ONLY ONCE at creation
        status: result.incident.status,
        source_type: result.incident.source_type,
        source_reference: result.incident.source_reference,
        incident_type: result.incident.incident_type,
        subject_type: result.incident.subject_type,
        is_duplicate: false,
        is_suspected_duplicate: result.is_suspected_duplicate,
        suspected_duplicate_candidates: result.duplicate_candidates,
        requires_human_review: result.incident.requires_human_review,
        reported_at: result.incident.reported_at,
        created_at: result.incident.created_at,
      },
    };

    return NextResponse.json(responsePayload, {
      status: 201,
      headers: {
        Location: `/api/incidents/${result.public_reference}`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            status: err.statusCode,
            details: err.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: err.statusCode }
      );
    }

    // Check for database persistence or connectivity failures (Fail-Closed)
    const errorMsg = (err as Error).message || "";
    if (
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("Server selection timed out") ||
      errorMsg.includes("MongoDB client is unavailable") ||
      errorMsg.includes("MongoDB is not configured") ||
      errorMsg.includes("Production environment requires a configured") ||
      errorMsg.includes("Fallback to in-memory repository is strictly prohibited")
    ) {
      logger.error("Database persistence failure during ingestion", err, "INGESTION_API");
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database service is unavailable. The distress report could not be permanently persisted.",
            status: 503,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 503 }
      );
    }

    logger.error("Unexpected error in incident ingestion API", err, "INGESTION_API");

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while processing the incident",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
