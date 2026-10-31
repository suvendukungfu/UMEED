import { NextResponse } from "next/server";
import { checkDatabaseReadiness, isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
const START_TIME = Date.now();

export async function GET() {
  const env = getServerEnv();
  const dbStatus = await checkDatabaseReadiness();
  const isDev = env.NODE_ENV === "development";
  const isInMemory = !isMongoConfigured(env.MONGODB_URI);

  const responseBody = {
    status: "healthy",
    application: "UMEED",
    tagline: "From distress to real assistance",
    version: APP_VERSION,
    environment: {
      node_env: env.NODE_ENV,
      mode: isDev ? "development" : env.NODE_ENV,
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
      },
      database: {
        configured: dbStatus.configured,
        connected: dbStatus.connected,
        status: dbStatus.connected
          ? "connected"
          : dbStatus.configured
          ? "unreachable"
          : "unconfigured",
        storage_engine: isInMemory ? "InMemoryIncidentRepository (Development Only)" : "MongoIncidentRepository",
        ...(dbStatus.error ? { message: dbStatus.error } : {}),
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

