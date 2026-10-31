import { NextResponse } from "next/server";
import { checkDatabaseReadiness, isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { isGeminiConfigured } from "@/lib/ai/gemini/client";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini/models";
import { MekoHttpClient } from "@/lib/ai/meko/client";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
const START_TIME = Date.now();

export async function GET() {
  const env = getServerEnv();
  const dbStatus = await checkDatabaseReadiness();
  const isDev = env.NODE_ENV === "development";
  const isTest = env.NODE_ENV === "test";
  const isProd = env.NODE_ENV === "production";
  const isInMemory = !isMongoConfigured(env.MONGODB_URI);

  // Meko Status (Safe non-destructive inspection)
  const mekoClient = new MekoHttpClient();
  const isMekoConfigured = mekoClient.isConfigured();

  // Gemini Status (Safe configuration check without expensive generation)
  const isAiConfigured = isGeminiConfigured();

  // Determine Overall Health State
  // Production requires persistent MongoDB Atlas; unconfigured/disconnected DB fails readiness.
  const isDatabaseUnhealthyInProd = isProd && !dbStatus.connected;
  const overallStatus = isDatabaseUnhealthyInProd
    ? "unhealthy"
    : isInMemory
    ? "healthy_demo_mode"
    : "healthy";

  const httpStatus = isDatabaseUnhealthyInProd ? 503 : 200;

  const responseBody = {
    status: overallStatus,
    application: "UMEED",
    tagline: "From distress to real assistance",
    version: APP_VERSION,
    environment: {
      node_env: env.NODE_ENV,
      mode: isProd ? "production" : isDev ? "development" : "test",
      storage_type: isInMemory ? "in_memory_ephemeral" : "mongodb_atlas",
      is_ephemeral_warning: isInMemory
        ? "Ephemeral in-memory storage active. Ingested incident reports will be lost on application restart."
        : undefined,
    },
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
    services: {
      core_engine: {
        status: "operational",
        readiness: "ready",
      },
      database: {
        engine: "mongodb",
        configured: dbStatus.configured,
        connected: dbStatus.connected,
        status: dbStatus.connected
          ? "operational"
          : dbStatus.configured
          ? "unavailable"
          : "unconfigured",
        storage_engine: isInMemory ? "InMemoryIncidentRepository (Development/Demo Only)" : "MongoIncidentRepository",
        database_name: dbStatus.databaseName,
        failover_policy: isProd ? "fail_closed_strict" : "ephemeral_demo_fallback",
        ...(dbStatus.error ? { error_diagnostic: dbStatus.error } : {}),
      },
      gemini_ai: {
        service: "Google Gemini Multimodal AI",
        configured: isAiConfigured,
        status: isAiConfigured ? "operational" : "unconfigured",
        primary_model: DEFAULT_GEMINI_MODEL,
        triage_mode: isAiConfigured ? "multimodal_automated" : "manual_coordinator_review",
      },
      meko_context: {
        service: "Meko Coordination Memory Layer (MCP)",
        configured: isMekoConfigured,
        status: isMekoConfigured ? "operational" : "unconfigured",
        product_datapack_configured: Boolean(mekoClient.productDatapackId),
        build_datapack_configured: Boolean(mekoClient.buildDatapackId),
        protocol: "Model Context Protocol (Streamable HTTP)",
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

