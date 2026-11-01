import fastify, { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifySensible from "@fastify/sensible";

import { verifyProxyAuth } from "./plugins/proxy-auth.js";
import { healthRoutes } from "./health/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { incidentRoutes } from "./modules/incidents/routes.js";
import { caseRoutes } from "./modules/cases/routes.js";
import { assistanceRoutes } from "./modules/assistance/routes.js";
import { responderRoutes } from "./modules/responders/routes.js";
import { ngoRoutes } from "./modules/ngos/routes.js";
import { facilityRoutes } from "./modules/facilities/routes.js";
import { discoveryRoutes } from "./modules/discovery/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { aiRoutes } from "./modules/ai/routes.js";
import { contextLearningRoutes } from "./modules/context-learning/routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            remoteAddress: req.ip,
          };
        },
      },
    },
    trustProxy: true,
  });

  // Core Plugins
  await app.register(fastifySensible);
  await app.register(fastifyCookie);
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow requests without Origin header (e.g. server-to-server BFF proxy, health probes)
      if (!origin) return cb(null, true);
      const allowedOrigins = [
        "https://umeed-platform-nu.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ];
      if (
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return cb(null, true);
      }
      return cb(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  });

  // Raw Body Capture for exact bit-for-bit HMAC verification
  app.addContentTypeParser(
    ["application/json", "text/plain", "application/x-www-form-urlencoded"],
    { parseAs: "buffer" },
    (req, body, done) => {
      (req as unknown as { rawBody: Buffer | string }).rawBody = body;
      try {
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/json") && body.length > 0) {
          const json = JSON.parse(body.toString("utf8"));
          done(null, json);
        } else {
          done(null, body);
        }
      } catch (err: unknown) {
        done(err as Error, undefined);
      }
    }
  );

  // Global Error Handler conforming to UMEED contracts
  app.setErrorHandler((error: unknown, _request, reply) => {
    const err = error as { statusCode?: number; code?: string; message?: string };
    app.log.error(error);
    const statusCode = err.statusCode || 500;
    return reply.status(statusCode).send({
      error: {
        code: err.code || "INTERNAL_SERVER_ERROR",
        message: err.message || "An unexpected error occurred.",
        status: statusCode,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Health and Readiness (Bypasses proxy authentication for direct orchestrator health probes)
  await app.register(healthRoutes);

  // Authenticated Proxy Hook for operational /v1/* endpoints
  app.addHook("preHandler", async (request, reply) => {
    // Only enforce proxy auth on /v1 routes
    if (request.url.startsWith("/v1")) {
      const isAllowed = await verifyProxyAuth(request, reply);
      if (!isAllowed) {
        // Response already sent by verifyProxyAuth
        return;
      }
    }
  });

  // Register Operational Feature Modules
  await app.register(authRoutes);
  await app.register(incidentRoutes);
  await app.register(caseRoutes);
  await app.register(assistanceRoutes);
  await app.register(responderRoutes);
  await app.register(ngoRoutes);
  await app.register(facilityRoutes);
  await app.register(discoveryRoutes);
  await app.register(notificationRoutes);
  await app.register(adminRoutes);
  await app.register(aiRoutes);
  await app.register(contextLearningRoutes);

  return app;
}
