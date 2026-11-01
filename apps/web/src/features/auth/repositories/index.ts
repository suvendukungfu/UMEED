import {
  IUserRepository,
  MongoUserRepository,
  InMemoryUserRepository,
} from "./user.repository";
import {
  ISessionRepository,
  MongoSessionRepository,
  InMemorySessionRepository,
} from "./session.repository";
import {
  IOrganizationMembershipRepository,
  MongoOrganizationMembershipRepository,
  InMemoryOrganizationMembershipRepository,
} from "./membership.repository";
import { isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export * from "./user.repository";
export * from "./session.repository";
export * from "./membership.repository";

declare global {
  // eslint-disable-next-line no-var
  var _umeedUserRepo: IUserRepository | undefined;
  // eslint-disable-next-line no-var
  var _umeedSessionRepo: ISessionRepository | undefined;
  // eslint-disable-next-line no-var
  var _umeedMembershipRepo: IOrganizationMembershipRepository | undefined;
}

export function getUserRepository(): IUserRepository {
  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory User repository is strictly prohibited in production."
      );
    }
    return new MongoUserRepository();
  }
  if (isMongoConfigured(env.MONGODB_URI)) {
    return new MongoUserRepository();
  }
  if (!global._umeedUserRepo) {
    global._umeedUserRepo = new InMemoryUserRepository();
  }
  return global._umeedUserRepo;
}

export function getSessionRepository(): ISessionRepository {
  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory Session repository is strictly prohibited in production."
      );
    }
    return new MongoSessionRepository();
  }
  if (isMongoConfigured(env.MONGODB_URI)) {
    return new MongoSessionRepository();
  }
  if (!global._umeedSessionRepo) {
    global._umeedSessionRepo = new InMemorySessionRepository();
  }
  return global._umeedSessionRepo;
}

export function getOrganizationMembershipRepository(): IOrganizationMembershipRepository {
  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error(
        "Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI). " +
        "Fallback to in-memory Membership repository is strictly prohibited in production."
      );
    }
    return new MongoOrganizationMembershipRepository();
  }
  if (isMongoConfigured(env.MONGODB_URI)) {
    return new MongoOrganizationMembershipRepository();
  }
  if (!global._umeedMembershipRepo) {
    global._umeedMembershipRepo = new InMemoryOrganizationMembershipRepository();
  }
  return global._umeedMembershipRepo;
}

