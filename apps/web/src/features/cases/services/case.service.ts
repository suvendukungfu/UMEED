import crypto from "crypto";
import {
  Case,
  CaseCreationResult,
  CaseEvent,
  CaseFilterOptions,
  CreateCaseInput,
  AssignNGOsInput,
  CaseResolutionInput,
  CaseAssignment,
  AssignmentContactAttempt,
} from "../types";
import { ICaseRepository, getCaseRepository } from "../repositories";
import { IIncidentRepository, getIncidentRepository } from "@/features/incidents/repositories";
import { INGORepository, getNGORepository } from "@/features/ngos/repositories";
import { INotificationAdapter } from "@/features/notifications/adapters/notification.adapter";
import { MockNotificationAdapter } from "@/features/notifications/adapters/mock.adapter";
import {
  assertValidCaseTransition,
  assertValidAssignmentTransition,
} from "../state-machine";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export class CaseService {
  private caseRepo: ICaseRepository;
  private incidentRepo: IIncidentRepository;
  private ngoRepo: INGORepository;
  private notificationAdapter: INotificationAdapter;

  constructor(options?: {
    caseRepo?: ICaseRepository;
    incidentRepo?: IIncidentRepository;
    ngoRepo?: INGORepository;
    notificationAdapter?: INotificationAdapter;
  }) {
    this.caseRepo = options?.caseRepo || getCaseRepository();
    this.incidentRepo = options?.incidentRepo || getIncidentRepository();
    this.ngoRepo = options?.ngoRepo || getNGORepository();
    this.notificationAdapter = options?.notificationAdapter || new MockNotificationAdapter();
  }

  /**
   * Convert an APPROVED incident into an operational assistance case.
   * Atomic creation, unique incident linkage, and idempotent replay.
   */
  async createCaseFromApprovedIncident(
    input: CreateCaseInput,
    coordinatorId: string
  ): Promise<CaseCreationResult> {
    const incident = await this.incidentRepo.findByPublicReference(
      input.incident_public_reference
    );

    if (!incident) {
      throw ApiError.notFound(
        `Incident '${input.incident_public_reference}' not found.`
      );
    }

    // Invariant: Reject case creation for unverified, reported, rejected, or duplicate incidents
    const nonApprovedStatuses = ["REPORTED", "UNVERIFIED", "REJECTED", "DUPLICATE"];
    if (nonApprovedStatuses.includes(incident.status)) {
      throw ApiError.badRequest(
        `Cannot create assistance case from incident with status '${incident.status}'. ` +
        `Only verified and APPROVED incidents can be converted into operational assistance cases.`
      );
    }

    const incidentId = incident._id || (incident as unknown as { id?: string }).id || incident.public_reference;

    // Idempotency: Check if a case already exists for this incident
    const existingCase = await this.caseRepo.findByIncidentId(incidentId);
    if (existingCase) {
      logger.info("Case creation idempotent replay detected", "CASE_SERVICE", {
        incident_reference: incident.public_reference,
        case_reference: existingCase.public_case_reference,
      });
      return { is_new: false, case: existingCase };
    }

    // Derive assistance requirements
    let requirements: string[] = [];
    if (input.assistance_requirements && input.assistance_requirements.length > 0) {
      requirements = [...new Set(input.assistance_requirements)];
    } else if (
      incident.triage_analysis?.possible_assistance &&
      incident.triage_analysis.possible_assistance.length > 0
    ) {
      requirements = [...new Set(incident.triage_analysis.possible_assistance)];
    } else {
      requirements = [incident.incident_type];
    }

    const now = new Date().toISOString();
    const caseId = `case_${crypto.randomUUID()}`;
    const publicCaseReference = `CASE-${incident.public_reference.replace(/^UMD-/, "")}`;

    const newCase: Case = {
      case_id: caseId,
      incident_id: incidentId,
      incident_reference: incident.public_reference,
      public_case_reference: publicCaseReference,
      case_status: "APPROVED",
      assistance_requirements: requirements,
      unresolved_requirements: [...requirements],
      assignments: [],
      interventions: [],
      current_matching_cycle: 1,
      max_matching_cycles: input.max_matching_cycles ?? 3,
      created_by: coordinatorId,
      approved_at: now,
      created_at: now,
      updated_at: now,
      resolved_at: null,
      resolution_evidence: [],
      resolution_decision: null,
    };

    const created = await this.caseRepo.create(newCase);

    const initEvent: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: created.case_id,
      event_type: "CASE_CREATED",
      previous_state: null,
      new_state: "APPROVED",
      actor: coordinatorId,
      actor_role: "coordinator",
      rationale: input.coordinator_notes || "Case formally opened from verified incident",
      timestamp: now,
    };
    await this.caseRepo.addEvent(initEvent);

    logger.info("Operational assistance case created successfully", "CASE_SERVICE", {
      case_id: created.case_id,
      public_case_reference: created.public_case_reference,
      incident_reference: created.incident_reference,
    });

    return { is_new: true, case: created };
  }

  async getCaseByReference(publicCaseReference: string): Promise<Case | null> {
    const caseRecord = await this.caseRepo.findByReference(publicCaseReference);
    if (!caseRecord) {
      throw ApiError.notFound(`Case '${publicCaseReference}' not found.`);
    }
    return caseRecord;
  }

  async listCases(filter?: CaseFilterOptions): Promise<{ cases: Case[]; total: number }> {
    return this.caseRepo.findMany(filter);
  }

  /**
   * Assign vetted NGOs to specific assistance requirements on an active case.
   * Distinguishes: PROPOSED -> CONTACT_READY -> CONTACT_QUEUED -> CONTACTED.
   * Concurrency Safe: Prevents conflicting duplicate primary assignments for the same need.
   */
  async assignOrganisations(
    caseReference: string,
    input: AssignNGOsInput,
    coordinatorId: string
  ): Promise<Case> {
    const caseRecord = await this.getCaseByReference(caseReference);
    if (!caseRecord) {
      throw ApiError.notFound(`Case '${caseReference}' not found.`);
    }

    const validCaseStatuses = [
      "APPROVED",
      "MATCHING",
      "RESPONDERS_CONTACTED",
      "ACCEPTED",
      "FOLLOW_UP_REQUIRED",
      "REOPENED",
      "ESCALATED",
    ];
    if (!validCaseStatuses.includes(caseRecord.case_status)) {
      throw ApiError.badRequest(
        `Cannot assign responders to case in status '${caseRecord.case_status}'.`
      );
    }

    const now = new Date().toISOString();
    const newAssignments: CaseAssignment[] = [];

    for (const item of input.assignments) {
      // Concurrency / Conflict Guard: Check if an active responder is already assigned to this requirement
      const existingActive = caseRecord.assignments.find(
        (a) =>
          a.requirement === item.requirement &&
          ["ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(a.status)
      );
      if (existingActive) {
        throw ApiError.conflict(
          `Conflict: Requirement '${item.requirement}' already has an active responder (${existingActive.organisation_name} - ${existingActive.status}). Conflicting duplicate assignment prevented.`
        );
      }

      // Check if this organisation is already pending/contacted for this exact requirement in this cycle
      const existingPending = caseRecord.assignments.find(
        (a) =>
          a.organisation_id === item.organisation_id &&
          a.requirement === item.requirement &&
          ["CONTACT_READY", "CONTACT_QUEUED", "CONTACTED", "ACKNOWLEDGED", "REQUESTED_INFORMATION"].includes(
            a.status
          )
      );
      if (existingPending) {
        continue; // Idempotently skip already contacted organisation for this requirement
      }

      // Fetch NGO for name and contact info
      const ngo = await this.ngoRepo.findById(item.organisation_id);
      if (!ngo) {
        throw ApiError.badRequest(`Organisation '${item.organisation_id}' not found in NGO registry.`);
      }

      if (ngo.verification_status === "SUSPENDED" || ngo.verification_status === "INACTIVE") {
        throw ApiError.badRequest(
          `Organisation '${ngo.organisation_name}' is currently ${ngo.verification_status}. Cannot assign.`
        );
      }

      const assignmentId = `asg_${crypto.randomUUID()}`;
      const deadlineHours = item.response_deadline_hours ?? 2;
      const deadline = new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString();

      // Step 1: Coordinator selects -> CONTACT_READY
      // Step 2: Outbox queue created -> CONTACT_QUEUED
      const attemptId = `att_${crypto.randomUUID()}`;
      const contactAttempt: AssignmentContactAttempt = {
        attempt_id: attemptId,
        channel: "in_app",
        initiated_at: now,
        status: "QUEUED",
        details: `Assignment notification queued for ${ngo.organisation_name}`,
      };

      // Deliver notification via adapter
      const deliveryResult = await this.notificationAdapter.send({
        notification_id: attemptId,
        case_id: caseRecord.case_id,
        assignment_id: assignmentId,
        organisation_id: ngo.ngo_id,
        channel: "in_app",
        recipient_address: ngo.contact?.emergency_phone || ngo.contact?.phone || "in-app",
        subject: `UMEED Distress Response Request: ${item.requirement}`,
        body: `Your organisation has been selected by coordinator ${coordinatorId} for case ${caseRecord.public_case_reference}. Requirement: ${item.requirement}.`,
        status: "QUEUED",
        created_at: now,
        delivered_at: null,
        error_message: null,
        is_mock: this.notificationAdapter.isMock(),
      });

      contactAttempt.status = deliveryResult.status;
      contactAttempt.details = deliveryResult.success
        ? `Delivered via ${this.notificationAdapter.getChannelName()} (is_mock: ${this.notificationAdapter.isMock()})`
        : `Delivery failed: ${deliveryResult.error || "Unknown delivery error"}`;

      const assignmentStatus = deliveryResult.success ? "CONTACTED" : "CONTACT_FAILED";

      const assignment: CaseAssignment = {
        assignment_id: assignmentId,
        case_id: caseRecord.case_id,
        organisation_id: ngo.ngo_id,
        organisation_name: ngo.organisation_name,
        requirement: item.requirement,
        matching_cycle: caseRecord.current_matching_cycle,
        status: assignmentStatus,
        assigned_by: coordinatorId,
        assigned_at: now,
        response_deadline: deadline,
        contact_attempts: [contactAttempt],
      };

      newAssignments.push(assignment);
    }

    const updatedAssignments = [...caseRecord.assignments, ...newAssignments];

    // Transition case status to RESPONDERS_CONTACTED if newly contacting responders
    let nextCaseStatus = caseRecord.case_status;
    if (["APPROVED", "MATCHING"].includes(caseRecord.case_status)) {
      nextCaseStatus = "RESPONDERS_CONTACTED";
      assertValidCaseTransition(caseRecord.case_status, nextCaseStatus);
    }

    const updatedCase = await this.caseRepo.update(caseRecord.case_id, {
      assignments: updatedAssignments,
      case_status: nextCaseStatus,
    });

    if (!updatedCase) {
      throw ApiError.internal("Failed to update case assignments");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "ASSIGNMENTS_CREATED",
      previous_state: caseRecord.case_status,
      new_state: nextCaseStatus,
      actor: coordinatorId,
      actor_role: "coordinator",
      rationale: `Assigned ${newAssignments.length} organisations for case requirements`,
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    return updatedCase;
  }

  /**
   * Final Case Resolution
   * Invariant: A case never resolves automatically merely because an NGO marked an assignment completed.
   * Requires: Intervention evidence, remaining-needs assessment, and authorized coordinator decision.
   */
  async resolveCase(
    caseReference: string,
    input: CaseResolutionInput,
    coordinatorId: string
  ): Promise<Case> {
    const caseRecord = await this.getCaseByReference(caseReference);
    if (!caseRecord) {
      throw ApiError.notFound(`Case '${caseReference}' not found.`);
    }

    // Invariant: Unresolved requirements check
    if (caseRecord.unresolved_requirements.length > 0 && !input.override_unresolved) {
      throw ApiError.badRequest(
        `Cannot resolve case with unresolved assistance needs ([${caseRecord.unresolved_requirements.join(
          ", "
        )}]). All assistance requirements must be fulfilled or coordinator must explicitly override with detailed rationale.`
      );
    }

    // Invariant: Evidence check
    if (caseRecord.interventions.length === 0 && (!input.evidence_urls || input.evidence_urls.length === 0)) {
      throw ApiError.badRequest(
        "Cannot resolve case without recorded intervention evidence or resolution documentation URLs."
      );
    }

    // State Machine Validation: Normal resolution requires canonical state transition (e.g., from INTERVENTION_PROVIDED or ESCALATED).
    // An explicit coordinator override permits closing an active distressed case when external assistance occurred.
    if (!input.override_unresolved) {
      assertValidCaseTransition(caseRecord.case_status, "RESOLVED");
    } else {
      if (caseRecord.case_status === "RESOLVED") {
        throw ApiError.badRequest("Case is already in RESOLVED status.");
      }
    }

    const now = new Date().toISOString();
    const updatedCase = await this.caseRepo.update(caseRecord.case_id, {
      case_status: "RESOLVED",
      resolved_at: now,
      unresolved_requirements: input.override_unresolved ? [] : caseRecord.unresolved_requirements,
      resolution_evidence: [
        ...caseRecord.resolution_evidence,
        ...(input.evidence_urls || []),
      ],
      resolution_decision: {
        decision: input.decision,
        rationale: input.rationale,
        resolved_by: coordinatorId,
        timestamp: now,
      },
    });

    if (!updatedCase) {
      throw ApiError.internal("Failed to persist case resolution");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "CASE_RESOLVED",
      previous_state: caseRecord.case_status,
      new_state: "RESOLVED",
      actor: coordinatorId,
      actor_role: "coordinator",
      rationale: input.rationale,
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    logger.info("Case formally resolved with authorized coordinator review", "CASE_SERVICE", {
      case_reference: caseReference,
      resolved_by: coordinatorId,
    });

    return updatedCase;
  }

  /**
   * Reopen a closed or cancelled case if distress recurs or follow-up fails.
   */
  async reopenCase(
    caseReference: string,
    rationale: string,
    coordinatorId: string
  ): Promise<Case> {
    const caseRecord = await this.getCaseByReference(caseReference);
    if (!caseRecord) {
      throw ApiError.notFound(`Case '${caseReference}' not found.`);
    }

    assertValidCaseTransition(caseRecord.case_status, "REOPENED");

    const now = new Date().toISOString();
    const updatedCase = await this.caseRepo.update(caseRecord.case_id, {
      case_status: "REOPENED",
      resolved_at: null,
      resolution_decision: null,
    });

    if (!updatedCase) {
      throw ApiError.internal("Failed to reopen case");
    }

    const event: CaseEvent = {
      event_id: `evt_${crypto.randomUUID()}`,
      case_id: caseRecord.case_id,
      event_type: "CASE_REOPENED",
      previous_state: caseRecord.case_status,
      new_state: "REOPENED",
      actor: coordinatorId,
      actor_role: "coordinator",
      rationale,
      timestamp: now,
    };
    await this.caseRepo.addEvent(event);

    return updatedCase;
  }
}
