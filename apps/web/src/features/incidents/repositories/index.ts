import { IIncidentRepository } from "./incident.repository";
import { MongoIncidentRepository } from "./mongo-incident.repository";
import { InMemoryIncidentRepository } from "./memory-incident.repository";
import { getServerEnv, isPlaceholderValue } from "@/lib/config/env";
import { isMongoConfigured } from "@/lib/db/mongodb";
import { logger } from "@/lib/logging";

export * from "./incident.repository";
export * from "./mongo-incident.repository";
export * from "./memory-incident.repository";

let defaultRepo: IIncidentRepository | null = null;
let inMemoryFallbackSingleton: InMemoryIncidentRepository | null = null;

/**
 * Reset default repository (used by tests).
 */
export function setIncidentRepository(repo: IIncidentRepository | null): void {
  defaultRepo = repo;
  (globalThis as any)._umeedIncidentRepo = repo;
}

/**
 * Retrieve the active Incident Repository instance via Dependency Injection.
 *
 * Evaluation Strategy:
 * 1. Explicitly injected repository (e.g. in unit tests)
 * 2. Production: MongoDB Atlas required. Fallback to in-memory is strictly prohibited.
 * 3. Development / Test: MongoIncidentRepository if configured; InMemoryIncidentRepository fallback if unconfigured.
 */
export function getIncidentRepository(customRepo?: IIncidentRepository): IIncidentRepository {
  if (customRepo) {
    return customRepo;
  }

  if (defaultRepo) {
    return defaultRepo;
  }

  if ((globalThis as any)._umeedIncidentRepo) {
    return (globalThis as any)._umeedIncidentRepo;
  }

  const env = getServerEnv();

  // Fail-Closed Production Boundary:
  // In production, MongoDB Atlas is strictly required. Under no circumstances may in-memory fallback be used,
  // even if an environment variable attempts to enable it.
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory repository is strictly prohibited in production."
      );
    }
    defaultRepo = new MongoIncidentRepository();
    logger.info("Using MongoDB Atlas Incident Repository [Production]", "INCIDENT_REPO");
    return defaultRepo;
  }

  // Development and Test Execution Modes
  if (isMongoConfigured(env.MONGODB_URI)) {
    defaultRepo = new MongoIncidentRepository();
    logger.info("Using MongoDB Atlas Incident Repository [Development]", "INCIDENT_REPO");
    return defaultRepo;
  }

  if (!inMemoryFallbackSingleton) {
    inMemoryFallbackSingleton = new InMemoryIncidentRepository();
    if (env.MONGODB_URI && isPlaceholderValue(env.MONGODB_URI)) {
      logger.warn(
        "MONGODB_URI contains placeholder template credentials; falling back safely to InMemoryIncidentRepository (EPHEMERAL / TEMPORARY DATA)",
        "INCIDENT_REPO"
      );
    } else {
      logger.warn(
        "MONGODB_URI unconfigured; using high-fidelity InMemoryIncidentRepository (EPHEMERAL / TEMPORARY DATA)",
        "INCIDENT_REPO"
      );
    }
  }

  (globalThis as any)._umeedIncidentRepo = inMemoryFallbackSingleton;
  return inMemoryFallbackSingleton;
}
