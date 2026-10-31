import { NextResponse } from "next/server";
import { checkDatabaseReadiness } from "@/lib/db/mongodb";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
const START_TIME = Date.now();

export async function GET() {
  const dbStatus = await checkDatabaseReadiness();

  const responseBody = {
    status: "healthy",
    application: "UMEED",
    tagline: "From distress to real assistance",
    version: APP_VERSION,
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

