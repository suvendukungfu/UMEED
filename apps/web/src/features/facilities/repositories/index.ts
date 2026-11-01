import {
  IFacilityRepository,
  IOrganizationEntityRepository,
  IProviderRelationshipRepository,
} from "./facility.repository";
import {
  InMemoryFacilityRepository,
  InMemoryOrganizationEntityRepository,
  InMemoryProviderRelationshipRepository,
} from "./memory-facility.repository";
import {
  MongoFacilityRepository,
  MongoOrganizationEntityRepository,
  MongoProviderRelationshipRepository,
} from "./mongo-facility.repository";
import { isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";

export * from "./facility.repository";
export * from "./memory-facility.repository";
export * from "./mongo-facility.repository";

declare global {
  // eslint-disable-next-line no-var
  var _umeedFacilityRepo: IFacilityRepository | undefined;
  // eslint-disable-next-line no-var
  var _umeedOrgEntityRepo: IOrganizationEntityRepository | undefined;
  // eslint-disable-next-line no-var
  var _umeedProviderRelRepo: IProviderRelationshipRepository | undefined;
}

export function getFacilityRepository(): IFacilityRepository {
  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory Facility repository is strictly prohibited in production."
      );
    }
    return new MongoFacilityRepository();
  }
  if (isMongoConfigured(env.MONGODB_URI)) {
    return new MongoFacilityRepository();
  }
  if (!global._umeedFacilityRepo) {
    global._umeedFacilityRepo = new InMemoryFacilityRepository();
  }
  return global._umeedFacilityRepo;
}

export function getOrganizationEntityRepository(): IOrganizationEntityRepository {
  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory Organization Entity repository is strictly prohibited in production."
      );
    }
    return new MongoOrganizationEntityRepository();
  }
  if (isMongoConfigured(env.MONGODB_URI)) {
    return new MongoOrganizationEntityRepository();
  }
  if (!global._umeedOrgEntityRepo) {
    global._umeedOrgEntityRepo = new InMemoryOrganizationEntityRepository();
  }
  return global._umeedOrgEntityRepo;
}

export function getProviderRelationshipRepository(): IProviderRelationshipRepository {
  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory Provider Relationship repository is strictly prohibited in production."
      );
    }
    return new MongoProviderRelationshipRepository();
  }
  if (isMongoConfigured(env.MONGODB_URI)) {
    return new MongoProviderRelationshipRepository();
  }
  if (!global._umeedProviderRelRepo) {
    global._umeedProviderRelRepo = new InMemoryProviderRelationshipRepository();
  }
  return global._umeedProviderRelRepo;
}
