import { ICaseRepository } from "./case.repository";
import { MongoCaseRepository } from "./mongo-case.repository";
import { InMemoryCaseRepository } from "./memory-case.repository";
import { getServerEnv } from "@/lib/config/env";
import { isMongoConfigured } from "@/lib/db/mongodb";
import { logger } from "@/lib/logging";

export * from "./case.repository";
export * from "./mongo-case.repository";
export * from "./memory-case.repository";

let defaultCaseRepo: ICaseRepository | null = null;
let inMemoryCaseFallbackSingleton: InMemoryCaseRepository | null = null;

export function setCaseRepository(repo: ICaseRepository | null): void {
  defaultCaseRepo = repo;
  (globalThis as any)._umeedCaseRepo = repo;
}

export function getCaseRepository(customRepo?: ICaseRepository): ICaseRepository {
  if (customRepo) {
    return customRepo;
  }

  if (defaultCaseRepo) {
    return defaultCaseRepo;
  }

  if ((globalThis as any)._umeedCaseRepo) {
    return (globalThis as any)._umeedCaseRepo;
  }

  const env = getServerEnv();

  // Fail-Closed Production Boundary:
  // In production, MongoDB Atlas is strictly required. Under no circumstances may in-memory fallback be used.
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory Case repository is strictly prohibited in production."
      );
    }
    defaultCaseRepo = new MongoCaseRepository();
    logger.info("Using MongoDB Atlas Case Repository [Production]", "CASE_REPO");
    return defaultCaseRepo;
  }

  // Development and Test Execution Modes
  if (isMongoConfigured(env.MONGODB_URI)) {
    defaultCaseRepo = new MongoCaseRepository();
    logger.info("Using MongoDB Atlas Case Repository [Development]", "CASE_REPO");
    return defaultCaseRepo;
  }

  if (!inMemoryCaseFallbackSingleton) {
    inMemoryCaseFallbackSingleton = new InMemoryCaseRepository();
    logger.warn(
      "MONGODB_URI unconfigured; using high-fidelity InMemoryCaseRepository (EPHEMERAL / TEMPORARY DATA)",
      "CASE_REPO"
    );
  }

  (globalThis as any)._umeedCaseRepo = inMemoryCaseFallbackSingleton;
  return inMemoryCaseFallbackSingleton;
}
