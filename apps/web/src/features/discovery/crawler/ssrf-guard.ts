import dns from "node:dns/promises";
import net from "node:net";

/**
 * UMEED SSRF & DNS Rebinding Protection Guard
 *
 * Enforces strict network isolation for all crawler fetch requests:
 * 1. Protocol: Only 'http:' and 'https:' allowed.
 * 2. Hostname: Rejects localhost, .local, .internal, cloud metadata names.
 * 3. IP Boundaries: Rejects loopback (127.0.0.0/8), private RFC 1918 (10.0.0.0/8,
 *    172.16.0.0/12, 192.168.0.0/16), link-local/cloud metadata (169.254.0.0/16),
 *    and IPv6 loopback/private (::1, fe80::, fc00::).
 * 4. DNS Rebinding: Resolves IP before connect and validates each resolved address.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
  "metadata",
]);

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  resolvedIp?: string;
}

/**
 * Checks if an IPv4 address is in private, loopback, or cloud metadata ranges.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed, fail closed
  }

  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (RFC 1918 Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (RFC 1918 Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-Local / AWS/GCP Metadata)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 198.18.0.0/15 (Benchmark testing)
  if (a === 198 && (b === 18 || b === 19)) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in loopback or unique local / link-local ranges.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
  // Unspecified
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
  // Link-local: fe80::/10
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  // Unique local address: fc00::/7 (fc00:: to fdff::)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.replace("::ffff:", "");
    if (net.isIPv4(v4)) {
      return isPrivateOrReservedIPv4(v4);
    }
    return true;
  }

  return false;
}

/**
 * Validates a candidate URL against SSRF and DNS rebinding risks.
 */
export async function validateCrawlerUrl(targetUrl: string): Promise<ValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { valid: false, reason: "Malformed URL syntax" };
  }

  // 1. Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: `Unapproved protocol: ${parsed.protocol}. Only http: and https: permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Blocked hostnames & suffixes
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { valid: false, reason: `Forbidden hostname: ${hostname}` };
  }

  // 3. Literal IP address checks
  if (net.isIPv4(hostname)) {
    if (isPrivateOrReservedIPv4(hostname)) {
      return { valid: false, reason: `Direct private or link-local IPv4 access forbidden: ${hostname}` };
    }
    return { valid: true, resolvedIp: hostname };
  }

  if (net.isIPv6(hostname)) {
    if (isPrivateOrReservedIPv6(hostname)) {
      return { valid: false, reason: `Direct private or loopback IPv6 access forbidden: ${hostname}` };
    }
    return { valid: true, resolvedIp: hostname };
  }

  // 4. DNS resolution validation (defends against DNS rebinding)
  try {
    const addresses = await dns.resolve(hostname);
    if (!addresses || addresses.length === 0) {
      return { valid: false, reason: `Could not resolve hostname: ${hostname}` };
    }

    for (const ip of addresses) {
      if (net.isIPv4(ip) && isPrivateOrReservedIPv4(ip)) {
        return { valid: false, reason: `DNS resolved to disallowed private IP: ${ip}` };
      }
      if (net.isIPv6(ip) && isPrivateOrReservedIPv6(ip)) {
        return { valid: false, reason: `DNS resolved to disallowed IPv6 address: ${ip}` };
      }
    }

    return { valid: true, resolvedIp: addresses[0] };
  } catch (err) {
    return { valid: false, reason: `DNS resolution failed: ${(err as Error).message}` };
  }
}
