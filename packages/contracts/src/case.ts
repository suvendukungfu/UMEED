import { z } from "zod";

/**
 * UMEED Canonical Case & Coordination Contract (Phase 5)
 *
 * Models closed-loop assistance coordination across:
 * - Approved incident to operational case transition
 * - Multi-NGO assignment lifecycle
 * - Field intervention provenance and evidence capture
 * - Recursive follow-up matching loops
 * - Authorized human-reviewed case resolution
 */

export const CaseStatusSchema = z.enum([
  "APPROVED",
  "MATCHING",
  "RESPONDERS_CONTACTED",
  "ACCEPTED",
  "RESPONDER_ARRIVED",
  "INTERVENTION_PROVIDED",
  "FOLLOW_UP_REQUIRED",
  "RESOLVED",
  "CANCELLED",
  "REJECTED",
  "REOPENED",
  "ESCALATED",
]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const AssignmentStatusSchema = z.enum([
  "PROPOSED",
  "CONTACT_READY",
  "CONTACT_QUEUED",
  "CONTACTED",
  "ACKNOWLEDGED",
  "ACCEPTED",
  "REJECTED",
  "REQUESTED_INFORMATION",
  "EN_ROUTE",
  "ARRIVED",
  "INTERVENTION_RECORDED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "CONTACT_FAILED",
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const InterventionTypeSchema = z.enum([
  "food_provided",
  "first_aid_provided",
  "veterinary_assessment",
  "medical_assistance",
  "shelter_provided",
  "transport_arranged",
  "other",
]);
export type InterventionType = z.infer<typeof InterventionTypeSchema>;

export const InterventionEvidenceItemSchema = z.object({
  type: z.enum(["image", "document", "note"]),
  url: z.string().min(1).max(2048),
  notes: z.string().max(500).optional(),
});
export type InterventionEvidenceItem = z.infer<typeof InterventionEvidenceItemSchema>;

export const InterventionRecordSchema = z.object({
  intervention_id: z.string().min(1).max(100),
  case_id: z.string().min(1).max(100),
  assignment_id: z.string().min(1).max(100),
  organisation_id: z.string().min(1).max(100),
  intervention_type: InterventionTypeSchema,
  description: z.string().min(1).max(5000),
  assistance_provided: z.array(z.string().min(1).max(200)).max(20),
  evidence_references: z.array(InterventionEvidenceItemSchema).max(10).default([]),
  additional_needs: z.array(z.string().min(1).max(200)).max(20).default([]),
  performed_at: z.string().datetime(),
  submitted_by: z.string().min(1).max(200),
  verification_status: z.enum(["SUBMITTED", "VERIFIED", "FLAGGED"]).default("SUBMITTED"),
  verified_by: z.string().max(100).nullable().optional(),
  verified_at: z.string().datetime().nullable().optional(),
});
export type InterventionRecord = z.infer<typeof InterventionRecordSchema>;

export const AssignmentContactAttemptSchema = z.object({
  attempt_id: z.string().min(1).max(100),
  channel: z.enum(["in_app", "sms", "whatsapp", "email", "phone_call"]),
  initiated_at: z.string().datetime(),
  status: z.enum(["QUEUED", "DELIVERED", "SIMULATED_MOCK", "FAILED"]),
  details: z.string().max(500),
});
export type AssignmentContactAttempt = z.infer<typeof AssignmentContactAttemptSchema>;

export const CaseAssignmentSchema = z.object({
  assignment_id: z.string().min(1).max(100),
  case_id: z.string().min(1).max(100),
  organisation_id: z.string().min(1).max(100),
  organisation_name: z.string().min(1).max(200),
  requirement: z.string().min(1).max(200),
  matching_cycle: z.number().int().min(1),
  status: AssignmentStatusSchema,
  assigned_by: z.string().min(1).max(100),
  assigned_at: z.string().datetime(),
  response_deadline: z.string().datetime(),
  acknowledged_at: z.string().datetime().nullable().optional(),
  accepted_at: z.string().datetime().nullable().optional(),
  rejected_at: z.string().datetime().nullable().optional(),
  rejection_reason: z.string().max(500).nullable().optional(),
  info_requested: z.string().max(1000).nullable().optional(),
  info_provided: z.string().max(1000).nullable().optional(),
  en_route_at: z.string().datetime().nullable().optional(),
  arrived_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  contact_attempts: z.array(AssignmentContactAttemptSchema).max(20).default([]),
});
export type CaseAssignment = z.infer<typeof CaseAssignmentSchema>;

export const CaseEventSchema = z.object({
  event_id: z.string().min(1).max(100),
  case_id: z.string().min(1).max(100),
  event_type: z.string().min(1).max(100),
  previous_state: z.string().nullable().optional(),
  new_state: z.string().nullable().optional(),
  actor: z.string().min(1).max(100),
  actor_role: z.enum(["coordinator", "responder", "system"]),
  rationale: z.string().max(1000),
  metadata: z.record(z.string().max(100), z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type CaseEvent = z.infer<typeof CaseEventSchema>;

export const CaseResolutionDecisionSchema = z.object({
  decision: z.enum(["RESOLVED", "UNRESOLVED_ESCALATED", "CANCELLED"]),
  rationale: z.string().min(1).max(1000),
  resolved_by: z.string().min(1).max(100),
  timestamp: z.string().datetime(),
});
export type CaseResolutionDecision = z.infer<typeof CaseResolutionDecisionSchema>;

export const CaseSchema = z.object({
  case_id: z.string().min(1).max(100),
  incident_id: z.string().min(1).max(100),
  incident_reference: z.string().min(1).max(100),
  public_case_reference: z.string().min(1).max(100),
  case_status: CaseStatusSchema,
  assistance_requirements: z.array(z.string().min(1).max(200)).min(1).max(20),
  unresolved_requirements: z.array(z.string().min(1).max(200)).max(20).default([]),
  assignments: z.array(CaseAssignmentSchema).max(50).default([]),
  interventions: z.array(InterventionRecordSchema).max(50).default([]),
  current_matching_cycle: z.number().int().min(1).default(1),
  max_matching_cycles: z.number().int().min(1).max(10).default(3),
  created_by: z.string().min(1).max(100),
  approved_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable().default(null),
  resolution_evidence: z.array(z.string().max(2048)).max(20).default([]),
  resolution_decision: CaseResolutionDecisionSchema.nullable().default(null),
});
export type Case = z.infer<typeof CaseSchema>;

/**
 * Public/Sanitized Case View
 * Protects beneficiary private data and ensures citizen tracking tokens are never exposed.
 */
export const SanitizedCaseSchema = CaseSchema.omit({
  // Redact internal notes and coordinator audit identifiers
  created_by: true,
}).extend({
  is_sanitized: z.literal(true).default(true),
});
export type SanitizedCase = z.infer<typeof SanitizedCaseSchema>;

// Input DTOs
export const CreateCaseInputSchema = z.object({
  incident_public_reference: z.string().min(1).max(100),
  assistance_requirements: z.array(z.string().min(1).max(200)).min(1).max(20).optional(),
  max_matching_cycles: z.number().int().min(1).max(10).default(3),
  coordinator_notes: z.string().max(1000).optional(),
});
export type CreateCaseInput = z.input<typeof CreateCaseInputSchema>;

export const AssignNGOsInputSchema = z.object({
  assignments: z
    .array(
      z.object({
        organisation_id: z.string().min(1).max(100),
        requirement: z.string().min(1).max(200),
        response_deadline_hours: z.number().min(0.5).max(72).optional().default(2),
      })
    )
    .min(1)
    .max(10),
});
export type AssignNGOsInput = z.input<typeof AssignNGOsInputSchema>;

export const AssignmentActionInputSchema = z.object({
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  info_text: z.string().max(1000).optional(),
});
export type AssignmentActionInput = z.input<typeof AssignmentActionInputSchema>;

export const InterventionInputSchema = z.object({
  intervention_type: InterventionTypeSchema,
  description: z.string().min(1, "Intervention description is required").max(5000),
  assistance_provided: z.array(z.string().min(1).max(200)).min(1, "At least one assistance item must be provided"),
  evidence_references: z.array(InterventionEvidenceItemSchema).max(10).optional().default([]),
  additional_needs: z.array(z.string().min(1).max(200)).max(20).optional().default([]),
  performed_at: z.string().datetime().optional(),
});
export type InterventionInput = z.input<typeof InterventionInputSchema>;

export const CaseResolutionInputSchema = z.object({
  decision: z.enum(["RESOLVED", "UNRESOLVED_ESCALATED", "CANCELLED"]),
  rationale: z.string().min(5, "Resolution rationale must be at least 5 characters").max(1000),
  evidence_urls: z.array(z.string().max(2048)).max(20).optional().default([]),
  override_unresolved: z.boolean().optional().default(false),
});
export type CaseResolutionInput = z.input<typeof CaseResolutionInputSchema>;
