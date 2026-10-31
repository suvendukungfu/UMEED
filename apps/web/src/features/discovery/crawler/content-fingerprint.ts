import crypto from "node:crypto";

const STRIP_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "_ga",
  "ref",
  "source",
  "mc_cid",
  "mc_eid",
]);

/**
 * Normalizes a URL to a stable canonical format for deduplication.
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());

    // Protocol & Hostname lowercased
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    // Default port stripped
    let port = parsed.port;
    if ((protocol === "http:" && port === "80") || (protocol === "https:" && port === "443")) {
      port = "";
    }

    // Pathname normalized (strip trailing slash unless root)
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    // Search params cleaned and sorted
    const cleanedParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

    for (const key of sortedKeys) {
      if (!STRIP_QUERY_PARAMS.has(key.toLowerCase())) {
        const values = parsed.searchParams.getAll(key);
        for (const val of values) {
          cleanedParams.append(key, val);
        }
      }
    }

    const search = cleanedParams.toString() ? `?${cleanedParams.toString()}` : "";
    const portStr = port ? `:${port}` : "";

    return `${protocol}//${hostname}${portStr}${pathname}${search}`;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Computes a SHA-256 fingerprint for text or HTML content.
 */
export function computeContentHash(content: string): string {
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

