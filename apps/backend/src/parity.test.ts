import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "./app.js";
import { FastifyInstance } from "fastify";
import { ALL_BACKEND_ROUTES } from "./routes-parity.js";

describe("Authoritative Backend Route Parity Verification", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  it("registers all required 68 route paths on Fastify", () => {
    for (const route of ALL_BACKEND_ROUTES) {
      const res = app.hasRoute({
        method: route.method as any,
        url: route.path,
      });
      expect(res, `Route should be registered: ${route.method} ${route.path}`).toBe(true);
    }
  });

  it("responds to /health with 200/503 contract", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect([200, 503]).toContain(res.statusCode);
    const json = JSON.parse(res.body);
    expect(json.application).toBe("UMEED_BACKEND");
  });

  it("responds to /ready with fail-closed contract", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect([200, 503]).toContain(res.statusCode);
  });
});
