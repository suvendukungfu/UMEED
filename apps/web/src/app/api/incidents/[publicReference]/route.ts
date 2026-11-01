import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { IncidentService } from "@/features/incidents/services/incident.service";
import {
  extractClientIp,
  extractTrackingToken,
  verifyCoordinatorAuth,
} from "@/lib/security/authorization";
import { trackingRateLimiter } from "@/lib/security/rate-limit";
import {
  sanitizeIncidentForPublic,
  sanitizeIncidentForCoordinator,
} from "@/features/incidents/services/privacy.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicReference: string }> }
) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  let resolvedRef = "";
  try {
    const { publicReference } = await params;
    resolvedRef = publicReference;
    const clientIp = extractClientIp(request);

    // 1. Rate Limiting Protection (Brute-Force Defense: Max 10 attempts/min)
    const rateCheck = trackingRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many tracking verification attempts. Please retry shortly.",
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

    const service = new IncidentService();

    // 2. Check for Coordinator Privileges
    const coordAuth = verifyCoordinatorAuth(request);
    if (coordAuth.authorized) {
      const incident = await service.getByPublicReference(publicReference);
      if (!incident) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Incident ${publicReference} not found`,
              status: 404,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }
      return NextResponse.json({
        status: "success",
        data: sanitizeIncidentForCoordinator(incident),
      });
    }

    // 3. Citizen Tracking Authorization
    // Security Invariant: Query string tokens (?token=...) are strictly disallowed.
    const trackingToken = extractTrackingToken(request);
    if (!trackingToken) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Confidential tracking credential required (Authorization: Bearer <token> or X-Tracking-Token header required).",
            status: 401,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Authenticate citizen tracking token against stored SHA-256 hash in constant time
    const incident = await service.authenticateTrackingAccess(publicReference, trackingToken);

    // Anti-Enumeration: Return generic 404 whether reference is invalid or token is incorrect
    if (!incident) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Incident not found or invalid tracking credential.",
            status: 404,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Return Sanitized Public View (Exact GPS & EXIF completely redacted)
    return NextResponse.json({
      status: "success",
      data: sanitizeIncidentForPublic(incident),
    });
  } catch (err) {
    const errorMsg = (err as Error).message || "";
    if (
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("Server selection timed out") ||
      errorMsg.includes("MongoDB client is unavailable") ||
      errorMsg.includes("MongoDB is not configured") ||
      errorMsg.includes("Production environment requires a configured") ||
      errorMsg.includes("Fallback to in-memory repository is strictly prohibited") ||
      errorMsg.includes("SSL alert number 80") ||
      errorMsg.includes("alert internal error")
    ) {
      const { getServerEnv } = await import("@/lib/config/env");
      const allowFallback = process.env.ALLOW_INMEMORY_FALLBACK === "true" || getServerEnv().ALLOW_INMEMORY_FALLBACK === true;
      if (allowFallback) {
        try {
          const { InMemoryIncidentRepository, getIncidentRepository } = await import("@/features/incidents/repositories");
          const fallbackRepo = getIncidentRepository(new InMemoryIncidentRepository());
          const fallbackService = new IncidentService(fallbackRepo);
          const trackingToken = extractTrackingToken(request);
          if (trackingToken && resolvedRef) {
            const incident = await fallbackService.authenticateTrackingAccess(resolvedRef, trackingToken);
            if (incident) {
              return NextResponse.json({
                status: "success",
                data: sanitizeIncidentForPublic(incident),
              });
            }
          }
        } catch {
          // fall through to error response
        }
      }
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: (err as Error).message || "Failed to retrieve incident",
          status: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
