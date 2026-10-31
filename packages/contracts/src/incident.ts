import { z } from "zod";

/**
 * UMEED Canonical Incident Contract (v1.0.0)
 *
 * This contract is the shared integration specification between:
 * - Citizen reporting intake
 * - Independent social distress discovery crawler (FastAPI)
 * - Human review verification workflow
 * - Matching & Response Coordination Engine
 *
 * Serialization compatibility note:
 * - Dates are ISO 8601 strings (e.g., 2026-10-31T12:00:00.000Z) to ensure
 *   seamless serialization across JavaScript, TypeScript, and Python Pydantic models.
 * - Missing or nullable fields default to explicit nulls or empty arrays.
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
  url: z.string().min(1, "Evidence URL or identifier is required"),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const IncidentLocationSchema = z.object({
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
  address: z.string().nullable().default(null),
  district: z.string().nullable().default(null),
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
  reasoning: z.array(z.string()).default([]),
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

/**
 * The canonical incident ingestion schema.
 */
export const CanonicalIncidentSchema = z.object({
  schema_version: z.literal("1.0.0").default("1.0.0"),
  source_type: IncidentSourceTypeSchema,
  source_reference: z
    .string()
    .min(1, "source_reference must not be empty (used for idempotency)"),
  source_url: z.string().url().nullable().optional().default(null),
  reported_at: z
    .string()
    .datetime({ message: "reported_at must be an ISO 8601 datetime string" }),
  incident_type: IncidentTypeSchema,
  subject_type: IncidentSubjectTypeSchema,
  description: z.string().min(1, "description is required"),
  evidence: z.array(EvidenceItemSchema).default([]),
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
  missing_information: z.array(z.string()).default([]),
  requires_human_review: z.boolean().default(true),
});

export type CanonicalIncident = z.infer<typeof CanonicalIncidentSchema>;

