import {
  Organization,
  ServiceLocation,
  AssistanceRequirement,
  EngineMatchResult,
  ScoreBreakdown,
  OutreachAttempt,
  OutreachStatus,
  RejectionReason,
  OutreachChannel,
  EngineAssignment,
  EngineAssignmentStatus,
  EngineCaseEvent,
  ActorType,
  NotificationOutbox,
  OutboxStatus,
  ParentCaseStatus,
  RequirementStatus,
  OwnerType,
  AvailabilityStatusEnum,
  AssignmentOutcome,
} from "@umeed/contracts";

export type {
  Organization,
  ServiceLocation,
  AssistanceRequirement,
  EngineMatchResult,
  ScoreBreakdown,
  OutreachAttempt,
  OutreachStatus,
  RejectionReason,
  OutreachChannel,
  EngineAssignment,
  EngineAssignmentStatus,
  EngineCaseEvent,
  ActorType,
  NotificationOutbox,
  OutboxStatus,
  ParentCaseStatus,
  RequirementStatus,
  OwnerType,
  AvailabilityStatusEnum,
  AssignmentOutcome,
};

export interface DiscoveryQuery {
  serviceType: string;
  location: {
    latitude: number;
    longitude: number;
    district?: string;
    ward?: string;
  };
  urgency?: "low" | "medium" | "high" | "critical" | "unconfirmed";
  excludedProviderIds?: string[];
  maxCandidates?: number;
}

export interface CandidateEvaluationContext {
  organization: Organization;
  serviceLocation: ServiceLocation;
  estimatedDistanceKm: number | null;
  estimatedTravelMinutes: number | null;
  wardMatch: boolean;
  adjacentWardMatch: boolean;
  allDelhiMatch: boolean;
  districtMatch: boolean;
  activeCasesForProvider: number;
  recentTimeoutForProvider: boolean;
  isDurableRejection: boolean;
}
