import crypto from "crypto";

/**
 * Tracking & Reference Credential Service
 *
 * Implements security requirements:
 * 1. public_reference: Human-readable, non-secret token (e.g. UMD-7B29-4K12).
 * 2. tracking_token: High-entropy secret credential (>128 bits of entropy).
 * 3. Never stores plaintext tracking token; stores SHA-256 hash only.
 * 4. Constant-time verification using crypto.timingSafeEqual().
 */

/**
 * Generate a human-readable public reference code in UMD-XXXX-YYYY format.
 */
export function generatePublicReference(): string {
  const bytes = crypto.randomBytes(4).toString("hex").toUpperCase();
  const part1 = bytes.slice(0, 4);
  const part2 = bytes.slice(4, 8);
  return `UMD-${part1}-${part2}`;
}

/**
 * Generate a cryptographically secure tracking token with at least 128 bits of entropy.
 * 24 random bytes provides 192 bits of entropy.
 */
export function generateTrackingToken(): string {
  const entropy = crypto.randomBytes(24).toString("base64url");
  return `trk_${entropy}`;
}

/**
 * Generate SHA-256 cryptographic hash of the tracking token.
 */
export function hashTrackingToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a plaintext tracking token against a stored SHA-256 hash using constant-time comparison.
 */
export function verifyTrackingToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) {
    return false;
  }
  const computedHash = hashTrackingToken(token);
  const bufA = Buffer.from(computedHash, "hex");
  const bufB = Buffer.from(storedHash, "hex");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
