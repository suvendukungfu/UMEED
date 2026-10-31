import { z } from "zod";
import {
  IncidentTypeSchema,
  IncidentSubjectTypeSchema,
  TriageUrgencyLevelSchema,
} from "@umeed/contracts";

/**
 * Strict Structured Output Schema for Gemini Multimodal Triage.
 *
 * Security & Defense:
 * - All string lengths, array elements, and confidence ranges are strictly bounded.
 * - JSON responses must validate completely against this schema.
 * - AI is an assistant; requires_human_review is unconditionally enforced.
 */

export const GeminiObservableEvidenceSchema = z.object({
  observation: z
    .string()
    .min(1, "Observation must not be empty")
    .max(500, "Observation exceeds 500 characters"),
  evidence_reference: z
    .string()
    .min(1, "evidence_reference must not be empty")
    .max(100, "evidence_reference exceeds 100 characters"),
  confidence: z
    .number()
    .min(0, "Confidence cannot be less than 0.0")
    .max(1, "Confidence cannot exceed 1.0"),
});
export type GeminiObservableEvidence = z.infer<typeof GeminiObservableEvidenceSchema>;

export const GeminiUrgencyRecommendationSchema = z.object({
  level: TriageUrgencyLevelSchema,
  reasoning: z
    .array(z.string().min(1).max(500))
    .min(1, "At least one reasoning string must be provided")
    .max(10, "Maximum 10 reasoning statements"),
  requires_human_review: z.literal(true).default(true),
});
export type GeminiUrgencyRecommendation = z.infer<typeof GeminiUrgencyRecommendationSchema>;

export const GeminiModelMetadataSchema = z.object({
  model_id: z.string().min(1).max(100),
  prompt_version: z.string().min(1).max(20),
  latency_ms: z.number().nonnegative().optional(),
});
export type GeminiModelMetadata = z.infer<typeof GeminiModelMetadataSchema>;

export const GeminiTriageOutputSchema = z.object({
  incident_category: IncidentTypeSchema,
  subject_type: IncidentSubjectTypeSchema,
  observable_evidence: z
    .array(GeminiObservableEvidenceSchema)
    .max(20, "Maximum 20 evidence observations allowed")
    .default([]),
  possible_assistance: z
    .array(z.string().min(1).max(200))
    .max(10, "Maximum 10 assistance recommendations allowed")
    .default([]),
  urgency_recommendation: GeminiUrgencyRecommendationSchema,
  location_candidates: z
    .array(z.string().min(1).max(300))
    .max(10, "Maximum 10 location candidates allowed")
    .default([]),
  missing_information: z
    .array(z.string().min(1).max(300))
    .max(10, "Maximum 10 missing information items allowed")
    .default([]),
  limitations: z
    .array(z.string().min(1).max(500))
    .max(10, "Maximum 10 limitation items allowed")
    .default([]),
  model_metadata: GeminiModelMetadataSchema.optional(),
});

export type GeminiTriageOutput = z.infer<typeof GeminiTriageOutputSchema>;
