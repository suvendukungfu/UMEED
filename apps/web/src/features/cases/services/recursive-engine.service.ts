import crypto from "crypto";
import { Case, CaseEvent } from "../types";
import { MatchResult, MatchCandidate } from "@umeed/contracts";
import { ICaseRepository, getCaseRepository } from "../repositories";
import { IIncidentRepository, getIncidentRepository } from "@/features/incidents/repositories";
import { INGORepository, getNGORepository } from "@/features/ngos/repositories";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { assertValidCaseTransition } from "../state-machine";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export interface RecursiveCycleResult {
  case: Case;
  nextMatching: MatchResult | null;
  escalated: boolean;
  reason?: string;
}

export class RecursiveAssistanceEngine {
  private caseRepo: ICaseRepository;
  private incidentRepo: IIncidentRepository;
  private ngoRepo: INGORepository;
  private matchingService: ExplainableMatchingService;

  constructor(options?: {
    caseRepo?: ICaseRepository;
    incidentRepo?: IIncidentRepository;
    ngoRepo?: INGORepository;
    matchingService?: ExplainableMatchingService;
  }) {
    this.caseRepo = options?.caseRepo || getCaseRepository();
    this.incidentRepo = options?.incidentRepo || getIncidentRepository();
    this.ngoRepo = options?.ngoRepo || getNGORepository();
    this.matchingService =
      options?.matchingService ||
      new ExplainableMatchingService(this.ngoRepo, this.incidentRepo);
  }

  /**
   * Executes a recursive assistance follow-up cycle.
   *
   * UMEED Central Differentiator:
   * 1. Preserves original interventions and completed items.
   * 2. Evaluates remaining unresolved needs and additional needs.
   * 3. Prevents infinite loops via bounded max_matching_cycles.
   * 4. Excludes previously rejected or failed organisations for this requirement.
   * 5. Automatically escalates if limits are exceeded or zero suitable NGOs remain.
   */
  async triggerFollowUpCycle(
    caseReference: string,
    coordinatorId: string
  ): Promise<RecursiveCycleResult> {
    const caseRecord = await this.caseRepo.findByReference(caseReference);
    if (!caseRecord) {
      throw ApiError.notFound(`Case '${caseReference}' not found.`);
    }

    const now = new Date().toISOString();

    // Check if any requirements remain unresolved
    if (caseRecord.unresolved_requirements.length === 0) {
      return {
        case: caseRecord,
        nextMatching: null,
        escalated: false,
        reason: "All assistance requirements are resolved. No follow-up matching required.",
      };
    }

    // Stopping Condition 1: Max Matching Cycles Limit
    if (caseRecord.current_matching_cycle >= caseRecord.max_matching_cycles) {
      const reason = `Maximum matching cycles (${caseRecord.max_matching_cycles}) reached without complete assistance resolution for [${caseRecord.unresolved_requirements.join(
        ", "
      )}]. Escalated to human coordinator for manual agency outreach.`;

      assertValidCaseTransition(caseRecord.case_status, "ESCALATED");

      const escalatedCase = await this.caseRepo.update(caseRecord.case_id, {
        case_status: "ESCALATED",
      });

      const event: CaseEvent = {
        event_id: `evt_${crypto.randomUUID()}`,
        case_id: caseRecord.case_id,
        event_type: "RECURSIVE_CYCLE_ESCALATED",
        previous_state: caseRecord.case_status,
        new_state: "ESCALATED",
        actor: coordinatorId,
        actor_role: "coordinator",
        rationale: reason,
        timestamp: now,
      };
      await this.caseRepo.addEvent(event);

      logger.warn("Case escalated due to reaching max matching cycles", "RECURSIVE_ENGINE", {
        case_reference: caseReference,
        current_cycle: caseRecord.current_matching_cycle,
        max_cycles: caseRecord.max_matching_cycles,
      });

      return {
        case: escalatedCase || caseRecord,
        nextMatching: null,
        escalated: true,
        reason,
      };
    }

    // Step 2: Fetch incident context to run explainable matching
    const incident = await this.incidentRepo.findByPublicReference(
      caseRecord.incident_reference
    );
    if (!incident) {
      throw ApiError.notFound(
        `Underlying incident '${caseRecord.incident_reference}' not found.`
      );
    }

    // Step 3: Run matching service with current unresolved assistance requirements
    const baseMatchResult = await this.matchingService.matchIncident(
      caseRecord.incident_reference,
      undefined,
      caseRecord.unresolved_requirements
    );

    // Identify organisations that previously rejected or failed for this case
    const excludedOrgIds = new Set(
      caseRecord.assignments
        .filter((a) => ["REJECTED", "CONTACT_FAILED", "EXPIRED"].includes(a.status))
        .map((a) => a.organisation_id)
    );

    // Filter candidate recommendations for this new cycle
    const filteredCandidates: MatchCandidate[] = baseMatchResult.candidates.map(
      (candidate) => {
        if (excludedOrgIds.has(candidate.ngo_id)) {
          return {
            ...candidate,
            eligible: false,
            total_score: 0.0,
            ineligibility_reason:
              "Excluded: Organisation previously rejected or failed response in earlier cycle for this case",
            explanation: `${candidate.organisation_name} is excluded due to previous rejection/failure in earlier matching cycle.`,
          };
        }
        return candidate;
      }
    );

    // Re-sort: Eligible first, then descending total_score
    filteredCandidates.sort((a, b) => {
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1;
      }
      return b.total_score - a.total_score;
    });

    const eligibleCount = filteredCandidates.filter((c) => c.eligible).length;

    // Stopping Condition 2: No eligible NGOs remaining
    if (eligibleCount === 0) {
      const reason = `Zero eligible organisations available in registry capable of providing remaining requirements [${caseRecord.unresolved_requirements.join(
        ", "
      )}]. Escalated for inter-agency coordination.`;

      assertValidCaseTransition(caseRecord.case_status, "ESCALATED");

      const escalatedCase = await this.caseRepo.update(caseRecord.case_id, {
        case_status: "ESCALATED",
      });

      const event: CaseEvent = {
        event_id: `evt_${crypto.randomUUID()}`,
        case_id: caseRecord.case_id,
        event_type: "RECURSIVE_CYCLE_ESCALATED",
        previous_state: caseRecord.case_status,
        new_state: "ESCALATED",
        actor: coordinatorId,
        actor_role: "coordinator",
        rationale: reason,
        timestamp: now,
      };
      await this.caseRepo.addEvent(event);

      logger.warn("Case escalated due to zero eligible NGOs in new cycle", "RECURSIVE_ENGINE", {
        case_reference: caseReference,
        unresolved_requirements: caseRecord.unresolved_requirements,
      });

      return {
        case: escalatedCase || caseRecord,
        nextMatching: null,
        escalated: true,
        reason,
      };
    }

    // Step 4: Advance cycle and update status to MATCHING
    const nextCycle = caseRecord.current_matching_cycle + 1;
    assertValidCaseTransition(caseRecord.case_status, "MATCHING");

    const updatedCase = await this.caseRepo.update(caseRecord.case_id, {
      current_matching_cycle: nextCycle,
      case_status: "MATCHING",
    });

    if (!updatedCase) {
      throw ApiError.internal("Failed to update case cycle");
    }

    const nextMatchingResult: MatchResult = {
      ...baseMatchResult,
      candidates: filteredCandidates,
      eligible_candidates_count: eligibleCount,
      explanation_summary: `Cycle ${nextCycle} Match: ${eligibleCount} eligible organisations identified for unresolved requirements [${caseRecord.unresolved_requirements.join(
        ", "
      )}].`,
      generated_at: now,
    };

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "RECURSIVE_CYCLE_STARTED",
      previous_state: caseRecord.case_status,
      new_state: "MATCHING",
      actor: coordinatorId,
      actor_role: "coordinator",
      rationale: `Cycle ${nextCycle} initiated for unresolved needs: ${caseRecord.unresolved_requirements.join(
        ", "
      )}`,
      metadata: {
        cycle: nextCycle,
        unresolved_needs: caseRecord.unresolved_requirements,
        eligible_candidates: eligibleCount,
      },
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    logger.info("Recursive assistance cycle started successfully", "RECURSIVE_ENGINE", {
      case_reference: caseReference,
      cycle: nextCycle,
      eligible_count: eligibleCount,
    });

    return {
      case: updatedCase,
      nextMatching: nextMatchingResult,
      escalated: false,
    };
  }
}
