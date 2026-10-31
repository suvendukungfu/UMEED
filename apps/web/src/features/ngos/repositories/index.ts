import { INGORepository } from "./ngo.repository";
import { MongoNGORepository } from "./mongo-ngo.repository";
import { InMemoryNGORepository } from "./memory-ngo.repository";
import { getServerEnv, isPlaceholderValue } from "@/lib/config/env";
import { isMongoConfigured } from "@/lib/db/mongodb";
import { logger } from "@/lib/logging";

export * from "./ngo.repository";
export * from "./mongo-ngo.repository";
export * from "./memory-ngo.repository";

let defaultNgoRepo: INGORepository | null = null;
let inMemoryNgoFallbackSingleton: InMemoryNGORepository | null = null;

export function setNGORepository(repo: INGORepository | null): void {
  defaultNgoRepo = repo;
}

export function getNGORepository(customRepo?: INGORepository): INGORepository {
  if (customRepo) {
    return customRepo;
  }

  if (defaultNgoRepo) {
    return defaultNgoRepo;
  }

  const env = getServerEnv();

  // Fail-Closed Production Boundary
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory NGO repository is strictly prohibited in production."
      );
    }
    defaultNgoRepo = new MongoNGORepository();
    logger.info("Using MongoDB Atlas NGO Repository [Production]", "NGO_REPO");
    return defaultNgoRepo;
  }

  // Development and Test Execution Modes
  if (isMongoConfigured(env.MONGODB_URI)) {
    defaultNgoRepo = new MongoNGORepository();
    logger.info("Using MongoDB Atlas NGO Repository [Development]", "NGO_REPO");
    return defaultNgoRepo;
  }

  if (!inMemoryNgoFallbackSingleton) {
    inMemoryNgoFallbackSingleton = new InMemoryNGORepository();
    if (env.MONGODB_URI && isPlaceholderValue(env.MONGODB_URI)) {
      logger.warn(
        "MONGODB_URI contains placeholder template credentials; falling back safely to InMemoryNGORepository (EPHEMERAL / DEMO DATA)",
        "NGO_REPO"
      );
    } else {
      logger.warn(
        "MONGODB_URI unconfigured; using high-fidelity InMemoryNGORepository (EPHEMERAL / DEMO DATA)",
        "NGO_REPO"
      );
    }
  }

  return inMemoryNgoFallbackSingleton;
}
