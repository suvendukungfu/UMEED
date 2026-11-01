import { NextRequest, NextResponse } from "next/server";
import { checkDatabaseReadiness, isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";

/**
 * Application Readiness Endpoint
 *
 * Verifies all mandatory services for enabled production workflows are operational.
 * If UMEED_BACKEND_URL is configured (Fly.io architecture), delegates readiness probe to backend.
 * Returns 503 SERVICE_UNAVAILABLE if persistent storage is disconnected in production.
 */
export async function GET(request: NextRequest) {
  const backendUrl = process.env.UMEED_BACKEND_URL;

  // 1. If backend URL is set, delegate readiness check to the dedicated Mumbai backend
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/ready`, {
        cache: "no-store",
        headers: { "user-agent": "umeed-vercel-bff-probe" },
      });
      const data = await res.json();
      return NextResponse.json(data, {
        status: res.status,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    } catch (err) {
      return NextResponse.json(
        {
          status: "NOT_READY",
          reason: "Dedicated Mumbai backend is unreachable from Vercel proxy.",
          error: err instanceof Error ? err.message : String(err),
          region: process.env.VERCEL_REGION || "bom1",
          timestamp: new Date().toISOString(),
        },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
  }

  // 2. Direct Vercel evaluation
  const env = getServerEnv();
  const dbStatus = await checkDatabaseReadiness();
  const isProd = env.NODE_ENV === "production";

  const allowFallback = process.env.ALLOW_INMEMORY_FALLBACK === "true" || env.ALLOW_INMEMORY_FALLBACK === true;
  const isReady = isProd
    ? (dbStatus.connected && isMongoConfigured(env.MONGODB_URI)) || allowFallback
    : true;

  if (!isReady) {
    return NextResponse.json(
      {
        status: "NOT_READY",
        reason: "Mandatory persistent database storage is unavailable.",
        diagnostic_code: dbStatus.diagnosticCode || "CLUSTER_UNAVAILABLE",
        diagnostic_summary: dbStatus.error || "Unable to reach database",
        region: dbStatus.region || process.env.VERCEL_REGION || "unknown",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }

  return NextResponse.json(
    {
      status: "READY",
      storage: isMongoConfigured(env.MONGODB_URI) ? "persistent_mongodb" : "in_memory_ephemeral",
      region: dbStatus.region || process.env.VERCEL_REGION || "unknown",
      latency_ms: dbStatus.latencyMs,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
