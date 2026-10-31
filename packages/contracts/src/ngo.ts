import { z } from "zod";
import {
  IncidentTypeSchema,
  IncidentSubjectTypeSchema,
} from "./incident";

export const OrganisationTypeSchema = z.enum([
  "TRUST",
  "SOCIETY",
  "SECTION_8",
  "VOLUNTEER_GROUP",
  "GOVERNMENT_ALLIED",
  "OTHER",
]);
export type OrganisationType = z.infer<typeof OrganisationTypeSchema>;

export const VerificationStatusSchema = z.enum([
  "PUBLICLY_LISTED",
  "REGISTRATION_CHECKED",
  "OPERATIONALLY_VERIFIED",
  "UNVERIFIED",
  "SUSPENDED",
  "INACTIVE",
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const RegistrationStatusSchema = z.enum([
  "REGISTERED",
  "UNREGISTERED",
  "EXPIRED",
  "PENDING_CHECK",
]);
export type RegistrationStatus = z.infer<typeof RegistrationStatusSchema>;

export const AvailabilityStatusSchema = z.enum([
  "AVAILABLE",
  "LIMITED",
  "UNAVAILABLE",
  "UNKNOWN",
]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const CapacityStatusSchema = z.enum([
  "HIGH",
  "MODERATE",
  "NEAR_CAPACITY",
  "FULL",
  "UNKNOWN",
]);
export type CapacityStatus = z.infer<typeof CapacityStatusSchema>;

export const NGOLocationSchema = z.object({
  address: z.string().max(500).nullable().default(null),
  district: z.string().max(100).nullable().default(null),
  state: z.string().max(100).default("Delhi"),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  geo: z
    .object({
      type: z.literal("Point"),
      coordinates: z.tuple([
        z.number().min(-180).max(180), // Longitude
        z.number().min(-90).max(90),   // Latitude
      ]),
    })
    .nullable()
    .optional()
    .default(null),
});
export type NGOLocation = z.infer<typeof NGOLocationSchema>;

export const NGOContactSchema = z.object({
  phone: z.string().max(30).nullable().default(null),
  email: z.string().email().max(100).nullable().default(null),
  emergency_phone: z.string().max(30).nullable().default(null),
  coordinator_name: z.string().max(100).nullable().default(null),
  is_phone_verified: z.boolean().default(false),
});
export type NGOContact = z.infer<typeof NGOContactSchema>;

export const NGOPrivateEvidenceSchema = z.object({
  source: z.string().max(100),
  verified_at: z.string().datetime().nullable().default(null),
  verifier_id: z.string().max(100).nullable().default(null),
  verifier_role: z.string().max(100).nullable().default(null),
  evidence_document_ref: z.string().max(256).nullable().default(null),
  verification_notes: z.string().max(1000).nullable().default(null),
});
export type NGOPrivateEvidence = z.infer<typeof NGOPrivateEvidenceSchema>;

export const NGOResponseHistorySchema = z.object({
  total_assignments: z.number().int().nonnegative().default(0),
  accepted_assignments: z.number().int().nonnegative().default(0),
  completed_interventions: z.number().int().nonnegative().default(0),
  rejected_assignments: z.number().int().nonnegative().default(0),
  average_response_minutes: z.number().nonnegative().nullable().default(null),
  sample_size: z.number().int().nonnegative().default(0),
});
export type NGOResponseHistory = z.infer<typeof NGOResponseHistorySchema>;

/**
 * Strict Canonical NGO Document Schema
 */
export const NGOSchema = z.object({
  _id: z.string(),
  ngo_id: z.string().min(1).max(100),
  organisation_name: z.string().min(2).max(200),
  alternate_names: z.array(z.string().max(100)).max(10).default([]),
  registration_number: z.string().max(100).nullable().default(null),
  registration_authority: z.string().max(100).nullable().default(null),
  registration_date: z.string().nullable().default(null),
  organisation_type: OrganisationTypeSchema.default("OTHER"),

  // Services
  service_categories: z.array(IncidentTypeSchema).min(1, "At least one service category required"),
  supported_subject_types: z.array(IncidentSubjectTypeSchema).min(1),
  assistance_capabilities: z.array(z.string().max(100)).max(30).default([]),
  specialised_services: z.array(z.string().max(100)).max(20).default([]),

  // Geography
  operational_states: z.array(z.string().max(50)).min(1).default(["Delhi"]),
  operational_districts: z.array(z.string().max(100)).min(1),
  service_areas: z.array(z.string().max(100)).max(50).default([]),
  headquarters_location: NGOLocationSchema,
  service_radius_km: z.number().positive().max(500).default(20),

  // Operations
  availability_status: AvailabilityStatusSchema.default("UNKNOWN"),
  capacity_status: CapacityStatusSchema.default("UNKNOWN"),
  accepting_assignments: z.boolean().default(true),
  operating_hours: z.string().max(100).default("09:00 - 18:00"),
  service_constraints: z.array(z.string().max(200)).max(20).default([]),
  active_cases: z.number().int().nonnegative().default(0),
  max_concurrent_cases: z.number().int().positive().default(5),

  // Verification
  registration_status: RegistrationStatusSchema.default("PENDING_CHECK"),
  verification_status: VerificationStatusSchema.default("UNVERIFIED"),
  last_verified_at: z.string().datetime().nullable().default(null),
  verification_source: z.string().max(100).nullable().default(null),
  verification_evidence: z.array(NGOPrivateEvidenceSchema).default([]),

  // Performance
  assignment_history: NGOResponseHistorySchema.default({
    total_assignments: 0,
    accepted_assignments: 0,
    completed_interventions: 0,
    rejected_assignments: 0,
    average_response_minutes: null,
    sample_size: 0,
  }),

  // Contact (Restricted/Private to Coordinators)
  contact: NGOContactSchema.default({
    phone: null,
    email: null,
    emergency_phone: null,
    coordinator_name: null,
    is_phone_verified: false,
  }),

  // Metadata
  source_type: z.enum(["manual_entry", "csv_import", "ngo_darpan_seed", "synthetic_fixture"]).default("manual_entry"),
  source_reference: z.string().max(200).default("system"),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type NGODocument = z.infer<typeof NGOSchema>;

/**
 * Public Sanitized NGO View (PII and internal verification audit redacted)
 */
export const SanitizedPublicNGOSchema = NGOSchema.omit({
  contact: true,
  verification_evidence: true,
}).extend({
  public_contact_available: z.boolean(),
  verification_badge: VerificationStatusSchema,
});
export type SanitizedPublicNGO = z.infer<typeof SanitizedPublicNGOSchema>;

