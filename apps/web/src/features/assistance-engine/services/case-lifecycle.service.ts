import crypto from "crypto";
import {
  ParentCaseStatus,
  RequirementStatus,
  EngineAssignmentStatus,
  EngineAssignment,
  AssistanceRequirement,
  AssignmentOutcome,
} from "../types";
import {
  IAssistanceRequirementRepository,
  getAssistanceRequirementRepository,
  IEngineAssignmentRepository,
  getEngineAssignmentRepository,
  IEngineCaseEventRepository,
  getEngineCaseEventRepository,
} from "../repositories";
import {
  ICaseRepository,
  getCaseRepository,
} from "@/features/cases/repositories";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export const PARENT_CASE_TRANSITIONS: Record<
  ParentCaseStatus,
  ParentCaseStatus[]
> = {
  RECEIVED: ["TRIAGING", "CANCELLED"],
  TRIAGING: ["MATCHING", "HUMAN_REVIEW", "CANCELLED"],
  MATCHING: ["OUTREACH_PENDING", "AWAITING_RESPONSE", "HUMAN_REVIEW", "CANCELLED"],
  OUTREACH_PENDING: ["AWAITING_RESPONSE", "ESCALATING", "HUMAN_REVIEW", "CANCELLED"],
  AWAITING_RESPONSE: [
    "PROVIDER_ACCEPTED",
    "ESCALATING",
    "HUMAN_REVIEW",
    "CANCELLED",
  ],
  PROVIDER_ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: [
    "SUPPLEMENTAL_REQUIRED",
    "ESCALATING",
    "HUMAN_REVIEW",
    "RESOLVED",
    "CANCELLED",
  ],
  SUPPLEMENTAL_REQUIRED: [
    "MATCHING",
    "OUTREACH_PENDING",
    "IN_PROGRESS",
    "HUMAN_REVIEW",
    "CANCELLED",
  ],
  ESCALATING: ["MATCHING", "HUMAN_REVIEW", "RESOLVED", "CANCELLED"],
  HUMAN_REVIEW: [
    "MATCHING",
    "OUTREACH_PENDING",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "CANCELLED",
  ],
  RESOLVED: ["CLOSED", "IN_PROGRESS", "HUMAN_REVIEW"],
  CLOSED: ["IN_PROGRESS"], // Reopened
  CANCELLED: ["IN_PROGRESS"], // Reopened
};

export const REQUIREMENT_TRANSITIONS: Record<
  RequirementStatus,
  RequirementStatus[]
> = {
  PENDING_MATCH: ["OUTREACH_ACTIVE", "HUMAN_REVIEW", "CANCELLED"],
  OUTREACH_ACTIVE: [
    "OFFERED",
    "ASSIGNED",
    "ESCALATED",
    "HUMAN_REVIEW",
    "CANCELLED",
  ],
  OFFERED: ["ASSIGNED", "ESCALATED", "HUMAN_REVIEW", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "ESCALATED", "HUMAN_REVIEW", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "UNFULFILLED", "ESCALATED", "HUMAN_REVIEW", "CANCELLED"],
  ESCALATED: ["OUTREACH_ACTIVE", "HUMAN_REVIEW", "CANCELLED"],
  HUMAN_REVIEW: ["PENDING_MATCH", "OUTREACH_ACTIVE", "ASSIGNED", "CANCELLED"],
  RESOLVED: ["IN_PROGRESS"], // Reopened
  UNFULFILLED: ["PENDING_MATCH", "HUMAN_REVIEW", "CANCELLED"],
  CANCELLED: ["PENDING_MATCH"],
};

export class CaseLifecycleService {
  private reqRepo: IAssistanceRequirementRepository;
  private assignmentRepo: IEngineAssignmentRepository;
  private eventRepo: IEngineCaseEventRepository;
  private caseRepo: ICaseRepository;

  constructor(options?: {
    reqRepo?: IAssistanceRequirementRepository;
    assignmentRepo?: IEngineAssignmentRepository;
    eventRepo?: IEngineCaseEventRepository;
    caseRepo?: ICaseRepository;
  }) {
    this.reqRepo =
      options?.reqRepo || getAssistanceRequirementRepository();
    this.assignmentRepo =
      options?.assignmentRepo || getEngineAssignmentRepository();
    this.eventRepo =
      options?.eventRepo || getEngineCaseEventRepository();
    this.caseRepo =
      options?.caseRepo || getCaseRepository();
  }

  /**
   * Validates legal transition for parent case status.
   */
  assertLegalCaseTransition(
    from: ParentCaseStatus,
    to: ParentCaseStatus
  ): void {
    if (from === to) return;
    const allowed = PARENT_CASE_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw ApiError.badRequest(
        `Invalid parent case transition from '${from}' to '${to}'. Allowed: [${
          allowed ? allowed.join(", ") : "none"
        }].`
      );
    }
  }

  /**
   * Validates legal transition for requirement status.
   */
  assertLegalRequirementTransition(
    from: RequirementStatus,
    to: RequirementStatus
  ): void {
    if (from === to) return;
    const allowed = REQUIREMENT_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw ApiError.badRequest(
        `Invalid assistance requirement transition from '${from}' to '${to}'. Allowed: [${
          allowed ? allowed.join(", ") : "none"
        }].`
      );
    }
  }

  /**
   * Provider starts work on scene.
   */
  async startWork(
    assignmentId: string,
    actorId: string
  ): Promise<EngineAssignment> {
    const asgn = await this.assignmentRepo.findById(assignmentId);
    if (!asgn) {
      throw ApiError.notFound(`Assignment '${assignmentId}' not found.`);
    }

    if (asgn.status === "RESOLVED" || asgn.status === "CANCELLED") {
      throw ApiError.conflict(
        `Cannot record progress on assignment '${assignmentId}' with terminal status '${asgn.status}'. Case must be explicitly reopened.`
      );
    }

    if (asgn.status !== "ACCEPTED") {
      throw ApiError.badRequest(
        `Cannot start work on assignment with status '${asgn.status}'. Expected 'ACCEPTED'.`
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    // 3 hours expected progress window
    const expectedUpdateIso = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();

    const updatedAsgn = await this.assignmentRepo.update(assignmentId, {
      status: "WORK_STARTED",
      workStartedAt: nowIso,
      lastProgressAt: nowIso,
      expectedUpdateAt: expectedUpdateIso,
    });

    // Update requirement to IN_PROGRESS
    const req = await this.reqRepo.findById(asgn.requirementId);
    if (req) {
      this.assertLegalRequirementTransition(req.status, "IN_PROGRESS");
      await this.reqRepo.update(req.requirementId, {
        status: "IN_PROGRESS",
        nextActionAt: expectedUpdateIso,
        lastMeaningfulActivityAt: nowIso,
      });
    }

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: asgn.caseId,
      requirementId: asgn.requirementId,
      attemptId: null,
      assignmentId,
      eventType: "WORK_STARTED",
      previousState: "ACCEPTED",
      newState: "WORK_STARTED",
      actorType: "PROVIDER",
      actorId,
      metadata: { expectedUpdateAt: expectedUpdateIso },
      timestamp: nowIso,
    });

    return updatedAsgn!;
  }

  /**
   * Record progress update on assignment.
   */
  async recordProgress(
    assignmentId: string,
    notes: string,
    actorId: string
  ): Promise<EngineAssignment> {
    const asgn = await this.assignmentRepo.findById(assignmentId);
    if (!asgn) {
      throw ApiError.notFound(`Assignment '${assignmentId}' not found.`);
    }

    if (asgn.status === "RESOLVED" || asgn.status === "CANCELLED") {
      throw ApiError.conflict(
        `Cannot record progress on assignment '${assignmentId}' with terminal status '${asgn.status}'. Case must be explicitly reopened.`
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const nextUpdateIso = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const updated = await this.assignmentRepo.update(assignmentId, {
      status: "IN_PROGRESS",
      lastProgressAt: nowIso,
      expectedUpdateAt: nextUpdateIso,
    });

    await this.reqRepo.update(asgn.requirementId, {
      nextActionAt: nextUpdateIso,
      lastMeaningfulActivityAt: nowIso,
    });

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: asgn.caseId,
      requirementId: asgn.requirementId,
      attemptId: null,
      assignmentId,
      eventType: "PROGRESS_RECORDED",
      previousState: asgn.status,
      newState: "IN_PROGRESS",
      actorType: "PROVIDER",
      actorId,
      metadata: { notes, nextUpdateAt: nextUpdateIso },
      timestamp: nowIso,
    });

    return updated!;
  }

  /**
   * Resolves an individual assistance requirement with verified outcome and evidence.
   */
  async resolveRequirement(
    requirementId: string,
    outcome: AssignmentOutcome,
    actorId: string
  ): Promise<{ requirement: AssistanceRequirement; assignment: EngineAssignment | null }> {
    const req = await this.reqRepo.findById(requirementId);
    if (!req) {
      throw ApiError.notFound(`Requirement '${requirementId}' not found.`);
    }

    this.assertLegalRequirementTransition(req.status, "RESOLVED");

    const nowIso = new Date().toISOString();
    const asgn = await this.assignmentRepo.findByRequirementId(requirementId);

    let updatedAsgn: EngineAssignment | null = null;
    if (asgn) {
      updatedAsgn = await this.assignmentRepo.update(asgn.assignmentId, {
        status: "RESOLVED",
        resolvedAt: nowIso,
        outcome,
      });
    }

    const updatedReq = await this.reqRepo.update(requirementId, {
      status: "RESOLVED",
      lastMeaningfulActivityAt: nowIso,
    });

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: req.caseId,
      requirementId,
      attemptId: null,
      assignmentId: asgn?.assignmentId || null,
      eventType: "REQUIREMENT_RESOLVED",
      previousState: req.status,
      newState: "RESOLVED",
      actorType: "COORDINATOR",
      actorId,
      metadata: { outcome },
      timestamp: nowIso,
    });

    logger.info("Requirement resolved successfully", "LIFECYCLE_SERVICE", {
      requirementId,
      outcomeStatus: outcome.outcomeStatus,
    });

    return { requirement: updatedReq!, assignment: updatedAsgn };
  }

  /**
   * Close or cancel a case and invalidate all pending timers/outreach.
   */
  async cancelCase(
    caseId: string,
    reason: string,
    actorId: string
  ): Promise<void> {
    const nowIso = new Date().toISOString();

    // Cancel all open requirements
    const reqs = await this.reqRepo.findByCaseId(caseId);
    for (const r of reqs) {
      if (!["RESOLVED", "CANCELLED"].includes(r.status)) {
        await this.reqRepo.update(r.requirementId, {
          status: "CANCELLED",
          lastMeaningfulActivityAt: nowIso,
        });

        // Cancel assignments
        const asgns = await this.assignmentRepo.findByCaseId(caseId);
        for (const a of asgns) {
          if (!["RESOLVED", "CANCELLED"].includes(a.status)) {
            await this.assignmentRepo.update(a.assignmentId, {
              status: "CANCELLED",
            });
          }
        }
      }
    }

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId,
      requirementId: null,
      attemptId: null,
      assignmentId: null,
      eventType: "CASE_CANCELLED",
      previousState: null,
      newState: "CANCELLED",
      actorType: "COORDINATOR",
      actorId,
      metadata: { reason },
      timestamp: nowIso,
    });

    logger.info("Case and pending timers cancelled", "LIFECYCLE_SERVICE", {
      caseId,
      reason,
    });
  }
}
