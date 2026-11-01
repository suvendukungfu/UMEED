import { MongoClient, Db, ServerApiVersion } from "mongodb";
import { getServerEnv, isPlaceholderValue } from "@/lib/config/env";
import { logger } from "@/lib/logging";

/**
 * MongoDB Atlas Connection Abstraction with Global Caching for Next.js hot reloading.
 */

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export type DatabaseDiagnosticCode =
  | "DNS_RESOLUTION_FAILURE"
  | "SRV_LOOKUP_FAILURE"
  | "CLUSTER_UNAVAILABLE"
  | "NETWORK_ACCESS_DENIED"
  | "TCP_CONNECTION_FAILURE"
  | "TLS_HANDSHAKE_FAILURE"
  | "TLS_CERTIFICATE_FAILURE"
  | "AUTHENTICATION_FAILURE"
  | "DATABASE_PERMISSION_FAILURE"
  | "DATABASE_SELECTION_FAILURE"
  | "DATABASE_CONFIGURATION_FAILURE";

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  databaseName?: string;
  diagnosticCode?: DatabaseDiagnosticCode;
  error?: string;
  latencyMs?: number;
  region?: string;
}

export interface ConnectivityVerificationResult {
  pingOk: boolean;
  latencyMs: number;
  writeOk: boolean;
  readOk: boolean;
  consistencyOk: boolean;
  diagnosticCollection: string;
  error?: string;
  diagnosticCode?: DatabaseDiagnosticCode;
}

/**
 * Classifies raw driver and networking errors into actionable, auditable categories.
 * Never leaks credentials or sensitive internal URLs.
 */
export function classifyDatabaseError(err: unknown): {
  code: DatabaseDiagnosticCode;
  message: string;
  safeSummary: string;
} {
  const rawMsg = err instanceof Error ? err.message : String(err || "");
  const lowerMsg = rawMsg.toLowerCase();

  // 1. Configuration Failures
  if (
    lowerMsg.includes("not configured") ||
    lowerMsg.includes("placeholder") ||
    lowerMsg.includes("invalid scheme") ||
    lowerMsg.includes("must begin with mongodb")
  ) {
    return {
      code: "DATABASE_CONFIGURATION_FAILURE",
      message: "Database connection string is unconfigured, incomplete, or contains placeholder templates.",
      safeSummary: "Configuration incomplete",
    };
  }

  // 2. DNS & SRV Failures
  if (
    lowerMsg.includes("querysrv enodata") ||
    lowerMsg.includes("querysrv enotfound") ||
    lowerMsg.includes("srv lookup")
  ) {
    return {
      code: "SRV_LOOKUP_FAILURE",
      message: "SRV DNS record for the MongoDB Atlas cluster could not be resolved.",
      safeSummary: "DNS SRV record lookup failed",
    };
  }
  if (lowerMsg.includes("enotfound") || lowerMsg.includes("eai_again")) {
    return {
      code: "DNS_RESOLUTION_FAILURE",
      message: "DNS host resolution failed for target MongoDB cluster shard nodes.",
      safeSummary: "DNS host resolution failed",
    };
  }

  // 3. Network Access & TLS Rejection (SSL Alert 80 = Atlas firewall dropping connection)
  if (
    lowerMsg.includes("ssl alert number 80") ||
    lowerMsg.includes("alert internal error") ||
    lowerMsg.includes("tlsv1 alert internal error")
  ) {
    return {
      code: "NETWORK_ACCESS_DENIED",
      message: "TLS handshake rejected by Atlas cluster gateway (SSL alert 80). Indicates inbound IP is blocked by Atlas Network Access Access List.",
      safeSummary: "TLS connection rejected by Atlas Network Access firewall",
    };
  }
  if (
    lowerMsg.includes("cert_has_expired") ||
    lowerMsg.includes("self_signed_cert") ||
    lowerMsg.includes("unable_to_verify_leaf_signature") ||
    lowerMsg.includes("hostname/ip does not match")
  ) {
    return {
      code: "TLS_CERTIFICATE_FAILURE",
      message: "TLS certificate verification failed between serverless function and database cluster.",
      safeSummary: "TLS certificate validation failed",
    };
  }
  if (
    lowerMsg.includes("ssl routines") ||
    lowerMsg.includes("handshake_failure") ||
    lowerMsg.includes("tlsv1 alert") ||
    lowerMsg.includes("err_ssl")
  ) {
    return {
      code: "TLS_HANDSHAKE_FAILURE",
      message: "TLS encryption handshake negotiation could not be established with database nodes.",
      safeSummary: "TLS encryption negotiation failed",
    };
  }

  // 4. TCP / Connection Failures
  if (
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("etimedout") ||
    lowerMsg.includes("ehostunreach") ||
    lowerMsg.includes("enetunreach")
  ) {
    return {
      code: "TCP_CONNECTION_FAILURE",
      message: "TCP transport connection failed or was actively refused by target cluster nodes.",
      safeSummary: "TCP connection failed",
    };
  }

  // 5. Authentication Failures (MongoDB code 18)
  if (
    lowerMsg.includes("authentication failed") ||
    lowerMsg.includes("bad auth") ||
    lowerMsg.includes("code 18") ||
    (err as any)?.code === 18
  ) {
    return {
      code: "AUTHENTICATION_FAILURE",
      message: "Database user credentials rejected by authentication mechanism (SCRAM-SHA-1/256).",
      safeSummary: "Database authentication failed",
    };
  }

  // 6. Database Permission Failures (MongoDB code 13)
  if (
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("requires authentication") ||
    lowerMsg.includes("code 13") ||
    (err as any)?.code === 13
  ) {
    return {
      code: "DATABASE_PERMISSION_FAILURE",
      message: "Connected database user lacks required role permissions (readWrite) on the requested database.",
      safeSummary: "Database permission denied",
    };
  }

  // 7. Cluster / Server Selection Failures
  if (
    lowerMsg.includes("server selection timed out") ||
    lowerMsg.includes("topology was destroyed") ||
    lowerMsg.includes("no primary found")
  ) {
    return {
      code: "CLUSTER_UNAVAILABLE",
      message: "Driver could not discover or elect an active cluster node within timeout deadline.",
      safeSummary: "Cluster nodes unavailable within timeout",
    };
  }

  // 8. Database Selection Failures
  if (lowerMsg.includes("invalid db name") || lowerMsg.includes("database not found")) {
    return {
      code: "DATABASE_SELECTION_FAILURE",
      message: "The specified target database is invalid or inaccessible.",
      safeSummary: "Database selection failed",
    };
  }

  return {
    code: "CLUSTER_UNAVAILABLE",
    message: rawMsg,
    safeSummary: "Database connection failed",
  };
}

/**
 * Evaluates whether MONGODB_URI is realistically configured for an Atlas/Mongo cluster.
 * Returns false if missing, empty, or containing template placeholder tokens.
 */
export function isMongoConfigured(uri?: string | null): uri is string {
  if (!uri || typeof uri !== "string") return false;
  const trimmed = uri.trim();
  if (trimmed === "") return false;
  if (isPlaceholderValue(trimmed)) return false;
  return trimmed.startsWith("mongodb://") || trimmed.startsWith("mongodb+srv://");
}

const MONGO_CLIENT_OPTIONS = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 20000,
};

/**
 * Get or initialize the cached MongoDB client promise.
 * Returns null if MONGODB_URI is not configured, allowing fail-soft application boots.
 * Reuses connection across warm serverless functions on Vercel via global caching.
 */
export function getMongoClientPromise(): Promise<MongoClient> | null {
  const env = getServerEnv();

  if (!isMongoConfigured(env.MONGODB_URI)) {
    return null;
  }

  if (!global._mongoClientPromise) {
    client = new MongoClient(env.MONGODB_URI, MONGO_CLIENT_OPTIONS);
    global._mongoClientPromise = client.connect().catch((err) => {
      global._mongoClientPromise = undefined;
      clientPromise = null;
      throw err;
    });
    clientPromise = global._mongoClientPromise;
    logger.info("Initializing cached MongoDB client pool", "DB");
  }

  return global._mongoClientPromise;
}

/**
 * Retrieve the active Db instance.
 * Throws a clean error if MONGODB_URI is not set or connection fails.
 */
export async function getDatabase(): Promise<Db> {
  const promise = getMongoClientPromise();
  if (!promise) {
    throw new Error(
      "MongoDB is not configured. Please supply MONGODB_URI in .env.local to enable database operations."
    );
  }

  const connectedClient = await promise;
  const env = getServerEnv();
  return connectedClient.db(env.MONGODB_DB);
}

/**
 * Non-blocking readiness check for /api/health or status endpoints.
 * Distinguishes network, TLS, auth, and cluster failures without exposing credentials.
 */
export async function checkDatabaseReadiness(): Promise<DatabaseStatus> {
  const env = getServerEnv();
  const region = process.env.VERCEL_REGION || "local";

  if (!env.MONGODB_URI) {
    return {
      configured: false,
      connected: false,
      diagnosticCode: "DATABASE_CONFIGURATION_FAILURE",
      error: "MONGODB_URI is not configured",
      region,
    };
  }

  if (isPlaceholderValue(env.MONGODB_URI)) {
    return {
      configured: false,
      connected: false,
      diagnosticCode: "DATABASE_CONFIGURATION_FAILURE",
      error: "MONGODB_URI contains unconfigured placeholder template values",
      region,
    };
  }

  if (!isMongoConfigured(env.MONGODB_URI)) {
    return {
      configured: false,
      connected: false,
      diagnosticCode: "DATABASE_CONFIGURATION_FAILURE",
      error: "MONGODB_URI must begin with mongodb:// or mongodb+srv://",
      region,
    };
  }

  const start = Date.now();
  try {
    const promise = getMongoClientPromise();
    if (!promise) {
      return {
        configured: false,
        connected: false,
        diagnosticCode: "DATABASE_CONFIGURATION_FAILURE",
        error: "MongoDB client initialization failed",
        region,
      };
    }

    const connectedClient = await promise;
    // Ping database with strict deadline
    await connectedClient.db(env.MONGODB_DB).command({ ping: 1 });
    const latencyMs = Date.now() - start;

    return {
      configured: true,
      connected: true,
      databaseName: env.MONGODB_DB,
      latencyMs,
      region,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const classified = classifyDatabaseError(err);
    logger.warn("Database readiness ping failed", "DB", {
      diagnosticCode: classified.code,
      safeSummary: classified.safeSummary,
      latencyMs,
      region,
    });

    return {
      configured: true,
      connected: false,
      databaseName: env.MONGODB_DB,
      diagnosticCode: classified.code,
      error: classified.safeSummary,
      latencyMs,
      region,
    };
  }
}

/**
 * Phase 6 Database Connectivity Verification:
 * Non-destructive probe verifying database selection, read, and write isolation.
 * Uses strictly isolated `_system_healthchecks` collection — NEVER touches citizen data.
 */
export async function verifyDatabaseConnectivity(injectedDb?: Db): Promise<ConnectivityVerificationResult> {
  const diagnosticCollection = "_system_healthchecks";
  const start = Date.now();

  try {
    const db = injectedDb || (await getDatabase());
    const region = process.env.VERCEL_REGION || "local";

    // 1. Ping
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - start;

    // 2. Isolated write to health-check collection
    const checkId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const collection = db.collection(diagnosticCollection);

    await collection.insertOne({
      checkId,
      region,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000), // 1 min self-expiry
    });

    // 3. Isolated read back
    const record = await collection.findOne({ checkId });
    const writeOk = true;
    const readOk = record !== null;
    const consistencyOk = record?.checkId === checkId;

    // 4. Clean up check record
    await collection.deleteOne({ checkId });

    return {
      pingOk: true,
      latencyMs,
      writeOk,
      readOk,
      consistencyOk,
      diagnosticCollection,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const classified = classifyDatabaseError(err);
    return {
      pingOk: false,
      latencyMs,
      writeOk: false,
      readOk: false,
      consistencyOk: false,
      diagnosticCollection,
      error: classified.safeSummary,
      diagnosticCode: classified.code,
    };
  }
}

export const getDb = getDatabase;
