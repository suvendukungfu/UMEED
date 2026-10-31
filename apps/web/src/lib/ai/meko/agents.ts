/**
 * UMEED Product Agent Interfaces (Section 7)
 * Defines the contracts for:
 * 1. Matching Agent: Recalls approved context before reasoning and explains requirement modifications.
 * 2. Follow-Up Agent: Reviews unresolved needs and recalls prior coordination lessons.
 * 3. Knowledge Curator: Proposes de-identified operational learnings and requests human approval.
 */

export interface MemoryInfluenceCitation {
  memory_id: string;
  source_quote: string;
  relevance_score: number;
  reasoning: string;
  injected_requirements?: string[];
}

export interface MatchingAgentContextResult {
  has_recalled_context: boolean;
  retrieved_memories: Array<{
    id: string;
    text: string;
    score: number;
  }>;
  modified_requirements: string[];
  influence_citations: MemoryInfluenceCitation[];
  explanation: string;
}

export interface FollowUpAgentContextResult {
  has_previous_lessons: boolean;
  unresolved_needs: string[];
  suggested_action: "DISPATCH_SECONDARY" | "ESCALATE_COORDINATOR" | "REQUEST_FIELD_EVALUATION";
  applicable_procedures: string[];
  memory_citations: MemoryInfluenceCitation[];
  rationale: string;
}

export interface ProposedCuratedLesson {
  proposal_id: string;
  source_case_reference: string;
  category: string;
  deidentified_lesson_text: string;
  supporting_outcome_summary: string;
  pii_audit_passed: boolean;
  created_at: string;
  status: "DRAFT_PENDING_APPROVAL" | "APPROVED_BY_COORDINATOR" | "REJECTED_BY_COORDINATOR";
}

/**
 * 1. Matching Agent Interface
 */
export interface IMatchingAgent {
  readonly agentId: string;

  /**
   * Recalls relevant approved operational memories before deterministic matching.
   * If a relevant lesson is recalled (e.g. separating animal rescue from veterinary follow-up),
   * augments the required assistance categories and explains the influence.
   */
  recallMatchingContext(
    incidentCategory: string,
    initialRequirements: string[],
    options?: { datapackId?: string; conversationId?: string }
  ): Promise<MatchingAgentContextResult>;
}

/**
 * 2. Follow-Up Agent Interface
 */
export interface IFollowUpAgent {
  readonly agentId: string;

  /**
   * Reviews completed interventions and unfulfilled needs to recommend subsequent actions.
   */
  recallFollowUpProcedures(
    category: string,
    unresolvedNeeds: string[],
    options?: { datapackId?: string; conversationId?: string }
  ): Promise<FollowUpAgentContextResult>;
}

/**
 * 3. Knowledge Curator Interface
 */
export interface IKnowledgeCurator {
  readonly agentId: string;

  /**
   * Proposes a clean, de-identified operational lesson candidate from a resolved case.
   */
  proposeLessonFromCase(caseOutcome: {
    publicCaseReference: string;
    category: string;
    interventionSummary: string;
    secondaryCycleSummary?: string;
  }): ProposedCuratedLesson;

  /**
   * Persists an approved lesson into private memory via Meko memory_add after coordinator sign-off.
   */
  persistApprovedLesson(
    lesson: ProposedCuratedLesson,
    coordinatorId: string
  ): Promise<{ memory_id: string; status: "SAVED" }>;

  /**
   * Promotes private memory into shared knowledge via Meko memory_promote
   * after explicit user confirmation of shared visibility.
   */
  confirmAndPromoteLesson(
    memoryId: string,
    coordinatorId: string,
    confirmationNotes: string
  ): Promise<{ status: "PROMOTED"; promoted_ids: string[] }>;
}
