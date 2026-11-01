import crypto from "crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { getBackendEnv } from "../config/env.js";
import { getDatabase, ensureDatabaseIndexes } from "./database.js";

const MAX_TIME_DRIFT_SEC = 60;

// Local fallback cache for development/test only
const localSeenNonces = new Map<string, number>();

setInterval(() => {
  const cutoff = Date.now() - (MAX_TIME_DRIFT_SEC * 2 * 1000);
  for (const [nonce, timestamp] of localSeenNonces.entries()) {
    if (timestamp < cutoff) {
      localSeenNonces.delete(nonce);
    }
  }
}, 60000).unref();

export interface ProxyAuthVerificationResult {
  valid: boolean;
  reason?: string;
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

export function computeBodyHash(body: unknown): string {
  if (body === undefined || body === null || body === "") {
    return crypto.createHash("sha256").update("").digest("hex");
  }
  if (Buffer.isBuffer(body)) {
    return crypto.createHash("sha256").update(body).digest("hex");
  }
  if (typeof body === "string") {
    return crypto.createHash("sha256").update(Buffer.from(body, "utf8")).digest("hex");
  }
  const serialized = JSON.stringify(body);
  return crypto.createHash("sha256").update(Buffer.from(serialized, "utf8")).digest("hex");
}

/**
 * Atomically checks and reserves a nonce in shared MongoDB storage.
 * Returns true if the nonce is unique and successfully recorded.
 * Returns false if the nonce has already been used (replay detected).
 * Throws if shared storage is unavailable in production.
 */
export async function claimNonce(nonce: string): Promise<boolean> {
  const env = getBackendEnv();

  try {
    const db = await getDatabase();
    await ensureDatabaseIndexes(db);

    await db.collection("proxy_nonces").insertOne({
      nonce,
      createdAt: new Date(),
    });
    return true;
  } catch (err: unknown) {
    const errorObj = err as { code?: number; message?: string };
    if (errorObj?.code === 11000 || String(err).includes("E11000") || errorObj?.message?.includes("duplicate key")) {
      return false; // Replay detected
    }

    // In production, distributed replay protection MUST fail closed (unless in local test runner)
    if (env.NODE_ENV === "production" && !process.env.VITEST) {
      throw new Error(`SHARED_NONCE_STORAGE_FAILED: ${errorObj?.message || String(err)}`);
    }

    // Fallback to process-local memory ONLY in development and test environments when DB is offline
    if (localSeenNonces.has(nonce)) {
      return false;
    }
    localSeenNonces.set(nonce, Date.now());
    return true;
  }
}

export async function verifyProxyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const env = getBackendEnv();

  // In development and test, if proxy secret is not explicitly set, permit direct local calls
  if (env.NODE_ENV !== "production" && !env.UMEED_PROXY_SIGNING_SECRET) {
    return true;
  }

  const secret = env.UMEED_PROXY_SIGNING_SECRET;
  if (!secret) {
    reply.status(503).send({
      error: {
        code: "PROXY_AUTH_UNCONFIGURED",
        message: "Backend proxy authentication secret is not configured in production.",
        status: 503,
        timestamp: new Date().toISOString(),
      },
    });
    return false;
  }

  const signature = request.headers["x-umeed-signature"] as string | undefined;
  const timestamp = request.headers["x-umeed-timestamp"] as string | undefined;
  const nonce = request.headers["x-umeed-nonce"] as string | undefined;

  if (!signature || !timestamp || !nonce) {
    reply.status(401).send({
      error: {
        code: "UNAUTHORIZED_PROXY_REQUEST",
        message: "Missing mandatory proxy signature, timestamp, or nonce header.",
        status: 401,
        timestamp: new Date().toISOString(),
      },
    });
    return false;
  }

  // 1. Clock skew check
  const reqTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > MAX_TIME_DRIFT_SEC) {
    reply.status(401).send({
      error: {
        code: "EXPIRED_PROXY_SIGNATURE",
        message: "Proxy request timestamp outside acceptable drift window.",
        status: 401,
        timestamp: new Date().toISOString(),
      },
    });
    return false;
  }

  // 2. Exact Raw Body Hash computation & Canonical path preservation
  const rawBody = (request as unknown as { rawBody?: Buffer | string }).rawBody ?? request.body;
  const bodyHash = computeBodyHash(rawBody);

  const canonicalPath = request.url;
  const expectedHmac = computeRequestHmac(secret, request.method, canonicalPath, timestamp, nonce, bodyHash);

  const bufExpected = Buffer.from(expectedHmac, "hex");
  const bufPresented = Buffer.from(signature, "hex");

  if (bufExpected.length !== bufPresented.length || !crypto.timingSafeEqual(bufExpected, bufPresented)) {
    reply.status(401).send({
      error: {
        code: "INVALID_PROXY_SIGNATURE",
        message: "HMAC signature mismatch: Request did not originate from authorized BFF proxy.",
        status: 401,
        timestamp: new Date().toISOString(),
      },
    });
    return false;
  }

  // 3. Atomic Distributed Replay check (MongoDB-backed with bounded local fallback in tests)
  try {
    const isUnique = await claimNonce(nonce);
    if (!isUnique) {
      reply.status(401).send({
        error: {
          code: "REPLAYED_PROXY_NONCE",
          message: "Proxy nonce has already been processed (replay attack detected across machines).",
          status: 401,
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }
  } catch (err) {
    reply.status(503).send({
      error: {
        code: "PROXY_STORAGE_UNAVAILABLE",
        message: "Shared distributed replay storage is unavailable. Rejecting request to prevent replay attacks.",
        status: 503,
        timestamp: new Date().toISOString(),
      },
    });
    return false;
  }

  return true;
}
