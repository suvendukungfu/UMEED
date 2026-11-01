import { FastifyInstance } from "fastify";
import { checkDatabaseReadiness } from "../../plugins/database.js";
import { requireCoordinator } from "../../plugins/auth.js";
import { getBackendEnv } from "../../config/env.js";

const APP_VERSION = "1.0.0";
const START_TIME = Date.now();

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/v1/admin/diagnostics", { preHandler: requireCoordinator }, async (request, reply) => {
    const env = getBackendEnv();
    const dbStatus = await checkDatabaseReadiness();

    return reply.status(200).send({
      status: dbStatus.connected ? "operational" : "degraded",
      application: "UMEED_BACKEND",
      version: APP_VERSION,
      environment: {
        mode: env.NODE_ENV,
        region: env.FLY_REGION,
        storage_type: "mongodb_atlas",
      },
      uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      caller: {
        userId: request.user?.userId || "coordinator",
        role: request.activeRole || "COORDINATOR",
      },
      services: {
        database: {
          engine: "mongodb",
          configured: dbStatus.configured,
          connected: dbStatus.connected,
          database: dbStatus.database,
          diagnostic_code: dbStatus.diagnosticCode,
          latency_ms: dbStatus.latencyMs,
        },
        ai_triage: {
          provider: "Google Gemini",
          configured: Boolean(env.GEMINI_API_KEY),
          model: "gemini-2.5-flash",
        },
      },
    });
  });
}

