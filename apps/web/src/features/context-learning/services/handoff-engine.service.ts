import {
  HandoffCheckpoint,
  HandoffCheckpointStatus,
  FollowUpRecommendation,
  HistoricalLesson,
  ContextRetrievalEvidence,
} from "../types";

export interface HandoffEvaluationInput {
  caseReference: string;
  category: string;
  currentCycle: number;
  completedInterventions: Array<{
    interventionId: string;
    type: string;
    providerName: string;
    completedAt: string;
    notes?: string;
  }>;
  existingCheckpoints: HandoffCheckpoint[];
  contextLesson?: HistoricalLesson | null;
  maxCycles?: number;
}

export interface HandoffEvaluationResult {
  updatedCheckpoints: HandoffCheckpoint[];
  recommendation: FollowUpRecommendation;
  isIncompleteHandoff: boolean;
  canResolveCase: boolean;
}

export class HandoffIntelligenceEngine {
  private readonly defaultMaxCycles = 3;

  /**
   * Initializes standard baseline checkpoints for a given category.
   * If Meko context is present, augments baseline with contextual handoff checkpoints.
   */
  public generateInitialCheckpoints(
    category: string,
    contextLesson?: HistoricalLesson | null
  ): HandoffCheckpoint[] {
    const checkpoints: HandoffCheckpoint[] = [];

    if (category === "animal_welfare" || category === "stray_animal_medical") {
      checkpoints.push({
        checkpoint_id: "chk_rescue_transport",
        requirement_id: "req_animal_rescue",
        title: "Field Rescue & Transport",
        required_action: "Locate, secure, and transport distress animal to authorized facility",
        responsible_provider_or_role: "Field Rescue NGO",
        current_status: "AWAITING_ASSIGNMENT",
        stage_order: 1,
        evidence_of_completion: null,
        verification_timestamp: null,
        verified_by_coordinator_id: null,
        requires_human_confirmation: true,
        is_context_injected: false,
        injected_by_memory_id: null,
      });

      // Contextual augmentation: If Meko context provides lesson on receiving provider acceptance
      if (contextLesson && contextLesson.lesson_text.toLowerCase().includes("receiving")) {
        checkpoints.push({
          checkpoint_id: "chk_receiving_acceptance",
          requirement_id: "req_veterinary_handoff",
          title: "Receiving Provider Acceptance",
          required_action: "Verify receiving hospital or shelter formally accepted intake and initiated clinical triage",
          responsible_provider_or_role: "Receiving Veterinary Hospital / Doctor",
          current_status: "RECOMMENDED",
          stage_order: 2,
          evidence_of_completion: null,
          verification_timestamp: null,
          verified_by_coordinator_id: null,
          requires_human_confirmation: true,
          is_context_injected: true,
          injected_by_memory_id: contextLesson.memory_id || "mem_handoff_precedent",
          notes: "Injected via Meko historical memory precedent to prevent beneficiary rejection.",
        });
      }
    } else {
      // Generic assistance flow
      checkpoints.push({
        checkpoint_id: "chk_primary_intervention",
        requirement_id: "req_primary",
        title: "Primary Field Intervention",
        required_action: "Deliver on-site relief or emergency service",
        responsible_provider_or_role: "Assigned Primary NGO",
        current_status: "AWAITING_ASSIGNMENT",
        stage_order: 1,
        evidence_of_completion: null,
        verification_timestamp: null,
        verified_by_coordinator_id: null,
        requires_human_confirmation: true,
        is_context_injected: false,
        injected_by_memory_id: null,
      });
    }

    return checkpoints;
  }

  /**
   * Deterministically evaluates the current state of a case's handoff checkpoints
   * against completed interventions and Meko contextual intelligence.
   */
  public evaluateHandoff(input: HandoffEvaluationInput): HandoffEvaluationResult {
    const maxCycles = input.maxCycles ?? this.defaultMaxCycles;
    const now = new Date().toISOString();

    // 1. Check for infinite loop / cycle exhaustion
    if (input.currentCycle >= maxCycles) {
      const rec: FollowUpRecommendation = {
        recommendation_id: `rec_${Date.now()}_escalate`,
        case_reference: input.caseReference,
        suggested_action: "ESCALATE_TO_COORDINATOR",
        rationale: `Case has reached maximum allowed coordination cycles (${maxCycles}). Halting automated cycle to prevent infinite loop.`,
        current_case_evidence: [
          `Cycles completed: ${input.currentCycle} / ${maxCycles}`,
          `Total completed interventions: ${input.completedInterventions.length}`,
        ],
        historical_context_used: null,
        unverified_checkpoints: input.existingCheckpoints
          .filter((c) => c.current_status !== "VERIFIED_COMPLETE")
          .map((c) => c.title),
        required_coordinator_action: "Manual case review and direct provider dispatch required.",
        cycle_count: input.currentCycle,
        is_terminal: true,
        generated_at: now,
      };

      return {
        updatedCheckpoints: input.existingCheckpoints,
        recommendation: rec,
        isIncompleteHandoff: true,
        canResolveCase: false,
      };
    }

    // 2. Clone checkpoints and reconcile against completed interventions
    const updatedCheckpoints: HandoffCheckpoint[] = input.existingCheckpoints.map((chk) => ({ ...chk }));

    // If context lesson is provided and not yet registered in checkpoints, inject it
    if (
      input.contextLesson &&
      input.contextLesson.lesson_text.toLowerCase().includes("receiving") &&
      !updatedCheckpoints.some((c) => c.checkpoint_id === "chk_receiving_acceptance")
    ) {
      updatedCheckpoints.push({
        checkpoint_id: "chk_receiving_acceptance",
        requirement_id: "req_veterinary_handoff",
        title: "Receiving Provider Acceptance",
        required_action: "Verify receiving hospital or shelter formally accepted intake and initiated clinical triage",
        responsible_provider_or_role: "Receiving Veterinary Hospital / Doctor",
        current_status: "RECOMMENDED",
        stage_order: 2,
        evidence_of_completion: null,
        verification_timestamp: null,
        verified_by_coordinator_id: null,
        requires_human_confirmation: true,
        is_context_injected: true,
        injected_by_memory_id: input.contextLesson.memory_id || "mem_handoff_precedent",
        notes: "Injected via Meko historical memory precedent to prevent beneficiary rejection.",
      });
    }

    // Reconcile rescue/primary checkpoint
    const primaryIntervention = input.completedInterventions.find(
      (i) => i.type.toLowerCase().includes("rescue") || i.type.toLowerCase().includes("primary")
    );

    const primaryChk = updatedCheckpoints.find((c) => c.stage_order === 1);
    if (primaryChk && primaryIntervention && primaryChk.current_status !== "VERIFIED_COMPLETE") {
      primaryChk.current_status = "VERIFICATION_REQUIRED";
      primaryChk.evidence_of_completion = `Intervention ${primaryIntervention.interventionId} reported by ${primaryIntervention.providerName}`;
    }

    // 3. Determine if downstream handoff is incomplete
    const receivingChk = updatedCheckpoints.find((c) => c.checkpoint_id === "chk_receiving_acceptance");
    const isRescueCompletedOrPendingVerification =
      primaryChk &&
      (primaryChk.current_status === "VERIFIED_COMPLETE" || primaryChk.current_status === "VERIFICATION_REQUIRED");

    let isIncompleteHandoff = false;
    let recommendation: FollowUpRecommendation;

    if (receivingChk && isRescueCompletedOrPendingVerification && receivingChk.current_status !== "VERIFIED_COMPLETE") {
      isIncompleteHandoff = true;

      // Ensure receiving checkpoint moves to active tracking
      if (receivingChk.current_status === "RECOMMENDED" || receivingChk.current_status === "NOT_REQUIRED") {
        receivingChk.current_status = "AWAITING_PROVIDER_ACCEPTANCE";
      }

      const historicalEvidence: ContextRetrievalEvidence | null = input.contextLesson?.evidence ?? (
        input.contextLesson
          ? {
              memory_id: input.contextLesson.memory_id || "mem_handoff_precedent",
              datapack_id: "umeed-product-context",
              source_quote: input.contextLesson.lesson_text,
              relevance_score: 0.92,
              retrieved_at: now,
              is_promoted: true,
              reasoning: "Historical incident proved rescue pickup alone does not ensure medical admission.",
            }
          : null
      );

      recommendation = {
        recommendation_id: `rec_${Date.now()}_handoff`,
        case_reference: input.caseReference,
        suggested_action: "ASSIGN_RECEIVING_PROVIDER",
        rationale:
          "Field rescue is completed, but receiving clinical provider acceptance remains unverified. Historical precedent indicates risk of patient abandonment if handoff is not verified.",
        current_case_evidence: [
          `Primary rescue reported by ${primaryIntervention?.providerName || "responder"}`,
          "Downstream medical admission checkpoint 'Receiving Provider Acceptance' is incomplete",
        ],
        historical_context_used: historicalEvidence,
        unverified_checkpoints: ["Receiving Provider Acceptance"],
        required_coordinator_action:
          "Contact receiving hospital/shelter to confirm intake bed availability and signed acceptance before closing case.",
        cycle_count: input.currentCycle,
        is_terminal: false,
        generated_at: now,
      };
    } else if (updatedCheckpoints.every((c) => c.current_status === "VERIFIED_COMPLETE")) {
      recommendation = {
        recommendation_id: `rec_${Date.now()}_complete`,
        case_reference: input.caseReference,
        suggested_action: "RESOLVE_ASSISTANCE_JOURNEY",
        rationale: "All sequential handoff checkpoints have been verified complete with affirmative coordinator confirmation.",
        current_case_evidence: [
          `All ${updatedCheckpoints.length} handoff checkpoints verified complete`,
          `Total completed interventions: ${input.completedInterventions.length}`,
        ],
        historical_context_used: null,
        unverified_checkpoints: [],
        required_coordinator_action: "Coordinator may now safely transition case to RESOLVED status.",
        cycle_count: input.currentCycle,
        is_terminal: true,
        generated_at: now,
      };
    } else {
      recommendation = {
        recommendation_id: `rec_${Date.now()}_proceed`,
        case_reference: input.caseReference,
        suggested_action: "PROCEED_TO_HANDOFF_VERIFICATION",
        rationale: "Assistance is in progress. Verify pending checkpoints as field reports arrive.",
        current_case_evidence: [
          `Checkpoints total: ${updatedCheckpoints.length}`,
          `Verified complete: ${updatedCheckpoints.filter((c) => c.current_status === "VERIFIED_COMPLETE").length}`,
        ],
        historical_context_used: null,
        unverified_checkpoints: updatedCheckpoints
          .filter((c) => c.current_status !== "VERIFIED_COMPLETE")
          .map((c) => c.title),
        required_coordinator_action: "Awaiting field responder documentation and coordinator verification.",
        cycle_count: input.currentCycle,
        is_terminal: false,
        generated_at: now,
      };
    }

    const canResolveCase = updatedCheckpoints.every((c) => c.current_status === "VERIFIED_COMPLETE");

    return {
      updatedCheckpoints,
      recommendation,
      isIncompleteHandoff,
      canResolveCase,
    };
  }

  /**
   * Pure functional verification of a handoff checkpoint by a human coordinator.
   * UMEED rules: Meko context CANNOT mark a checkpoint complete; only human confirmation can.
   */
  public verifyCheckpoint(
    checkpoint: HandoffCheckpoint,
    coordinatorId: string,
    evidenceNotes: string
  ): HandoffCheckpoint {
    if (!evidenceNotes || evidenceNotes.trim().length < 5) {
      throw new Error("Verification requires substantive human evidence notes (minimum 5 characters).");
    }

    return {
      ...checkpoint,
      current_status: "VERIFIED_COMPLETE",
      evidence_of_completion: evidenceNotes.trim(),
      verification_timestamp: new Date().toISOString(),
      verified_by_coordinator_id: coordinatorId,
      requires_human_confirmation: false,
    };
  }
}
