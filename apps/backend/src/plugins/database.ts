import { MongoClient, Db } from "mongodb";
import { getBackendEnv } from "../config/env.js";

export type DatabaseErrorCode =
  | "NETWORK_ACCESS_DENIED"
  | "DNS_RESOLUTION_FAILURE"
  | "SRV_LOOKUP_FAILURE"
  | "CLUSTER_UNAVAILABLE"
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
  database?: string;
  region?: string;
  latencyMs?: number;
  diagnosticCode?: DatabaseErrorCode;
  error?: string;
}

let clientInstance: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export function classifyDatabaseError(err: unknown): { code: DatabaseErrorCode; summary: string } {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes("alert number 80") ||
    lower.includes("tlsv1 alert internal error") ||
    lower.includes("ssl alert number 80") ||
    lower.includes("could not connect to any servers in your mongodb atlas cluster")
  ) {
    return {
      code: "NETWORK_ACCESS_DENIED",
      summary: "TLS connection rejected by Atlas Network Access firewall (IP not whitelisted)",
    };
  }

  if (lower.includes("enotfound") || lower.includes("getaddrinfo")) {
    return {
      code: "DNS_RESOLUTION_FAILURE",
      summary: "DNS resolution failed for MongoDB Atlas cluster hostname",
    };
  }

  if (lower.includes("querysrv") || lower.includes("srv")) {
    return {
      code: "SRV_LOOKUP_FAILURE",
      summary: "DNS SRV record lookup failed for cluster connection string",
    };
  }

  if (lower.includes("auth") || lower.includes("scram") || lower.includes("authentication failed")) {
    return {
      code: "AUTHENTICATION_FAILURE",
      summary: "Database authentication failed (SCRAM credentials invalid)",
    };
  }

  if (lower.includes("econnrefused") || lower.includes("connect econnrefused")) {
    return {
      code: "TCP_CONNECTION_FAILURE",
      summary: "TCP connection refused on target cluster port 27017",
    };
  }

  if (lower.includes("cert") || lower.includes("certificate") || lower.includes("unable to verify")) {
    return {
      code: "TLS_CERTIFICATE_FAILURE",
      summary: "TLS certificate validation failed against root CA",
    };
  }

  if (lower.includes("tls") || lower.includes("ssl") || lower.includes("handshake")) {
    return {
      code: "TLS_HANDSHAKE_FAILURE",
      summary: "Cryptographic TLS handshake negotiation failed",
    };
  }

  if (lower.includes("not authorized") || lower.includes("unauthorized") || lower.includes("command failed")) {
    return {
      code: "DATABASE_PERMISSION_FAILURE",
      summary: "User lacks required RBAC permissions on target database",
    };
  }

  return {
    code: "CLUSTER_UNAVAILABLE",
    summary: "MongoDB cluster is unreachable or primary replica set node is unavailable",
  };
}

export async function getDatabaseClient(): Promise<MongoClient> {
  const env = getBackendEnv();

  if (!env.MONGODB_URI) {
    throw new Error("DATABASE_CONFIGURATION_FAILURE: MONGODB_URI environment variable is missing.");
  }

  if (clientInstance) {
    return clientInstance;
  }

  if (!clientPromise) {
    const client = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      tls: true,
      retryWrites: true,
      retryReads: true,
    });

    clientPromise = client
      .connect()
      .then((connectedClient) => {
        clientInstance = connectedClient;
        return connectedClient;
      })
      .catch((err) => {
        clientPromise = null;
        clientInstance = null;
        throw err;
      });
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getDatabaseClient();
  const env = getBackendEnv();
  return client.db(env.MONGODB_DB);
}

let indexesEnsured = false;
export async function ensureDatabaseIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  try {
    await db.collection("proxy_nonces").createIndex({ nonce: 1 }, { unique: true });
    await db.collection("proxy_nonces").createIndex({ createdAt: 1 }, { expireAfterSeconds: 120 });
    indexesEnsured = true;
  } catch (err) {
    // Index may already exist or DB is initializing
  }
}

export async function checkDatabaseReadiness(): Promise<DatabaseStatus> {
  const env = getBackendEnv();

  if (!env.MONGODB_URI) {
    return {
      configured: false,
      connected: false,
      region: env.FLY_REGION,
      diagnosticCode: "DATABASE_CONFIGURATION_FAILURE",
      error: "MONGODB_URI is not configured",
    };
  }

  const start = Date.now();
  try {
    const client = await getDatabaseClient();
    const db = client.db(env.MONGODB_DB);
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - start;

    return {
      configured: true,
      connected: true,
      database: env.MONGODB_DB,
      region: env.FLY_REGION,
      latencyMs,
    };
  } catch (err) {
    const classification = classifyDatabaseError(err);
    return {
      configured: true,
      connected: false,
      database: env.MONGODB_DB,
      region: env.FLY_REGION,
      diagnosticCode: classification.code,
      error: classification.summary,
    };
  }
}

export async function closeDatabaseClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
    clientPromise = null;
  }
}

