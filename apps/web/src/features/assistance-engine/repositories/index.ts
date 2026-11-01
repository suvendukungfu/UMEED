import { getServerEnv } from "@/lib/config/env";
import { isMongoConfigured } from "@/lib/db/mongodb";
import { logger } from "@/lib/logging";

import { IServiceLocationRepository } from "./service-location.repository";
import { MongoServiceLocationRepository } from "./mongo-service-location.repository";
import { InMemoryServiceLocationRepository } from "./memory-service-location.repository";

import { IOrganizationRepository } from "./organization.repository";
import { MongoOrganizationRepository } from "./mongo-organization.repository";
import { InMemoryOrganizationRepository } from "./memory-organization.repository";

import { IAssistanceRequirementRepository } from "./assistance-requirement.repository";
import { MongoAssistanceRequirementRepository } from "./mongo-assistance-requirement.repository";
import { InMemoryAssistanceRequirementRepository } from "./memory-assistance-requirement.repository";

import { IOutreachAttemptRepository } from "./outreach-attempt.repository";
import { MongoOutreachAttemptRepository } from "./mongo-outreach-attempt.repository";
import { InMemoryOutreachAttemptRepository } from "./memory-outreach-attempt.repository";

import { IEngineAssignmentRepository } from "./engine-assignment.repository";
import { MongoEngineAssignmentRepository } from "./mongo-engine-assignment.repository";
import { InMemoryEngineAssignmentRepository } from "./memory-engine-assignment.repository";

import { IEngineCaseEventRepository } from "./case-event.repository";
import { MongoEngineCaseEventRepository } from "./mongo-case-event.repository";
import { InMemoryEngineCaseEventRepository } from "./memory-case-event.repository";

import { INotificationOutboxRepository } from "./notification-outbox.repository";
import { MongoNotificationOutboxRepository } from "./mongo-notification-outbox.repository";
import { InMemoryNotificationOutboxRepository } from "./memory-notification-outbox.repository";

export * from "./service-location.repository";
export * from "./mongo-service-location.repository";
export * from "./memory-service-location.repository";

export * from "./organization.repository";
export * from "./mongo-organization.repository";
export * from "./memory-organization.repository";

export * from "./assistance-requirement.repository";
export * from "./mongo-assistance-requirement.repository";
export * from "./memory-assistance-requirement.repository";

export * from "./outreach-attempt.repository";
export * from "./mongo-outreach-attempt.repository";
export * from "./memory-outreach-attempt.repository";

export * from "./engine-assignment.repository";
export * from "./mongo-engine-assignment.repository";
export * from "./memory-engine-assignment.repository";

export * from "./case-event.repository";
export * from "./mongo-case-event.repository";
export * from "./memory-case-event.repository";

export * from "./notification-outbox.repository";
export * from "./mongo-notification-outbox.repository";
export * from "./memory-notification-outbox.repository";

// Singletons
let serviceLocationRepoSingleton: IServiceLocationRepository | null = null;
let organizationRepoSingleton: IOrganizationRepository | null = null;
let requirementRepoSingleton: IAssistanceRequirementRepository | null = null;
let outreachAttemptRepoSingleton: IOutreachAttemptRepository | null = null;
let engineAssignmentRepoSingleton: IEngineAssignmentRepository | null = null;
let engineCaseEventRepoSingleton: IEngineCaseEventRepository | null = null;
let notificationOutboxRepoSingleton: INotificationOutboxRepository | null = null;

export function getServiceLocationRepository(custom?: IServiceLocationRepository): IServiceLocationRepository {
  if (custom) return custom;
  if (serviceLocationRepoSingleton) return serviceLocationRepoSingleton;
  if ((globalThis as any)._umeedServiceLocationRepo) return (globalThis as any)._umeedServiceLocationRepo;

  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error("Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI).");
    }
    serviceLocationRepoSingleton = new MongoServiceLocationRepository();
    return serviceLocationRepoSingleton;
  }

  if (isMongoConfigured(env.MONGODB_URI)) {
    serviceLocationRepoSingleton = new MongoServiceLocationRepository();
    return serviceLocationRepoSingleton;
  }

  serviceLocationRepoSingleton = new InMemoryServiceLocationRepository();
  (globalThis as any)._umeedServiceLocationRepo = serviceLocationRepoSingleton;
  return serviceLocationRepoSingleton;
}

export function getOrganizationRepository(custom?: IOrganizationRepository): IOrganizationRepository {
  if (custom) return custom;
  if (organizationRepoSingleton) return organizationRepoSingleton;
  if ((globalThis as any)._umeedOrganizationRepo) return (globalThis as any)._umeedOrganizationRepo;

  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error("Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI).");
    }
    organizationRepoSingleton = new MongoOrganizationRepository();
    return organizationRepoSingleton;
  }

  if (isMongoConfigured(env.MONGODB_URI)) {
    organizationRepoSingleton = new MongoOrganizationRepository();
    return organizationRepoSingleton;
  }

  organizationRepoSingleton = new InMemoryOrganizationRepository();
  (globalThis as any)._umeedOrganizationRepo = organizationRepoSingleton;
  return organizationRepoSingleton;
}

export function getAssistanceRequirementRepository(custom?: IAssistanceRequirementRepository): IAssistanceRequirementRepository {
  if (custom) return custom;
  if (requirementRepoSingleton) return requirementRepoSingleton;
  if ((globalThis as any)._umeedRequirementRepo) return (globalThis as any)._umeedRequirementRepo;

  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error("Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI).");
    }
    requirementRepoSingleton = new MongoAssistanceRequirementRepository();
    return requirementRepoSingleton;
  }

  if (isMongoConfigured(env.MONGODB_URI)) {
    requirementRepoSingleton = new MongoAssistanceRequirementRepository();
    return requirementRepoSingleton;
  }

  requirementRepoSingleton = new InMemoryAssistanceRequirementRepository();
  (globalThis as any)._umeedRequirementRepo = requirementRepoSingleton;
  return requirementRepoSingleton;
}

export function getOutreachAttemptRepository(custom?: IOutreachAttemptRepository): IOutreachAttemptRepository {
  if (custom) return custom;
  if (outreachAttemptRepoSingleton) return outreachAttemptRepoSingleton;
  if ((globalThis as any)._umeedOutreachAttemptRepo) return (globalThis as any)._umeedOutreachAttemptRepo;

  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error("Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI).");
    }
    outreachAttemptRepoSingleton = new MongoOutreachAttemptRepository();
    return outreachAttemptRepoSingleton;
  }

  if (isMongoConfigured(env.MONGODB_URI)) {
    outreachAttemptRepoSingleton = new MongoOutreachAttemptRepository();
    return outreachAttemptRepoSingleton;
  }

  outreachAttemptRepoSingleton = new InMemoryOutreachAttemptRepository();
  (globalThis as any)._umeedOutreachAttemptRepo = outreachAttemptRepoSingleton;
  return outreachAttemptRepoSingleton;
}

export function getEngineAssignmentRepository(custom?: IEngineAssignmentRepository): IEngineAssignmentRepository {
  if (custom) return custom;
  if (engineAssignmentRepoSingleton) return engineAssignmentRepoSingleton;
  if ((globalThis as any)._umeedEngineAssignmentRepo) return (globalThis as any)._umeedEngineAssignmentRepo;

  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error("Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI).");
    }
    engineAssignmentRepoSingleton = new MongoEngineAssignmentRepository();
    return engineAssignmentRepoSingleton;
  }

  if (isMongoConfigured(env.MONGODB_URI)) {
    engineAssignmentRepoSingleton = new MongoEngineAssignmentRepository();
    return engineAssignmentRepoSingleton;
  }

  engineAssignmentRepoSingleton = new InMemoryEngineAssignmentRepository();
  (globalThis as any)._umeedEngineAssignmentRepo = engineAssignmentRepoSingleton;
  return engineAssignmentRepoSingleton;
}

export function getEngineCaseEventRepository(custom?: IEngineCaseEventRepository): IEngineCaseEventRepository {
  if (custom) return custom;
  if (engineCaseEventRepoSingleton) return engineCaseEventRepoSingleton;
  if ((globalThis as any)._umeedEngineCaseEventRepo) return (globalThis as any)._umeedEngineCaseEventRepo;

  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error("Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI).");
    }
    engineCaseEventRepoSingleton = new MongoEngineCaseEventRepository();
    return engineCaseEventRepoSingleton;
  }

  if (isMongoConfigured(env.MONGODB_URI)) {
    engineCaseEventRepoSingleton = new MongoEngineCaseEventRepository();
    return engineCaseEventRepoSingleton;
  }

  engineCaseEventRepoSingleton = new InMemoryEngineCaseEventRepository();
  (globalThis as any)._umeedEngineCaseEventRepo = engineCaseEventRepoSingleton;
  return engineCaseEventRepoSingleton;
}

export function getNotificationOutboxRepository(custom?: INotificationOutboxRepository): INotificationOutboxRepository {
  if (custom) return custom;
  if (notificationOutboxRepoSingleton) return notificationOutboxRepoSingleton;
  if ((globalThis as any)._umeedNotificationOutboxRepo) return (globalThis as any)._umeedNotificationOutboxRepo;

  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    if (!isMongoConfigured(env.MONGODB_URI)) {
      throw new Error("Production environment requires a configured MongoDB Atlas cluster (MONGODB_URI).");
    }
    notificationOutboxRepoSingleton = new MongoNotificationOutboxRepository();
    return notificationOutboxRepoSingleton;
  }

  if (isMongoConfigured(env.MONGODB_URI)) {
    notificationOutboxRepoSingleton = new MongoNotificationOutboxRepository();
    return notificationOutboxRepoSingleton;
  }

  notificationOutboxRepoSingleton = new InMemoryNotificationOutboxRepository();
  (globalThis as any)._umeedNotificationOutboxRepo = notificationOutboxRepoSingleton;
  return notificationOutboxRepoSingleton;
}

export function resetEngineRepositories(): void {
  serviceLocationRepoSingleton = null;
  organizationRepoSingleton = null;
  requirementRepoSingleton = null;
  outreachAttemptRepoSingleton = null;
  engineAssignmentRepoSingleton = null;
  engineCaseEventRepoSingleton = null;
  notificationOutboxRepoSingleton = null;
}

