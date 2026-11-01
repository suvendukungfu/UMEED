import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend } from "./backend-proxy";

/**
 * Universal Route Proxy Helper
 * If UMEED_BACKEND_URL is configured, immediately forwards the request to the Fastify backend.
 * If not configured, returns null so the local handler can run or fail closed safely.
 */
export async function tryForwardToBackend(
  request: NextRequest,
  backendPath?: string
): Promise<NextResponse | null> {
  if (!process.env.UMEED_BACKEND_URL) {
    return null;
  }

  const url = new URL(request.url);
  // Default path translation: /api/* -> /v1/*
  const targetPath = backendPath || url.pathname.replace(/^\/api/, "/v1");
  return forwardToBackend(request, targetPath);
}
