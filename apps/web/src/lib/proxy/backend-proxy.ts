import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export interface ProxyOptions {
  stripPrefix?: string; // e.g. "/api" -> "/v1"
}

export function computeRequestHmac(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string
): string {
  const payload = `${method.toUpperCase()}:${path}:${timestamp}:${nonce}:${bodyHash}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function computeBodyHash(body: Buffer | string | null | undefined): string {
  if (!body || (Buffer.isBuffer(body) && body.length === 0) || body === "") {
    return crypto.createHash("sha256").update("").digest("hex");
  }
  if (Buffer.isBuffer(body)) {
    return crypto.createHash("sha256").update(body).digest("hex");
  }
  return crypto.createHash("sha256").update(Buffer.from(body, "utf8")).digest("hex");
}

/**
 * Server-Side Backend Proxy Helper
 * Forwards requests from Next.js server to Fly.io Fastify backend with exact raw-body HMAC authentication.
 */
export async function forwardToBackend(
  request: NextRequest,
  backendPath: string
): Promise<NextResponse> {
  const backendUrl = process.env.UMEED_BACKEND_URL;
  const proxySecret = process.env.UMEED_PROXY_SIGNING_SECRET;

  // If backend is not configured in environment, fail closed safely
  if (!backendUrl) {
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message: "UMEED Backend service origin is not configured in Vercel environment.",
          status: 503,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }

  const method = request.method;
  const url = new URL(request.url);
  const targetUrl = new URL(backendPath, backendUrl);
  targetUrl.search = url.search;

  // Extract raw body buffer for exact bit-for-bit preservation
  let rawBodyBuffer: Buffer = Buffer.alloc(0);
  if (method !== "GET" && method !== "HEAD") {
    try {
      const arrayBuf = await request.arrayBuffer();
      rawBodyBuffer = Buffer.from(arrayBuf);
    } catch {
      rawBodyBuffer = Buffer.alloc(0);
    }
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const bodyHash = computeBodyHash(rawBodyBuffer);

  // Canonical path includes query parameters identically to Fastify request.url
  const canonicalPath = targetUrl.pathname + targetUrl.search;

  const forwardHeaders = new Headers();
  // Copy relevant inbound headers
  const copyHeaders = [
    "content-type",
    "cookie",
    "authorization",
    "x-tracking-token",
    "x-coordinator-key",
    "x-service-key",
    "x-ngo-id",
    "x-responder-id",
    "user-agent",
    "accept",
  ];

  for (const h of copyHeaders) {
    const val = request.headers.get(h);
    if (val) forwardHeaders.set(h, val);
  }

  // Client IP tracking
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  forwardHeaders.set("x-umeed-client-ip", clientIp);

  // HMAC-SHA256 signature if secret is present
  if (proxySecret) {
    const signature = computeRequestHmac(proxySecret, method, canonicalPath, timestamp, nonce, bodyHash);
    forwardHeaders.set("x-umeed-signature", signature);
    forwardHeaders.set("x-umeed-timestamp", timestamp);
    forwardHeaders.set("x-umeed-nonce", nonce);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const backendResponse = await fetch(targetUrl.toString(), {
      method,
      headers: forwardHeaders,
      body: rawBodyBuffer.length > 0 ? new Uint8Array(rawBodyBuffer) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    const responseHeaders = new Headers();
    // Copy content-type and cache-control
    const ct = backendResponse.headers.get("content-type");
    if (ct) responseHeaders.set("content-type", ct);
    responseHeaders.set("cache-control", "no-store, max-age=0");

    // Copy multiple Set-Cookie headers properly without array truncation
    const rawHeaders = backendResponse.headers as unknown as { getSetCookie?: () => string[] };
    const setCookies = typeof rawHeaders.getSetCookie === "function"
      ? rawHeaders.getSetCookie()
      : [backendResponse.headers.get("set-cookie")].filter(Boolean);

    for (const cookieStr of setCookies) {
      if (cookieStr) {
        responseHeaders.append("set-cookie", cookieStr);
      }
    }

    const responseBody = await backendResponse.text();

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "The dedicated UMEED backend in Mumbai could not be reached. Fail-closed policy active.",
          status: 503,
          details: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }
}
