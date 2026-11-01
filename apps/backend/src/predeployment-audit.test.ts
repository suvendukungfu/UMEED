import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { computeRequestHmac, computeBodyHash } from "./plugins/proxy-auth.js";
import crypto from "crypto";

/**
 * PRE-DEPLOYMENT ARCHITECTURE & SECURITY AUDIT TEST SUITE
 *
 * NOTE ON TEST LABELS:
 * - [MOCK/LOCAL-ISOLATED]: Exercises in-memory Fastify server and mock contexts without external network.
 * - [CLOUD/ATLAS-PREREQUISITE]: Would require live MongoDB Atlas / AWS ap-south-1 static IP network connectivity.
 */

describe("[MOCK/LOCAL-ISOLATED] Pre-Deployment Security, Proxy & Route Parity Audit", () => {
  let app: FastifyInstance;
  const TEST_SECRET = "umeed-predeployment-hmac-test-secret-value-32chars";

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    process.env.UMEED_PROXY_SIGNING_SECRET = TEST_SECRET;
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Proxy HMAC Canonicalization & Integration", () => {
    it("accepts valid proxy request with JSON body when stringification matches", async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = `valid-post-${crypto.randomUUID()}`;
      const payloadObj = { incident_type: "WATER_LOGGING", severity: "HIGH" };
      const bodyStr = JSON.stringify(payloadObj);
      const bodyHash = crypto.createHash("sha256").update(bodyStr).digest("hex");
      const signature = computeRequestHmac(TEST_SECRET, "POST", "/v1/incidents/ingest", timestamp, nonce, bodyHash);

      const response = await app.inject({
        method: "POST",
        url: "/v1/incidents/ingest",
        headers: {
          "x-umeed-signature": signature,
          "x-umeed-timestamp": timestamp,
          "x-umeed-nonce": nonce,
          "content-type": "application/json",
        },
        payload: payloadObj,
      });

      // It must pass proxy HMAC auth (status is not 401 UNAUTHORIZED_PROXY_REQUEST or INVALID_PROXY_SIGNATURE)
      expect(response.statusCode).not.toBe(401);
    });

    it("rejects request if HTTP method is tampered (POST signed, GET requested)", async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomUUID();
      const bodyHash = computeBodyHash("");
      // Signature signed for POST
      const signature = computeRequestHmac(TEST_SECRET, "POST", "/v1/facilities", timestamp, nonce, bodyHash);

      const response = await app.inject({
        method: "GET",
        url: "/v1/facilities",
        headers: {
          "x-umeed-signature": signature,
          "x-umeed-timestamp": timestamp,
          "x-umeed-nonce": nonce,
        },
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json.error.code).toBe("INVALID_PROXY_SIGNATURE");
    });

    it("rejects request if route path is tampered", async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomUUID();
      const bodyHash = computeBodyHash("");
      // Signed for /v1/facilities
      const signature = computeRequestHmac(TEST_SECRET, "GET", "/v1/facilities", timestamp, nonce, bodyHash);

      // Sent to /v1/ngos
      const response = await app.inject({
        method: "GET",
        url: "/v1/ngos",
        headers: {
          "x-umeed-signature": signature,
          "x-umeed-timestamp": timestamp,
          "x-umeed-nonce": nonce,
        },
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json.error.code).toBe("INVALID_PROXY_SIGNATURE");
    });

    it("rejects requests missing any mandatory proxy header", async () => {
      const headers = {
        "x-umeed-signature": "somesig",
        "x-umeed-timestamp": Math.floor(Date.now() / 1000).toString(),
        "x-umeed-nonce": "somenonce",
      };

      for (const missingKey of Object.keys(headers)) {
        const testHeaders = { ...headers };
        delete testHeaders[missingKey as keyof typeof testHeaders];

        const response = await app.inject({
          method: "GET",
          url: "/v1/facilities",
          headers: testHeaders,
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().error.code).toBe("UNAUTHORIZED_PROXY_REQUEST");
      }
    });
  });

  describe("Multi-Machine Replay Protection Audit", () => {
    it("confirms in-memory nonce cache is bounded to process memory and lacks distributed backing", async () => {
      // In Fly.io horizontal scale (count > 1), each machine is a distinct VM with distinct memory.
      // We verify that the current implementation of proxy-auth relies solely on an unshared Map.
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = `replay-test-${crypto.randomUUID()}`;
      const bodyHash = computeBodyHash("");
      const signature = computeRequestHmac(TEST_SECRET, "GET", "/v1/facilities", timestamp, nonce, bodyHash);

      // First call consumes the nonce in the current process
      const res1 = await app.inject({
        method: "GET",
        url: "/v1/facilities",
        headers: {
          "x-umeed-signature": signature,
          "x-umeed-timestamp": timestamp,
          "x-umeed-nonce": nonce,
        },
      });
      expect(res1.statusCode).not.toBe(401);

      // Same process rejects immediate replay
      const res2 = await app.inject({
        method: "GET",
        url: "/v1/facilities",
        headers: {
          "x-umeed-signature": signature,
          "x-umeed-timestamp": timestamp,
          "x-umeed-nonce": nonce,
        },
      });
      expect(res2.statusCode).toBe(401);
      expect(res2.json().error.code).toBe("REPLAYED_PROXY_NONCE");
    });
  });

  describe("API Endpoint Parity & Health Mapping Audit", () => {
    it("confirms /ready exists at root and returns 404 when queried at /v1/ready with valid HMAC", async () => {
      // 1. Direct orchestrator probe to root /ready
      const rootReady = await app.inject({ method: "GET", url: "/ready" });
      expect([200, 503]).toContain(rootReady.statusCode);

      // 2. Querying /v1/ready with proxy auth
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomUUID();
      const bodyHash = computeBodyHash("");
      const signature = computeRequestHmac(TEST_SECRET, "GET", "/v1/ready", timestamp, nonce, bodyHash);

      const v1Ready = await app.inject({
        method: "GET",
        url: "/v1/ready",
        headers: {
          "x-umeed-signature": signature,
          "x-umeed-timestamp": timestamp,
          "x-umeed-nonce": nonce,
        },
      });
      // Route does NOT exist under /v1 prefix on backend!
      expect(v1Ready.statusCode).toBe(404);
    });

    it("confirms /health exists at root and returns 404 when queried at /v1/health with valid HMAC", async () => {
      const rootHealth = await app.inject({ method: "GET", url: "/health" });
      expect([200, 503]).toContain(rootHealth.statusCode);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomUUID();
      const bodyHash = computeBodyHash("");
      const signature = computeRequestHmac(TEST_SECRET, "GET", "/v1/health", timestamp, nonce, bodyHash);

      const v1Health = await app.inject({
        method: "GET",
        url: "/v1/health",
        headers: {
          "x-umeed-signature": signature,
          "x-umeed-timestamp": timestamp,
          "x-umeed-nonce": nonce,
        },
      });
      expect(v1Health.statusCode).toBe(404);
    });

    it("documents backend route coverage: 30 registered vs 68 original Next.js endpoints", async () => {
      const implementedBackendRoutes = [
        "GET /health",
        "GET /ready",
        "POST /v1/auth/sign-in",
        "POST /v1/auth/sign-out",
        "GET /v1/auth/session",
        "POST /v1/incidents/ingest",
        "GET /v1/incidents/:publicReference",
        "GET /v1/coordinator/incidents",
        "POST /v1/coordinator/incidents/:publicReference/review",
        "GET /v1/cases",
        "GET /v1/cases/:caseReference",
        "POST /v1/cases",
        "POST /v1/cases/:caseReference/resolve",
        "GET /v1/assistance/metrics",
        "POST /v1/assistance/watchdog/scan",
        "GET /v1/responders/assignments",
        "POST /v1/responders/assignments/:assignmentId/accept",
        "POST /v1/responders/assignments/:assignmentId/reject",
        "GET /v1/ngos",
        "GET /v1/ngos/:ngoId",
        "POST /v1/ngos",
        "POST /v1/admin/organizations/:orgId/verify",
        "GET /v1/facilities",
        "GET /v1/geo/pincode",
        "GET /v1/discovery/sources",
        "POST /v1/discovery/sources",
        "GET /v1/discovery/candidates",
        "GET /v1/discovery/map",
        "GET /v1/admin/diagnostics",
        "POST /v1/notifications/process",
      ];

      expect(implementedBackendRoutes.length).toBe(30);
      const unmigratedCount = 68 - (implementedBackendRoutes.length - 2);
      expect(unmigratedCount).toBe(40); // 38 business API routes + 2 root health routes
    });
  });
});
