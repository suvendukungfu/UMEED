import crypto from "crypto";
import {
  Case,
  CaseAssignment,
  InterventionRecord,
  InterventionInput,
  CaseEvent,
} from "../types";
import { ICaseRepository, getCaseRepository } from "../repositories";
import { IIncidentRepository, getIncidentRepository } from "@/features/incidents/repositories";
import {
  assertValidCaseTransition,
  assertValidAssignmentTransition,
} from "../state-machine";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export interface ResponderActor {
  ngoId: string;
  responderId: string;
  notes?: string;
  reason?: string;
  infoText?: string;
}

export class ResponderService {
  private caseRepo: ICaseRepository;
  private incidentRepo: IIncidentRepository;

  constructor(options?: {
    caseRepo?: ICaseRepository;
    incidentRepo?: IIncidentRepository;
  }) {
    this.caseRepo = options?.caseRepo || getCaseRepository();
    this.incidentRepo = options?.incidentRepo || getIncidentRepository();
  }

  /**
   * Find case and assignment by assignment ID, verifying actor ownership.
   */
  private async getCaseAndAssignment(
    assignmentId: string,
    ngoId?: string
  ): Promise<{ caseRecord: Case; assignment: CaseAssignment }> {
    // Find case containing this assignment
    const { cases } = await this.caseRepo.findMany({ limit: 500 });
    let foundCase: Case | null = null;
    let foundAssignment: CaseAssignment | null = null;

    for (const c of cases) {
      const match = c.assignments.find((a) => a.assignment_id === assignmentId);
      if (match) {
        foundCase = c;
        foundAssignment = match;
        break;
      }
    }

    if (!foundCase || !foundAssignment) {
      throw ApiError.notFound(`Assignment '${assignmentId}' not found.`);
    }

    // Invariant: Terminal/Resolved cases cannot be modified by responder updates without explicit coordinator reopening
    if (foundCase.case_status === "RESOLVED" || foundCase.case_status === "CANCELLED") {
      throw ApiError.conflict(
        `Cannot perform responder action on case '${foundCase.public_case_reference}' with terminal status '${foundCase.case_status}'. Case must be explicitly reopened by a coordinator.`
      );
    }

    // Tenancy Check: NGO A cannot access or act upon NGO B's assignment
    if (ngoId && foundAssignment.organisation_id !== ngoId) {
      throw ApiError.forbidden(
        `Access denied: Assignment '${assignmentId}' does not belong to organisation '${ngoId}'.`
      );
    }

    return { caseRecord: foundCase, assignment: foundAssignment };
  }

  /**
   * NGO accepts assignment.
   * Concurrency Guard: Prevents conflicting duplicate acceptances for the same requirement.
   */
  async acceptAssignment(assignmentId: string, actor: ResponderActor): Promise<Case> {
    const { caseRecord, assignment } = await this.getCaseAndAssignment(
      assignmentId,
      actor.ngoId
    );

    // Idempotency: If already accepted by this same assignment, return case
    if (assignment.status === "ACCEPTED") {
      return caseRecord;
    }

    assertValidAssignmentTransition(assignment.status, "ACCEPTED");

    // Concurrency conflict check: Has another NGO already accepted this requirement?
    const conflictingActive = caseRecord.assignments.find(
      (a) =>
        a.assignment_id !== assignmentId &&
        a.requirement === assignment.requirement &&
        ["ACCEPTED", "EN_ROUTE", "ARRIVED", "INTERVENTION_RECORDED", "COMPLETED"].includes(a.status)
    );

    if (conflictingActive) {
      throw ApiError.conflict(
        `Conflict: Requirement '${assignment.requirement}' was already accepted by ${conflictingActive.organisation_name}. Cannot accept conflicting assignment.`
      );
    }

    const now = new Date().toISOString();
    assignment.status = "ACCEPTED";
    assignment.accepted_at = now;

    // Transition case status to ACCEPTED if currently RESPONDERS_CONTACTED
    let nextCaseStatus = caseRecord.case_status;
    if (["RESPONDERS_CONTACTED", "MATCHING", "APPROVED"].includes(caseRecord.case_status)) {
      nextCaseStatus = "ACCEPTED";
      assertValidCaseTransition(caseRecord.case_status, nextCaseStatus);
    }

    const updated = await this.caseRepo.update(caseRecord.case_id, {
      assignments: caseRecord.assignments,
      case_status: nextCaseStatus,
    });

    if (!updated) {
      throw ApiError.internal("Failed to update accepted assignment");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "ASSIGNMENT_ACCEPTED",
      previous_state: "CONTACTED",
      new_state: "ACCEPTED",
      actor: actor.responderId,
      actor_role: "responder",
      rationale: actor.notes || `Assignment accepted by ${assignment.organisation_name}`,
      metadata: { organisation_id: actor.ngoId, assignment_id: assignmentId },
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    logger.info("Assignment accepted by NGO responder", "RESPONDER_SERVICE", {
      assignment_id: assignmentId,
      organisation_id: actor.ngoId,
    });

    return updated;
  }

  /**
   * NGO rejects assignment with a specific reason.
   */
  async rejectAssignment(
    assignmentId: string,
    actor: ResponderActor & { reason: string }
  ): Promise<Case> {
    const { caseRecord, assignment } = await this.getCaseAndAssignment(
      assignmentId,
      actor.ngoId
    );

    assertValidAssignmentTransition(assignment.status, "REJECTED");

    const now = new Date().toISOString();
    assignment.status = "REJECTED";
    assignment.rejected_at = now;
    assignment.rejection_reason = actor.reason;

    // If all assignments for this requirement are rejected, evaluate if case needs MATCHING
    const otherPending = caseRecord.assignments.filter(
      (a) =>
        a.requirement === assignment.requirement &&
        ["CONTACT_READY", "CONTACT_QUEUED", "CONTACTED", "ACKNOWLEDGED", "ACCEPTED"].includes(a.status)
    );

    let nextCaseStatus = caseRecord.case_status;
    if (otherPending.length === 0 && caseRecord.case_status === "RESPONDERS_CONTACTED") {
      nextCaseStatus = "MATCHING";
    }

    const updated = await this.caseRepo.update(caseRecord.case_id, {
      assignments: caseRecord.assignments,
      case_status: nextCaseStatus,
    });

    if (!updated) {
      throw ApiError.internal("Failed to update rejected assignment");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "ASSIGNMENT_REJECTED",
      previous_state: "CONTACTED",
      new_state: "REJECTED",
      actor: actor.responderId,
      actor_role: "responder",
      rationale: actor.reason,
      metadata: { organisation_id: actor.ngoId, assignment_id: assignmentId },
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    return updated;
  }

  /**
   * NGO requests additional information before responding.
   */
  async requestInformation(
    assignmentId: string,
    actor: ResponderActor & { infoText: string }
  ): Promise<Case> {
    const { caseRecord, assignment } = await this.getCaseAndAssignment(
      assignmentId,
      actor.ngoId
    );

    assertValidAssignmentTransition(assignment.status, "REQUESTED_INFORMATION");

    const now = new Date().toISOString();
    assignment.status = "REQUESTED_INFORMATION";
    assignment.info_requested = actor.infoText;

    const updated = await this.caseRepo.update(caseRecord.case_id, {
      assignments: caseRecord.assignments,
    });

    if (!updated) {
      throw ApiError.internal("Failed to update assignment information request");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "ASSIGNMENT_INFO_REQUESTED",
      previous_state: "CONTACTED",
      new_state: "REQUESTED_INFORMATION",
      actor: actor.responderId,
      actor_role: "responder",
      rationale: actor.infoText,
      metadata: { organisation_id: actor.ngoId, assignment_id: assignmentId },
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    return updated;
  }

  /**
   * NGO marks team is en route.
   */
  async markEnRoute(assignmentId: string, actor: ResponderActor): Promise<Case> {
    const { caseRecord, assignment } = await this.getCaseAndAssignment(
      assignmentId,
      actor.ngoId
    );

    assertValidAssignmentTransition(assignment.status, "EN_ROUTE");

    const now = new Date().toISOString();
    assignment.status = "EN_ROUTE";
    assignment.en_route_at = now;

    const updated = await this.caseRepo.update(caseRecord.case_id, {
      assignments: caseRecord.assignments,
    });

    if (!updated) {
      throw ApiError.internal("Failed to update en route status");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "RESPONDER_EN_ROUTE",
      previous_state: "ACCEPTED",
      new_state: "EN_ROUTE",
      actor: actor.responderId,
      actor_role: "responder",
      rationale: actor.notes || "Response vehicle en route to incident location",
      metadata: { organisation_id: actor.ngoId, assignment_id: assignmentId },
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    return updated;
  }

  /**
   * NGO confirms arrival at incident location.
   */
  async confirmArrival(assignmentId: string, actor: ResponderActor): Promise<Case> {
    const { caseRecord, assignment } = await this.getCaseAndAssignment(
      assignmentId,
      actor.ngoId
    );

    assertValidAssignmentTransition(assignment.status, "ARRIVED");

    const now = new Date().toISOString();
    assignment.status = "ARRIVED";
    assignment.arrived_at = now;

    let nextCaseStatus = caseRecord.case_status;
    if (caseRecord.case_status === "ACCEPTED") {
      nextCaseStatus = "RESPONDER_ARRIVED";
      assertValidCaseTransition(caseRecord.case_status, nextCaseStatus);
    }

    const updated = await this.caseRepo.update(caseRecord.case_id, {
      assignments: caseRecord.assignments,
      case_status: nextCaseStatus,
    });

    if (!updated) {
      throw ApiError.internal("Failed to update arrival status");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "RESPONDER_ARRIVED",
      previous_state: caseRecord.case_status,
      new_state: nextCaseStatus,
      actor: actor.responderId,
      actor_role: "responder",
      rationale: actor.notes || "Responder arrived on scene",
      metadata: { organisation_id: actor.ngoId, assignment_id: assignmentId },
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    return updated;
  }

  /**
   * Record intervention assistance and evidence.
   * If additional needs are reported, updates unresolved requirements and flags FOLLOW_UP_REQUIRED.
   */
  async recordIntervention(
    assignmentId: string,
    input: InterventionInput,
    actor: ResponderActor
  ): Promise<{ case: Case; intervention: InterventionRecord }> {
    const { caseRecord, assignment } = await this.getCaseAndAssignment(
      assignmentId,
      actor.ngoId
    );

    const now = new Date().toISOString();
    const interventionId = `int_${crypto.randomUUID()}`;

    const intervention: InterventionRecord = {
      intervention_id: interventionId,
      case_id: caseRecord.case_id,
      assignment_id: assignmentId,
      organisation_id: actor.ngoId,
      intervention_type: input.intervention_type,
      description: input.description,
      assistance_provided: input.assistance_provided,
      evidence_references: input.evidence_references || [],
      additional_needs: input.additional_needs || [],
      performed_at: input.performed_at || now,
      submitted_by: actor.responderId,
      verification_status: "SUBMITTED",
    };

    // Mark assignment INTERVENTION_RECORDED
    assignment.status = "INTERVENTION_RECORDED";
    assignment.completed_at = now;

    // Calculate unresolved requirements:
    // Subtract what was provided, add newly discovered additional needs
    const provided = input.assistance_provided || [];
    const providedSet = new Set(provided.map((s) => s.toLowerCase()));
    let remaining = caseRecord.unresolved_requirements.filter(
      (req) => !providedSet.has(req.toLowerCase())
    );

    if (input.additional_needs && input.additional_needs.length > 0) {
      remaining = [...new Set([...remaining, ...input.additional_needs])];
    }

    // Determine next case status:
    // If remaining needs exist, transition to FOLLOW_UP_REQUIRED
    let nextCaseStatus: Case["case_status"] = "INTERVENTION_PROVIDED";
    if (remaining.length > 0) {
      nextCaseStatus = "FOLLOW_UP_REQUIRED";
    }

    assertValidCaseTransition(caseRecord.case_status, nextCaseStatus);

    const updatedCase = await this.caseRepo.update(caseRecord.case_id, {
      assignments: caseRecord.assignments,
      interventions: [...caseRecord.interventions, intervention],
      unresolved_requirements: remaining,
      case_status: nextCaseStatus,
    });

    if (!updatedCase) {
      throw ApiError.internal("Failed to save intervention record");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "INTERVENTION_RECORDED",
      previous_state: caseRecord.case_status,
      new_state: nextCaseStatus,
      actor: actor.responderId,
      actor_role: "responder",
      rationale: `Intervention recorded: ${input.intervention_type} (${input.assistance_provided.join(", ")}). Remaining needs: ${remaining.length}`,
      metadata: {
        intervention_id: interventionId,
        additional_needs: input.additional_needs,
      },
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    logger.info("Intervention recorded successfully", "RESPONDER_SERVICE", {
      case_id: caseRecord.case_id,
      intervention_id: interventionId,
      next_status: nextCaseStatus,
      unresolved_count: remaining.length,
    });

    return { case: updatedCase, intervention };
  }
}
