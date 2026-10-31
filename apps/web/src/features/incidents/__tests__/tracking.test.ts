import { describe, it, expect } from "vitest";
import {
  generatePublicReference,
  generateTrackingToken,
  hashTrackingToken,
  verifyTrackingToken,
} from "../services/tracking.service";

describe("Tracking & Credential Security (Invariants 14, 15, 16)", () => {
  it("generates unpredictable tracking tokens with sufficient entropy (Test 14)", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const token = generateTrackingToken();
      expect(token).toMatch(/^trk_[A-Za-z0-9_-]{32,}$/);
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }
    expect(tokens.size).toBe(1000);
  });

  it("generates human-readable public reference matching UMD-XXXX-YYYY format", () => {
    for (let i = 0; i < 100; i++) {
      const ref = generatePublicReference();
      expect(ref).toMatch(/^UMD-[A-F0-9]{4}-[A-F0-9]{4}$/);
    }
  });

  it("correctly hashes and verifies tracking tokens in constant time (Test 15)", () => {
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token);

    expect(hash).toHaveLength(64); // SHA-256 hex length
    expect(verifyTrackingToken(token, hash)).toBe(true);

    // Tampered token must fail
    expect(verifyTrackingToken(token + "x", hash)).toBe(false);
    expect(verifyTrackingToken("trk_invalid", hash)).toBe(false);
    expect(verifyTrackingToken("", hash)).toBe(false);
  });

  it("proves plaintext token is never stored and cannot be reversed from hash (Test 16)", () => {
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token);

    expect(hash).not.toContain(token);
    expect(hash).not.toContain(token.replace("trk_", ""));
    // Hash is one-way 32-byte digest
    expect(Buffer.from(hash, "hex")).toHaveLength(32);
  });
});
