import { IIncidentRepository } from "./incident.repository";
import { MongoIncidentRepository } from "./mongo-incident.repository";
import { InMemoryIncidentRepository } from "./memory-incident.repository";
import { getServerEnv } from "@/lib/config/env";
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
}

/**
 * Retrieve the active Incident Repository instance via Dependency Injection.
 *
 * Evaluation Strategy:
 * 1. Explicitly injected repository (e.g. In unit tests)
 * 2. MongoIncidentRepository if MONGODB_URI is provided
 * 3. InMemoryIncidentRepository fallback if database is unconfigured
 */
export function getIncidentRepository(customRepo?: IIncidentRepository): IIncidentRepository {
  if (customRepo) {
    return customRepo;
  }

  if (defaultRepo) {
    return defaultRepo;
  }

  const env = getServerEnv();

  if (env.MONGODB_URI) {
    defaultRepo = new MongoIncidentRepository();
    logger.info("Using MongoDB Atlas Incident Repository", "INCIDENT_REPO");
    return defaultRepo;
  }

  if (!inMemoryFallbackSingleton) {
    inMemoryFallbackSingleton = new InMemoryIncidentRepository();
    logger.info(
      "MONGODB_URI unconfigured; using high-fidelity InMemoryIncidentRepository",
      "INCIDENT_REPO"
    );
  }

  return inMemoryFallbackSingleton;
}
