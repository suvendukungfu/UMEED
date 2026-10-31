import { MongoClient, Db, ServerApiVersion } from "mongodb";
import { getServerEnv } from "@/lib/config/env";
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

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  databaseName?: string;
  error?: string;
}

/**
 * Get or initialize the cached MongoDB client promise.
 * Returns null if MONGODB_URI is not configured, allowing fail-soft application boots.
 */
export function getMongoClientPromise(): Promise<MongoClient> | null {
  const env = getServerEnv();

  if (!env.MONGODB_URI) {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(env.MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      global._mongoClientPromise = client.connect();
      logger.info("Initializing cached development MongoDB client", "DB");
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(env.MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      clientPromise = client.connect();
      logger.info("Initializing production MongoDB client", "DB");
    }
    return clientPromise;
  }
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
 * Never throws and never exposes connection credentials.
 */
export async function checkDatabaseReadiness(): Promise<DatabaseStatus> {
  const env = getServerEnv();

  if (!env.MONGODB_URI) {
    return {
      configured: false,
      connected: false,
      error: "MONGODB_URI is not configured",
    };
  }

  try {
    const promise = getMongoClientPromise();
    if (!promise) {
      return { configured: false, connected: false };
    }

    const connectedClient = await promise;
    // Ping database with a 2-second timeout
    await connectedClient.db(env.MONGODB_DB).command({ ping: 1 });

    return {
      configured: true,
      connected: true,
      databaseName: env.MONGODB_DB,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Connection failed";
    logger.warn("Database readiness ping failed", "DB", { error: errMsg });
    return {
      configured: true,
      connected: false,
      databaseName: env.MONGODB_DB,
      error: "Unable to reach MongoDB Atlas cluster",
    };
  }
}

