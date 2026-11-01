import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { computeRequestHmac, computeBodyHash } from "./plugins/proxy-auth.js";
import crypto from "crypto";

describe("UMEED Fastify Backend & Proxy Authentication Suite", () => {
  let app: FastifyInstance;
  const TEST_SECRET = "test-umeed-hmac-signing-secret-32bytes-min";

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    process.env.UMEED_PROXY_SIGNING_SECRET = TEST_SECRET;
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves public liveness healthcheck without proxy signature", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    // In test environment without DB, health should return 503 in production mode
    expect([200, 503]).toContain(response.statusCode);
    const body = response.json();
    expect(body.application).toBe("UMEED_BACKEND");
    expect(body.region).toBe("bom");
  });

  it("strictly fails closed on /ready when persistent DB is disconnected", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/ready",
    });

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body.status).toBe("NOT_READY");
    expect(body.reason).toContain("Mandatory persistent database storage is unavailable.");
  });

  it("rejects unauthenticated requests to /v1 endpoints missing proxy HMAC signature", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/facilities",
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe("UNAUTHORIZED_PROXY_REQUEST");
  });

  it("rejects proxy request with expired timestamp", async () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago
    const nonce = crypto.randomUUID();
    const bodyHash = computeBodyHash("");
    const signature = computeRequestHmac(TEST_SECRET, "GET", "/v1/facilities", String(expiredTimestamp), nonce, bodyHash);

    const response = await app.inject({
      method: "GET",
      url: "/v1/facilities",
      headers: {
        "x-umeed-signature": signature,
        "x-umeed-timestamp": String(expiredTimestamp),
        "x-umeed-nonce": nonce,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe("EXPIRED_PROXY_SIGNATURE");
  });

  it("rejects proxy request with replayed nonce", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = `nonce-${crypto.randomUUID()}`;
    const bodyHash = computeBodyHash("");
    const signature = computeRequestHmac(TEST_SECRET, "GET", "/v1/facilities", String(timestamp), nonce, bodyHash);

    // First request
    const first = await app.inject({
      method: "GET",
      url: "/v1/facilities",
      headers: {
        "x-umeed-signature": signature,
        "x-umeed-timestamp": String(timestamp),
        "x-umeed-nonce": nonce,
      },
    });
    // First request passes proxy auth (then hits handler)
    expect(first.statusCode).not.toBe(401);

    // Replay with identical nonce
    const replay = await app.inject({
      method: "GET",
      url: "/v1/facilities",
      headers: {
        "x-umeed-signature": signature,
        "x-umeed-timestamp": String(timestamp),
        "x-umeed-nonce": nonce,
      },
    });

    expect(replay.statusCode).toBe(401);
    const body = replay.json();
    expect(body.error.code).toBe("REPLAYED_PROXY_NONCE");
  });

  it("rejects proxy request with invalid/tampered body hash", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const fakeBodyHash = crypto.createHash("sha256").update("tampered").digest("hex");
    const signature = computeRequestHmac(TEST_SECRET, "POST", "/v1/incidents/ingest", String(timestamp), nonce, fakeBodyHash);

    const response = await app.inject({
      method: "POST",
      url: "/v1/incidents/ingest",
      headers: {
        "x-umeed-signature": signature,
        "x-umeed-timestamp": String(timestamp),
        "x-umeed-nonce": nonce,
        "content-type": "application/json",
      },
      payload: { different: "body" },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe("INVALID_PROXY_SIGNATURE");
  });
});

