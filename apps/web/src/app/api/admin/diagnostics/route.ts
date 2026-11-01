import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { checkDatabaseReadiness, isMongoConfigured, verifyDatabaseConnectivity } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { isGeminiConfigured } from "@/lib/ai/gemini/client";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini/models";
import { MekoHttpClient } from "@/lib/ai/meko/client";
import { getNotificationAdapter } from "@/features/notifications/adapters";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
const START_TIME = Date.now();

/**
 * Restricted Administrative Diagnostics Endpoint
 *
 * Requirements:
 * - Requires verified Coordinator / Admin authorization.
 * - Distinguishes Network, TLS, Auth, and Configuration failures.
 * - Runs Phase 6 isolated healthcheck verification when connected.
 * - Never exposes credentials, API keys, connection strings, or internal database topology.
 */
export async function GET(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const auth = verifyCoordinatorAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: auth.reason || "Coordinator authorization required for administrative diagnostics.",
          status: 401,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 401 }
    );
  }

  const env = getServerEnv();
  const dbStatus = await checkDatabaseReadiness();
  const isProd = env.NODE_ENV === "production";
  const isInMemory = !isMongoConfigured(env.MONGODB_URI);
  const region = dbStatus.region || process.env.VERCEL_REGION || "local";

  const mekoClient = new MekoHttpClient();
  const isMekoConfigured = mekoClient.isConfigured();
  const isAiConfigured = isGeminiConfigured();
  const notificationAdapter = getNotificationAdapter();

  let connectivityVerification = null;
  if (dbStatus.connected) {
    connectivityVerification = await verifyDatabaseConnectivity();
  }

  const responseBody = {
    status: isProd && !dbStatus.connected ? "degraded" : "operational",
    application: "UMEED",
    version: APP_VERSION,
    environment: {
      mode: env.NODE_ENV,
      region,
      storage_type: isInMemory ? "in_memory_ephemeral" : "mongodb_atlas",
      failover_policy: isProd ? "fail_closed_strict" : "ephemeral_development_allowed",
    },
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
    caller: {
      coordinator_id: auth.coordinatorId || "authorized_operator",
      actor_type: auth.actorType || "service_integration",
    },
    services: {
      database: {
        engine: "mongodb",
        configured: dbStatus.configured,
        connected: dbStatus.connected,
        status: dbStatus.connected
          ? "connected"
          : dbStatus.configured
          ? "connection_failed"
          : "not_configured",
        diagnostic_code: dbStatus.diagnosticCode,
        error_summary: dbStatus.error,
        latency_ms: dbStatus.latencyMs,
        repository_mode: isInMemory ? "in_memory_fallback" : "persistent_atlas",
        connectivity_probe: connectivityVerification,
      },
      ai_triage: {
        provider: "Google Gemini",
        configured: isAiConfigured,
        status: isAiConfigured ? "operational" : "not_configured",
        model: DEFAULT_GEMINI_MODEL,
        mode: isAiConfigured ? "automated_multimodal" : "manual_coordinator_review",
      },
      coordination_memory: {
        provider: "Meko Coordination Layer",
        configured: isMekoConfigured,
        status: isMekoConfigured ? "operational" : "not_configured",
      },
      notifications: {
        channel: notificationAdapter.getChannelName(),
        is_mock: notificationAdapter.isMock(),
        status: notificationAdapter.isMock()
          ? "development_simulation"
          : "live_provider_active",
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
