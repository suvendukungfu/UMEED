import { z } from "zod";
import { IncidentTypeSchema, IncidentSubjectTypeSchema, TriageUrgencyLevelSchema } from "./incident";
import { VerificationStatusSchema } from "./ngo";

export const MatchWeightsSchema = z.object({
  capability: z.number().min(0).max(1).default(0.40),
  geographic_coverage: z.number().min(0).max(1).default(0.25),
  distance: z.number().min(0).max(1).default(0.15),
  availability: z.number().min(0).max(1).default(0.10),
  capacity: z.number().min(0).max(1).default(0.10),
});
export type MatchWeights = z.infer<typeof MatchWeightsSchema>;

export const MatchComponentScoresSchema = z.object({
  capability_score: z.number().min(0).max(1),
  coverage_score: z.number().min(0).max(1),
  distance_score: z.number().min(0).max(1),
  availability_score: z.number().min(0).max(1),
  capacity_score: z.number().min(0).max(1),
  history_score: z.number().min(0).max(1).nullable(),
});
export type MatchComponentScores = z.infer<typeof MatchComponentScoresSchema>;

export const MatchCandidateSchema = z.object({
  ngo_id: z.string(),
  organisation_name: z.string(),
  verification_status: VerificationStatusSchema,
  total_score: z.number().min(0).max(1),
  eligible: z.boolean(),
  ineligibility_reason: z.string().nullable().default(null),
  component_scores: MatchComponentScoresSchema,
  matched_capabilities: z.array(z.string()),
  geographic_reasoning: z.string(),
  distance_km: z.number().nullable().default(null),
  availability_evidence: z.string(),
  capacity_evidence: z.string(),
  missing_information: z.array(z.string()).default([]),
  explanation: z.string(),
  is_demo: z.boolean().default(false),
});
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;

export const MatchResultSchema = z.object({
  incident_reference: z.string(),
  incident_category: IncidentTypeSchema,
  subject_type: IncidentSubjectTypeSchema,
  incident_district: z.string().nullable(),
  incident_coordinates: z.tuple([z.number(), z.number()]).nullable(),
  total_candidates_evaluated: z.number().int().nonnegative(),
  eligible_candidates_count: z.number().int().nonnegative(),
  candidates: z.array(MatchCandidateSchema),
  weights_used: MatchWeightsSchema,
  generated_at: z.string().datetime(),
  explanation_summary: z.string(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;
