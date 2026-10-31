export type { MemoryInfluenceCitation } from "@/lib/ai/meko/agents";
import { z } from "zod";
import { MatchResult } from "@umeed/contracts";
import {
  MatchingAgentContextResult,
  MemoryInfluenceCitation,
  FollowUpAgentContextResult,
} from "@/lib/ai/meko/agents";

/**
 * UMEED Handoff Intelligence Domain Types
 * Defines the contracts for multi-stage assistance handoff coordination,
 * contextual lessons learned, and coordinator verification checkpoints.
 */

export const HandoffCheckpointStatusSchema = z.enum([
  "NOT_REQUIRED",
  "RECOMMENDED",
  "AWAITING_ASSIGNMENT",
  "AWAITING_PROVIDER_ACCEPTANCE",
  "IN_PROGRESS",
  "VERIFICATION_REQUIRED",
  "VERIFIED_COMPLETE",
  "BLOCKED",
]);
export type HandoffCheckpointStatus = z.infer<typeof HandoffCheckpointStatusSchema>;

export const HandoffCheckpointSchema = z.object({
  checkpoint_id: z.string().min(1),
  requirement_id: z.string().min(1),
  title: z.string().min(1),
  required_action: z.string().min(1),
  responsible_provider_or_role: z.string().min(1),
  current_status: HandoffCheckpointStatusSchema,
  stage_order: z.number().int().min(1),
  evidence_of_completion: z.string().nullable().default(null),
  verification_timestamp: z.string().datetime().nullable().default(null),
  verified_by_coordinator_id: z.string().nullable().default(null),
  requires_human_confirmation: z.boolean().default(true),
  is_context_injected: z.boolean().default(false),
  injected_by_memory_id: z.string().nullable().default(null),
  notes: z.string().optional(),
});
export type HandoffCheckpoint = z.infer<typeof HandoffCheckpointSchema>;

export const ContextRetrievalEvidenceSchema = z.object({
  memory_id: z.string().min(1),
  datapack_id: z.string().min(1),
  source_quote: z.string().min(1),
  relevance_score: z.number().min(0).max(1),
  retrieved_at: z.string().datetime(),
  is_promoted: z.boolean().default(false),
  reasoning: z.string().min(1),
});
export type ContextRetrievalEvidence = z.infer<typeof ContextRetrievalEvidenceSchema>;

export const HistoricalLessonSchema = z.object({
  lesson_id: z.string().min(1),
  memory_id: z.string().optional(),
  category: z.string().min(1),
  lesson_text: z.string().min(1),
  applicability_condition: z.string().min(1),
  injected_checkpoints: z.array(HandoffCheckpointSchema).default([]).optional(),
  evidence: ContextRetrievalEvidenceSchema.optional(),
});
export type HistoricalLesson = z.infer<typeof HistoricalLessonSchema>;

export const FollowUpRecommendationSchema = z.object({
  recommendation_id: z.string().min(1),
  case_reference: z.string().min(1),
  suggested_action: z.enum([
    "PROCEED_TO_HANDOFF_VERIFICATION",
    "ASSIGN_RECEIVING_PROVIDER",
    "DISPATCH_SECONDARY_INTERVENTION",
    "AWAIT_CLINICAL_DISCHARGE",
    "RESOLVE_ASSISTANCE_JOURNEY",
    "ESCALATE_TO_COORDINATOR",
  ]),
  rationale: z.string().min(1),
  current_case_evidence: z.array(z.string()).min(1),
  historical_context_used: ContextRetrievalEvidenceSchema.nullable().default(null),
  unverified_checkpoints: z.array(z.string()).default([]),
  required_coordinator_action: z.string().min(1),
  cycle_count: z.number().int().min(1).default(1),
  is_terminal: z.boolean().default(false),
  generated_at: z.string().datetime(),
});
export type FollowUpRecommendation = z.infer<typeof FollowUpRecommendationSchema>;

export const HumanApprovalSchema = z.object({
  approval_id: z.string().min(1),
  checkpoint_id: z.string().min(1),
  case_reference: z.string().min(1),
  approved_by_user_id: z.string().min(1),
  approved_at: z.string().datetime(),
  decision: z.enum(["APPROVED", "REJECTED", "MODIFIED"]),
  verification_notes: z.string().min(1),
});
export type HumanApproval = z.infer<typeof HumanApprovalSchema>;

export const KnowledgePromotionStatusSchema = z.enum([
  "NOT_PROMOTED",
  "PROMOTION_PROPOSED",
  "PREVIEW_CONFIRMED",
  "PROMOTED_TO_SHARED_KNOWLEDGE",
  "PROMOTION_REJECTED",
]);
export type KnowledgePromotionStatus = z.infer<typeof KnowledgePromotionStatusSchema>;

export interface ContextTraceRecord {
  trace_id: string;
  case_reference: string;
  incident_reference: string;
  agent_id: string;
  operation: "READ" | "WRITE" | "UPDATE" | "DELETE" | "PROMOTE";
  datapack_id: string;
  datapack_name: string;
  recalled_memory_id?: string;
  memory_content?: string;
  relevance_score?: number;
  influence_summary: string;
  is_shared_knowledge: boolean;
  latency_ms: number;
  timestamp: string;
}

export interface GroundedMatchingResult {
  matchResult: MatchResult;
  contextResult: MatchingAgentContextResult;
  groundedRequirements: string[];
  trace: ContextTraceRecord | null;
}

export interface GroundedFollowUpResult {
  suggestedAction: "DISPATCH_SECONDARY" | "ESCALATE_COORDINATOR" | "REQUEST_FIELD_EVALUATION";
  applicableProcedures: string[];
  unresolvedNeeds: string[];
  rationale: string;
  citations: MemoryInfluenceCitation[];
  trace: ContextTraceRecord | null;
}
