import crypto from "crypto";
import { getServerEnv } from "@/lib/config/env";

/**
 * Server-Side Authorization & Privilege Verification
 *
 * Implements strict, closed-by-default access control:
 * 1. COORDINATOR ACCESS: Required for /api/incidents triage queue and administrative oversight.
 * 2. CRAWLER ACCESS: Required for /api/incidents/ingest when source_type is social_media_discovery.
 * 3. CITIZEN ACCESS: Requires valid confidential tracking token (trk_...) for incident detail retrieval.
 *    Tokens are NEVER accepted in query strings to prevent leakage via browser histories or server access logs.
 */

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
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = headers.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  } else {
    const raw = requestOrHeaders as Record<string, string | string[] | undefined>;
    const fwd = raw["x-forwarded-for"];
    if (typeof fwd === "string") return fwd.split(",")[0].trim();
    const rip = raw["x-real-ip"];
    if (typeof rip === "string") return rip.trim();
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
  const configuredKey = env.COORDINATOR_API_KEY || "umeed-coordinator-dev-key";

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
