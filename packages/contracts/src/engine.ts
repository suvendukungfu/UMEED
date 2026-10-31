import { z } from "zod";

// ==============================================================================
// 1. ORGANIZATION (Provider Entity)
// ==============================================================================

export const OrganizationTypeSchema = z.enum([
  "TRUST",
  "SOCIETY",
  "SECTION_8",
  "VOLUNTEER_GROUP",
  "GOVERNMENT_ALLIED",
  "OTHER",
]);
export type OrganizationType = z.infer<typeof OrganizationTypeSchema>;

export const OrganizationVerificationStatusSchema = z.enum([
  "PUBLICLY_LISTED",
  "REGISTRATION_CHECKED",
  "OPERATIONALLY_VERIFIED",
  "UNVERIFIED",
  "SUSPENDED",
  "INACTIVE",
]);
export type OrganizationVerificationStatus = z.infer<
  typeof OrganizationVerificationStatusSchema
>;

export const OperationalStatusSchema = z.enum([
  "ACTIVE",
  "TEMPORARILY_CLOSED",
  "SUSPENDED",
  "INACTIVE",
]);
export type OperationalStatus = z.infer<typeof OperationalStatusSchema>;

export const PublicContactChannelsSchema = z.object({
  phone: z.string().max(30).nullable().default(null),
  email: z.string().email().max(100).nullable().default(null),
  emergencyPhone: z.string().max(30).nullable().default(null),
  website: z.string().max(256).nullable().default(null),
  coordinatorName: z.string().max(100).nullable().default(null),
  isPhoneVerified: z.boolean().default(false),
});
export type PublicContactChannels = z.infer<typeof PublicContactChannelsSchema>;

export const ReliabilityMetricsSchema = z.object({
  successfulResponses: z.number().int().nonnegative().default(0),
  eligibleResolvedAttempts: z.number().int().nonnegative().default(0),
  averageResponseMinutes: z.number().nonnegative().nullable().default(null),
  sampleSize: z.number().int().nonnegative().default(0),
  categoryMetrics: z
    .record(
      z.string(),
      z.object({
        successfulResponses: z.number().int().nonnegative().default(0),
        eligibleResolvedAttempts: z.number().int().nonnegative().default(0),
      })
    )
    .optional()
    .default({}),
});
export type ReliabilityMetrics = z.infer<typeof ReliabilityMetricsSchema>;

export const OrganizationSchema = z.object({
  organizationId: z.string().min(1).max(100),
  name: z.string().min(2).max(200),
  organizationType: OrganizationTypeSchema.default("OTHER"),
  verificationStatus: OrganizationVerificationStatusSchema.default("UNVERIFIED"),
  registrationDetails: z.object({
    registrationNumber: z.string().max(100).nullable().default(null),
    registrationAuthority: z.string().max(100).nullable().default(null),
    registrationDate: z.string().nullable().default(null),
  }),
  serviceCategories: z.array(z.string()).min(1),
  serviceSubcategories: z.array(z.string()).default([]),
  serviceAreas: z.array(z.string()).default([]),
  operationalStatus: OperationalStatusSchema.default("ACTIVE"),
  publicContactChannels: PublicContactChannelsSchema,
  reliabilityMetrics: ReliabilityMetricsSchema.default({
    successfulResponses: 0,
    eligibleResolvedAttempts: 0,
    averageResponseMinutes: null,
    sampleSize: 0,
    categoryMetrics: {},
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastVerifiedAt: z.string().datetime().nullable().default(null),
});
export type Organization = z.infer<typeof OrganizationSchema>;

// ==============================================================================
// 2. SERVICE LOCATION (GeoJSON Point & Capacity)
// ==============================================================================

export const GeoJsonPointSchema = z.object({
  type: z.literal("Point"),
  // Coordinates in GeoJSON are ordered: [longitude, latitude]
  coordinates: z.tuple([
    z.number().min(-180).max(180), // Longitude
    z.number().min(-90).max(90),   // Latitude
  ]),
});
export type GeoJsonPoint = z.infer<typeof GeoJsonPointSchema>;

export const AvailabilityStatusEnumSchema = z.enum([
  "CONFIRMED_AVAILABLE",
  "LIMITED_CONFIRMED",
  "UNKNOWN",
  "NO_CAPACITY",
  "CLOSED_SUSPENDED",
]);
export type AvailabilityStatusEnum = z.infer<
  typeof AvailabilityStatusEnumSchema
>;

export const ServiceAreaSchema = z.object({
  states: z.array(z.string()).default(["Delhi"]),
  districts: z.array(z.string()).min(1),
  wards: z.array(z.string()).default([]),
  radiusKm: z.number().positive().default(20),
  coversAllDelhi: z.boolean().default(false),
  acceptsOutOfArea: z.boolean().default(false),
});
export type ServiceArea = z.infer<typeof ServiceAreaSchema>;

export const ServiceLocationSchema = z.object({
  serviceLocationId: z.string().min(1).max(100),
  providerId: z.string().min(1).max(100),
  name: z.string().min(2).max(200),
  address: z.string().max(500),
  district: z.string().max(100),
  ward: z.string().max(100).nullable().default(null),
  location: GeoJsonPointSchema,
  supportedServices: z.array(z.string()).min(1),
  serviceArea: ServiceAreaSchema,
  operatingHours: z.string().default("24x7 Emergency"),
  operationalStatus: OperationalStatusSchema.default("ACTIVE"),
  capacity: z.number().int().nonnegative().default(10),
  occupiedCapacity: z.number().int().nonnegative().default(0),
  availableCapacity: z.number().int().nonnegative().default(10),
  availabilityStatus: AvailabilityStatusEnumSchema.default("UNKNOWN"),
  lastAvailabilityConfirmedAt: z.string().datetime().nullable().default(null),
  lastVerifiedAt: z.string().datetime().nullable().default(null),
});
export type ServiceLocation = z.infer<typeof ServiceLocationSchema>;

// ==============================================================================
// 3. ASSISTANCE REQUIREMENT (Per-Need Coordination Lifecycle)
// ==============================================================================

export const RequirementStatusSchema = z.enum([
  "PENDING_MATCH",
  "OUTREACH_ACTIVE",
  "OFFERED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "UNFULFILLED",
  "ESCALATED",
  "HUMAN_REVIEW",
  "CANCELLED",
]);
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;

export const OwnerTypeSchema = z.enum(["SYSTEM", "COORDINATOR", "PROVIDER"]);
export type OwnerType = z.infer<typeof OwnerTypeSchema>;

export const AssistanceRequirementSchema = z.object({
  requirementId: z.string().min(1).max(100),
  caseId: z.string().min(1).max(100),
  serviceType: z.string().min(1).max(100),
  subcategory: z.string().max(100).nullable().default(null),
  urgency: z
    .enum(["low", "medium", "high", "critical", "unconfirmed"])
    .default("medium"),
  description: z.string().max(2000).default(""),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().max(500).optional(),
    district: z.string().max(100).optional(),
    ward: z.string().max(100).optional(),
  }),
  status: RequirementStatusSchema.default("PENDING_MATCH"),
  outreachRound: z.number().int().min(1).default(1),
  outreachVersion: z.number().int().min(1).default(1),
  activeAttemptIds: z.array(z.string()).default([]),
  assignedProviderId: z.string().nullable().default(null),
  assignedServiceLocationId: z.string().nullable().default(null),
  parentRequirementId: z.string().nullable().default(null),
  nextActionAt: z.string().datetime(),
  lastMeaningfulActivityAt: z.string().datetime(),
  ownerType: OwnerTypeSchema.default("SYSTEM"),
  ownerId: z.string().default("system_engine"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AssistanceRequirement = z.infer<typeof AssistanceRequirementSchema>;

// ==============================================================================
// 4. MATCH RESULT (Explainable Multi-Factor Scoring)
// ==============================================================================

export const ScoreBreakdownSchema = z.object({
  distance: z.number().min(0).max(100),
  capability: z.number().min(0).max(100),
  reliability: z.number().min(0).max(100),
  availability: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100),
  freshness: z.number().min(0).max(100),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const EngineMatchResultSchema = z.object({
  matchId: z.string().min(1).max(100),
  caseId: z.string().min(1).max(100),
  requirementId: z.string().min(1).max(100),
  providerId: z.string().min(1).max(100),
  serviceLocationId: z.string().min(1).max(100),
  providerName: z.string().default(""),
  serviceLocationName: z.string().default(""),
  totalScore: z.number().min(0).max(100),
  scoreBreakdown: ScoreBreakdownSchema,
  reasons: z.array(z.string()).default([]),
  estimatedDistanceKm: z.number().nullable().default(null),
  estimatedTravelMinutes: z.number().nullable().default(null),
  eligibilityStatus: z.enum(["ELIGIBLE", "INELIGIBLE"]),
  exclusionReasons: z.array(z.string()).default([]),
  rankingVersion: z.string().default("1.0.0"),
  calculatedAt: z.string().datetime(),
});
export type EngineMatchResult = z.infer<typeof EngineMatchResultSchema>;

// ==============================================================================
// 5. OUTREACH ATTEMPT (Controlled Waves & Versioning)
// ==============================================================================

export const OutreachChannelSchema = z.enum([
  "in_app",
  "sms",
  "whatsapp",
  "email",
  "phone_call",
]);
export type OutreachChannel = z.infer<typeof OutreachChannelSchema>;

export const OutreachStatusSchema = z.enum([
  "CREATED",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "ACKNOWLEDGED",
  "ACCEPTED",
  "REJECTED",
  "TIMED_OUT",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
]);
export type OutreachStatus = z.infer<typeof OutreachStatusSchema>;

export const RejectionReasonSchema = z.enum([
  "NO_CAPACITY",
  "OUTSIDE_SERVICE_AREA",
  "SERVICE_NOT_SUPPORTED",
  "UNAVAILABLE_NOW",
  "INVALID_CONTACT",
  "DUPLICATE_CASE",
  "OTHER",
]);
export type RejectionReason = z.infer<typeof RejectionReasonSchema>;

export const OutreachAttemptSchema = z.object({
  attemptId: z.string().min(1).max(100),
  caseId: z.string().min(1).max(100),
  requirementId: z.string().min(1).max(100),
  providerId: z.string().min(1).max(100),
  serviceLocationId: z.string().max(100).optional(),
  outreachRound: z.number().int().min(1).default(1),
  outreachVersion: z.number().int().min(1).default(1),
  channel: OutreachChannelSchema.default("in_app"),
  status: OutreachStatusSchema.default("CREATED"),
  scoreAtTimeOfSelection: z.number().min(0).max(100),
  idempotencyKey: z.string().min(1).max(256),
  messageId: z.string().nullable().default(null),
  sentAt: z.string().datetime().nullable().default(null),
  deliveredAt: z.string().datetime().nullable().default(null),
  acknowledgementDeadline: z.string().datetime(),
  acknowledgedAt: z.string().datetime().nullable().default(null),
  acceptedAt: z.string().datetime().nullable().default(null),
  rejectedAt: z.string().datetime().nullable().default(null),
  rejectionReason: RejectionReasonSchema.nullable().default(null),
  supersededAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OutreachAttempt = z.infer<typeof OutreachAttemptSchema>;

// ==============================================================================
// 6. ASSIGNMENT (Exclusive & Multi-Requirement)
// ==============================================================================

export const EngineAssignmentStatusSchema = z.enum([
  "PROPOSED",
  "ACCEPTED",
  "WORK_STARTED",
  "IN_PROGRESS",
  "RESOLVED",
  "FAILED",
  "CANCELLED",
]);
export type EngineAssignmentStatus = z.infer<
  typeof EngineAssignmentStatusSchema
>;

export const AssignmentOutcomeSchema = z.object({
  outcomeStatus: z.enum(["SUCCESSFUL", "PARTIAL", "FAILED", "REFERRED"]),
  notes: z.string().max(2000).optional(),
  evidenceUrls: z.array(z.string().max(2048)).default([]),
});
export type AssignmentOutcome = z.infer<typeof AssignmentOutcomeSchema>;

export const EngineAssignmentSchema = z.object({
  assignmentId: z.string().min(1).max(100),
  caseId: z.string().min(1).max(100),
  requirementId: z.string().min(1).max(100),
  providerId: z.string().min(1).max(100),
  serviceLocationId: z.string().max(100).optional(),
  status: EngineAssignmentStatusSchema.default("ACCEPTED"),
  acceptedAt: z.string().datetime(),
  workStartedAt: z.string().datetime().nullable().default(null),
  expectedUpdateAt: z.string().datetime().nullable().default(null),
  lastProgressAt: z.string().datetime().nullable().default(null),
  resolvedAt: z.string().datetime().nullable().default(null),
  outcome: AssignmentOutcomeSchema.nullable().default(null),
  humanApproved: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EngineAssignment = z.infer<typeof EngineAssignmentSchema>;

// ==============================================================================
// 7. CASE EVENT (Append-Only Audit Log)
// ==============================================================================

export const ActorTypeSchema = z.enum([
  "SYSTEM",
  "COORDINATOR",
  "PROVIDER",
  "CITIZEN",
]);
export type ActorType = z.infer<typeof ActorTypeSchema>;

export const EngineCaseEventSchema = z.object({
  eventId: z.string().min(1).max(100),
  caseId: z.string().min(1).max(100),
  requirementId: z.string().nullable().default(null),
  attemptId: z.string().nullable().default(null),
  assignmentId: z.string().nullable().default(null),
  eventType: z.string().min(1).max(100),
  previousState: z.string().nullable().default(null),
  newState: z.string().min(1).max(100),
  actorType: ActorTypeSchema.default("SYSTEM"),
  actorId: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().datetime(),
});
export type EngineCaseEvent = z.infer<typeof EngineCaseEventSchema>;

// ==============================================================================
// 8. NOTIFICATION OUTBOX (Durable Delivery & Idempotency)
// ==============================================================================

export const OutboxStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "PERMANENTLY_FAILED",
]);
export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;

export const NotificationOutboxSchema = z.object({
  notificationId: z.string().min(1).max(100),
  idempotencyKey: z.string().min(1).max(256),
  caseId: z.string().min(1).max(100),
  requirementId: z.string().nullable().default(null),
  attemptId: z.string().nullable().default(null),
  recipient: z.string().min(1).max(256),
  channel: OutreachChannelSchema.default("in_app"),
  payload: z.record(z.string(), z.unknown()).default({}),
  status: OutboxStatusSchema.default("PENDING"),
  retryCount: z.number().int().nonnegative().default(0),
  nextRetryAt: z.string().datetime().nullable().default(null),
  lastError: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
  sentAt: z.string().datetime().nullable().default(null),
});
export type NotificationOutbox = z.infer<typeof NotificationOutboxSchema>;

// ==============================================================================
// 9. FORMAL PARENT CASE STATES (Phase 6 State Machine)
// ==============================================================================

export const ParentCaseStatusSchema = z.enum([
  "RECEIVED",
  "TRIAGING",
  "MATCHING",
  "OUTREACH_PENDING",
  "AWAITING_RESPONSE",
  "PROVIDER_ACCEPTED",
  "IN_PROGRESS",
  "SUPPLEMENTAL_REQUIRED",
  "ESCALATING",
  "HUMAN_REVIEW",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
]);
export type ParentCaseStatus = z.infer<typeof ParentCaseStatusSchema>;

