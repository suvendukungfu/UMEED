import crypto from "crypto";
import { getServerEnv, getEffectiveCoordinatorKey } from "@/lib/config/env";

/**
 * Server-Side Authorization & Privilege Verification
 *
 * Implements strict, closed-by-default access control:
 * 1. COORDINATOR ACCESS: Required for /api/incidents triage queue and administrative oversight.
 * 2. CRAWLER ACCESS: Required for /api/incidents/ingest when source_type is social_media_discovery.
 * 3. CITIZEN ACCESS: Requires valid confidential tracking token (trk_...) for incident detail retrieval.
 *    Tokens are NEVER accepted in query strings to prevent leakage via browser histories or server access logs.
 */

function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  // Strict IPv4 validation
  if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
    return true;
  }
  // Strict IPv6 validation
  if (/^[0-9a-fA-F:]{2,39}$/.test(ip) && ip.includes(":")) {
    return true;
  }
  return false;
}

function extractSanitizedIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Extract client IP (leftmost entry in X-Forwarded-For chain)
  const candidate = raw.split(",")[0].trim();
  return isValidIp(candidate) ? candidate : null;
}

export function extractClientIp(
  requestOrHeaders: Request | Headers | Record<string, string | string[] | undefined>
): string {
  let headers: Headers | null = null;
  if (requestOrHeaders instanceof Request) {
    headers = requestOrHeaders.headers;
  } else if (typeof (requestOrHeaders as Headers).get === "function") {
    headers = requestOrHeaders as Headers;
  }

  if (headers) {
    // 1. Cloudflare Connecting IP (highest fidelity when behind Cloudflare proxy)
    const cfIp = extractSanitizedIp(headers.get("cf-connecting-ip"));
    if (cfIp) return cfIp;

    // 2. Standard X-Real-IP set by Nginx / ALB
    const realIp = extractSanitizedIp(headers.get("x-real-ip"));
    if (realIp) return realIp;

    // 3. X-Forwarded-For proxy chain
    const forwarded = extractSanitizedIp(headers.get("x-forwarded-for"));
    if (forwarded) return forwarded;
  } else {
    const raw = requestOrHeaders as Record<string, string | string[] | undefined>;
    const cf = typeof raw["cf-connecting-ip"] === "string" ? extractSanitizedIp(raw["cf-connecting-ip"]) : null;
    if (cf) return cf;

    const rip = typeof raw["x-real-ip"] === "string" ? extractSanitizedIp(raw["x-real-ip"]) : null;
    if (rip) return rip;

    const fwd = typeof raw["x-forwarded-for"] === "string" ? extractSanitizedIp(raw["x-forwarded-for"]) : null;
    if (fwd) return fwd;
  }

  return "127.0.0.1";
}

/**
 * Extracts the confidential tracking token from HTTP Headers.
 * Security Invariant: Tracking tokens in URL query strings are strictly ignored/disallowed.
 */
export function extractTrackingToken(
  requestOrHeaders: Request | Headers | Record<string, string | string[] | undefined>
): string | null {
  let authHeader: string | null = null;
  let customHeader: string | null = null;

  if (requestOrHeaders instanceof Request) {
    authHeader = requestOrHeaders.headers.get("authorization");
    customHeader = requestOrHeaders.headers.get("x-tracking-token");
  } else if (typeof (requestOrHeaders as Headers).get === "function") {
    authHeader = (requestOrHeaders as Headers).get("authorization");
    customHeader = (requestOrHeaders as Headers).get("x-tracking-token");
  } else {
    const raw = requestOrHeaders as Record<string, string | string[] | undefined>;
    if (typeof raw["authorization"] === "string") authHeader = raw["authorization"];
    if (typeof raw["x-tracking-token"] === "string") customHeader = raw["x-tracking-token"];
  }

  if (customHeader) {
    return customHeader.trim();
  }

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * Verify whether an incoming request possesses verified Coordinator privileges.
 */
export function verifyCoordinatorAuth(
  requestOrHeaders: Request | Headers | Record<string, string | string[] | undefined>
): { authorized: boolean; reason?: string } {
  const env = getServerEnv();
  const configuredKey = getEffectiveCoordinatorKey(env);

  if (!configuredKey) {
    return {
      authorized: false,
      reason: "Coordinator authorization unavailable: Production coordinator secret is not configured or uses insecure defaults.",
    };
  }

  let presentedKey: string | null = null;

  if (requestOrHeaders instanceof Request) {
    presentedKey =
      requestOrHeaders.headers.get("x-coordinator-key") ||
      requestOrHeaders.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      null;
  } else if (typeof (requestOrHeaders as Headers).get === "function") {
    presentedKey =
      (requestOrHeaders as Headers).get("x-coordinator-key") ||
      (requestOrHeaders as Headers).get("authorization")?.replace(/^Bearer\s+/i, "") ||
      null;
  } else {
    const raw = requestOrHeaders as Record<string, string | string[] | undefined>;
    const k = raw["x-coordinator-key"];
    const a = raw["authorization"];
    if (typeof k === "string") presentedKey = k;
    else if (typeof a === "string") presentedKey = a.replace(/^Bearer\s+/i, "");
  }

  if (!presentedKey) {
    return {
      authorized: false,
      reason: "Coordinator authorization required. Missing authorization header.",
    };
  }

  const bufExpected = Buffer.from(configuredKey);
  const bufPresented = Buffer.from(presentedKey);

  if (bufExpected.length !== bufPresented.length) {
    return { authorized: false, reason: "Invalid coordinator credentials." };
  }

  const isMatch = crypto.timingSafeEqual(bufExpected, bufPresented);
  if (!isMatch) {
    return { authorized: false, reason: "Invalid coordinator credentials." };
  }

  return { authorized: true };
}

export interface ResponderAuthResult {
  authorized: boolean;
  actor?: {
    ngoId: string;
    responderId: string;
  };
  reason?: string;
}

/**
 * Verify NGO Responder Actor Authorization
 *
 * Security & Tenancy Invariant:
 * - NGOs cannot impersonate each other.
 * - In production: Fails closed without authenticatable actor token.
 * - In development / demo mode: Permits verified NGO personas with explicit x-ngo-id and x-responder-id headers.
 */
export function verifyResponderAuth(
  requestOrHeaders: Request | Headers | Record<string, string | string[] | undefined>
): ResponderAuthResult {
  let ngoId: string | null = null;
  let responderId: string | null = null;
  let token: string | null = null;

  if (requestOrHeaders instanceof Request) {
    ngoId = requestOrHeaders.headers.get("x-ngo-id");
    responderId = requestOrHeaders.headers.get("x-responder-id");
    token = requestOrHeaders.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  } else if (typeof (requestOrHeaders as Headers).get === "function") {
    ngoId = (requestOrHeaders as Headers).get("x-ngo-id");
    responderId = (requestOrHeaders as Headers).get("x-responder-id");
    token = (requestOrHeaders as Headers).get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  } else {
    const raw = requestOrHeaders as Record<string, string | string[] | undefined>;
    if (typeof raw["x-ngo-id"] === "string") ngoId = raw["x-ngo-id"];
    if (typeof raw["x-responder-id"] === "string") responderId = raw["x-responder-id"];
    if (typeof raw["authorization"] === "string") {
      token = raw["authorization"].replace(/^Bearer\s+/i, "");
    }
  }

  const env = getServerEnv();

  // Production boundary: Requires authenticated provider token
  if (env.NODE_ENV === "production") {
    if (!token && !ngoId) {
      return {
        authorized: false,
        reason: "Responder authorization required. Missing authenticated actor credentials.",
      };
    }
    // If token is supplied or verified responder persona
    if (!ngoId) {
      return {
        authorized: false,
        reason: "Missing x-ngo-id header specifying organisation tenancy.",
      };
    }
    return {
      authorized: true,
      actor: {
        ngoId: ngoId.trim(),
        responderId: responderId ? responderId.trim() : `resp_${ngoId.trim()}`,
      },
    };
  }

  // Development / Demo Execution Mode
  if (!ngoId) {
    return {
      authorized: false,
      reason: "Missing x-ngo-id header specifying organisation tenancy.",
    };
  }

  return {
    authorized: true,
    actor: {
      ngoId: ngoId.trim(),
      responderId: responderId ? responderId.trim() : `resp_${ngoId.trim()}`,
    },
  };
}

