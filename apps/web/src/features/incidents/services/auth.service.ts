import { getServerEnv, getEffectiveCrawlerKey } from "@/lib/config/env";
import crypto from "crypto";

/**
 * Service-to-Service Crawler Ingestion Authentication Service
 *
 * Enforces explicit separation between:
 * - Public Citizen Ingestion (rate-limited, open)
 * - Service-to-Service Discovery Crawler Ingestion (authenticated via API Key or Bearer token)
 */

export interface AuthCheckResult {
  authorized: boolean;
  reason?: string;
}

export function validateCrawlerAuthorization(
  headers: Headers | Record<string, string | string[] | undefined>
): AuthCheckResult {
  const env = getServerEnv();
  const configuredKey = getEffectiveCrawlerKey(env);

  if (!configuredKey) {
    return {
      authorized: false,
      reason: "Crawler authorization unavailable: Production crawler secret is not configured or uses insecure defaults.",
    };
  }

  // Extract key from X-Crawler-API-Key or Authorization header
  let presentedKey: string | null = null;

  if (typeof headers.get === "function") {
    // Web standard Headers object
    presentedKey =
      headers.get("x-crawler-api-key") ||
      headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      null;
  } else {
    // Record / Next.js headers object
    const rawHeaders = headers as Record<string, string | string[] | undefined>;
    const xKey = rawHeaders["x-crawler-api-key"];
    const auth = rawHeaders["authorization"];

    if (typeof xKey === "string") {
      presentedKey = xKey;
    } else if (typeof auth === "string") {
      presentedKey = auth.replace(/^Bearer\s+/i, "");
    }
  }

  if (!presentedKey) {
    return {
      authorized: false,
      reason: "Missing crawler authorization header (X-Crawler-API-Key or Bearer token required for social_media_discovery)",
    };
  }

  // Constant-time comparison
  const bufExpected = Buffer.from(configuredKey);
  const bufPresented = Buffer.from(presentedKey);

  if (bufExpected.length !== bufPresented.length) {
    return {
      authorized: false,
      reason: "Invalid crawler authorization credential",
    };
  }

  const isMatch = crypto.timingSafeEqual(bufExpected, bufPresented);
  if (!isMatch) {
    return {
      authorized: false,
      reason: "Invalid crawler authorization credential",
    };
  }

  return { authorized: true };
}
