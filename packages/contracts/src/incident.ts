import { z } from "zod";

/**
 * UMEED Canonical Incident Contract (v1.0.0)
 *
 * Shared integration contract across:
 * - Citizen reporting intake
 * - Independent social distress discovery crawler (FastAPI)
 * - Human review verification workflow
 * - Matching & Response Coordination Engine
 *
 * Security hardening:
 * - Upgraded to Zod 4.6.6+ (resolving GHSA-mrhx-c7xc-m3w5).
 * - Enforces explicit maximum length bounds on all collections, arrays,
 *   and string inputs to guarantee protection against resource exhaustion.
 */

export const IncidentSourceTypeSchema = z.enum([
  "citizen_report",
  "social_media_discovery",
]);
export type IncidentSourceType = z.infer<typeof IncidentSourceTypeSchema>;

export const IncidentSubjectTypeSchema = z.enum(["person", "animal"]);
export type IncidentSubjectType = z.infer<typeof IncidentSubjectTypeSchema>;

export const IncidentTypeSchema = z.enum([
  "injured_animal",
  "abandoned_animal",
  "homeless_person",
  "abandoned_elderly_person",
  "medical_assistance",
  "food_assistance",
  "shelter_assistance",
  "other",
]);
export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const EvidenceTypeSchema = z.enum(["image", "video", "audio", "text"]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceItemSchema = z.object({
  type: EvidenceTypeSchema,
  url: z.string().min(1, "Evidence URL or identifier is required").max(2048, "URL exceeds maximum length"),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string().max(100), z.unknown()).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const IncidentLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  address: z.string().max(500, "Address exceeds 500 characters").nullable().default(null),
  district: z.string().max(100, "District exceeds 100 characters").nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.0),
});
export type IncidentLocation = z.infer<typeof IncidentLocationSchema>;

export const SeverityLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
  "unconfirmed",
]);
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;

export const IncidentSeveritySchema = z.object({
  level: SeverityLevelSchema.default("unconfirmed"),
  confidence: z.number().min(0).max(1).default(0.0),
  reasoning: z
    .array(z.string().max(500, "Reasoning entry exceeds 500 characters"))
    .max(20, "Maximum of 20 reasoning items permitted")
    .default([]),
});
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const IncidentFreshnessSchema = z.enum([
  "current_confirmed_by_source",
  "potentially_recent",
  "old_or_reshared",
  "unclear",
  "unconfirmed",
]);
export type IncidentFreshness = z.infer<typeof IncidentFreshnessSchema>;

export const IncidentStatusSchema = z.enum([
  "REPORTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "DUPLICATE",
  "UNVERIFIED",
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

/**
 * The canonical incident ingestion schema with strict collection length limits.
 */
export const CanonicalIncidentSchema = z.object({
  schema_version: z.literal("1.0.0").default("1.0.0"),
  source_type: IncidentSourceTypeSchema,
  source_reference: z
    .string()
    .min(1, "source_reference must not be empty (used for idempotency)")
    .max(256, "source_reference exceeds 256 characters"),
  source_url: z.string().url().max(2048, "source_url exceeds 2048 characters").nullable().optional().default(null),
  reported_at: z
    .string()
    .datetime({ message: "reported_at must be an ISO 8601 datetime string" }),
  incident_type: IncidentTypeSchema,
  subject_type: IncidentSubjectTypeSchema,
  description: z
    .string()
    .min(1, "description is required")
    .max(5000, "description exceeds maximum length of 5000 characters"),
  evidence: z
    .array(EvidenceItemSchema)
    .max(25, "Maximum of 25 evidence attachments permitted")
    .default([]),
  location: IncidentLocationSchema.default({
    latitude: null,
    longitude: null,
    address: null,
    district: null,
    confidence: 0.0,
  }),
  severity: IncidentSeveritySchema.default({
    level: "unconfirmed",
    confidence: 0.0,
    reasoning: [],
  }),
  freshness: IncidentFreshnessSchema.default("unconfirmed"),
  missing_information: z
    .array(z.string().max(200, "Missing information item exceeds 200 characters"))
    .max(20, "Maximum of 20 missing information tags permitted")
    .default([]),
  requires_human_review: z.boolean().default(true),
});

export type CanonicalIncident = z.infer<typeof CanonicalIncidentSchema>;
