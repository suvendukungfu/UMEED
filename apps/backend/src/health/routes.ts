import { FastifyInstance } from "fastify";
import { checkDatabaseReadiness } from "../plugins/database.js";
import { getBackendEnv } from "../config/env.js";

const APP_VERSION = "1.0.0";
const START_TIME = Date.now();

export async function healthRoutes(fastify: FastifyInstance) {
  // Liveness Probe
  fastify.get("/health", async (_request, reply) => {
    const env = getBackendEnv();
    const dbStatus = await checkDatabaseReadiness();
    const isProd = env.NODE_ENV === "production";
    const isHealthy = isProd ? dbStatus.connected : true;

    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? "healthy" : "unhealthy",
      application: "UMEED_BACKEND",
      version: APP_VERSION,
      database: dbStatus.connected ? "connected" : "disconnected",
      region: env.FLY_REGION,
      uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness Probe (Strict Fail-Closed)
  fastify.get("/ready", async (_request, reply) => {
    const env = getBackendEnv();
    const dbStatus = await checkDatabaseReadiness();
    const isProd = env.NODE_ENV === "production";
    const isReady = isProd ? dbStatus.connected : true;

    if (!isReady) {
      return reply.status(503).send({
        status: "NOT_READY",
        reason: "Mandatory persistent database storage is unavailable.",
        diagnostic_code: dbStatus.diagnosticCode || "CLUSTER_UNAVAILABLE",
        diagnostic_summary: dbStatus.error || "Unable to reach database",
        region: env.FLY_REGION,
        timestamp: new Date().toISOString(),
      });
    }

    return reply.status(200).send({
      status: "READY",
      storage: "persistent_mongodb",
      region: env.FLY_REGION,
      database: dbStatus.database,
      latency_ms: dbStatus.latencyMs,
      timestamp: new Date().toISOString(),
    });
  });
}

