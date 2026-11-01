import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "./app.js";
import { FastifyInstance } from "fastify";
import crypto from "crypto";

describe("Distributed Security & Replay & Tenancy Verification", () => {
  let app: FastifyInstance;
  const testSecret = "test_signing_secret_at_least_32_bytes_long_123456789";

  beforeAll(async () => {
    process.env.UMEED_PROXY_SIGNING_SECRET = testSecret;
    process.env.NODE_ENV = "test";
    app = await buildApp();
    await app.ready();
  });

  function signRequest(method: string, path: string, body: Buffer | string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID();
    const bodyHash = crypto.createHash("sha256").update(Buffer.isBuffer(body) ? body : Buffer.from(body)).digest("hex");
    const payload = `${method.toUpperCase()}:${path}:${timestamp}:${nonce}:${bodyHash}`;
    const signature = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

    return {
      "x-umeed-signature": signature,
      "x-umeed-timestamp": timestamp,
      "x-umeed-nonce": nonce,
    };
  }

  it("verifies exact raw body HMAC with UTF-8 multibyte hindi characters", async () => {
    const rawHindiJson = Buffer.from(JSON.stringify({
      source_type: "CITIZEN",
      source_reference: "web_test",
      reported_at: new Date().toISOString(),
      incident_type: "SHELTER_FOOD",
      subject_type: "INDIVIDUAL",
      description: "नमस्ते, हमें कश्मीरी गेट पर भोजन और आश्रय की तत्काल आवश्यकता है।",
      location: { district: "North Delhi", confidence: 0.9 },
      severity: { level: "HIGH", confidence: 0.9 },
      freshness: { is_stale: false, confidence: 1.0 },
      missing_information: [],
      requires_human_review: false,
      evidence: [],
    }), "utf8");

    const headers = signRequest("POST", "/v1/incidents/ingest", rawHindiJson);

    const res = await app.inject({
      method: "POST",
      url: "/v1/incidents/ingest",
      headers: {
        ...headers,
        "content-type": "application/json",
      },
      payload: rawHindiJson,
    });

    // In test environment without Mongo, either it accepts or gives DB connection error (500/503), but NOT 401 signature error
    expect(res.statusCode).not.toBe(401);
  });

  it("rejects replayed nonce immediately with 401", async () => {
    const nonce = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = "";
    const bodyHash = crypto.createHash("sha256").update("").digest("hex");
    const payload = `GET:/v1/discovery/map:${timestamp}:${nonce}:${bodyHash}`;
    const signature = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

    const reqHeaders = {
      "x-umeed-signature": signature,
      "x-umeed-timestamp": timestamp,
      "x-umeed-nonce": nonce,
    };

    // First call
    const res1 = await app.inject({
      method: "GET",
      url: "/v1/discovery/map",
      headers: reqHeaders,
    });
    expect([200, 500, 503]).toContain(res1.statusCode);

    // Second call with identical nonce (Replay Attack)
    const res2 = await app.inject({
      method: "GET",
      url: "/v1/discovery/map",
      headers: reqHeaders,
    });
    expect(res2.statusCode).toBe(401);
    const json = JSON.parse(res2.body);
    expect(json.error.code).toBe("REPLAYED_PROXY_NONCE");
  });

  it("enforces multi-tenant isolation on cases: non-coordinator without ngoId is rejected", async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID();
    const bodyHash = crypto.createHash("sha256").update("").digest("hex");
    const payload = `GET:/v1/cases:${timestamp}:${nonce}:${bodyHash}`;
    const signature = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

    // Authenticated request without session or coordinator header
    const res = await app.inject({
      method: "GET",
      url: "/v1/cases",
      headers: {
        "x-umeed-signature": signature,
        "x-umeed-timestamp": timestamp,
        "x-umeed-nonce": nonce,
      },
    });

    // Should require authorization
    expect([401, 403]).toContain(res.statusCode);
  });
});
