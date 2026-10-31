import crypto from "crypto";
import {
  IAssistanceRequirementRepository,
  getAssistanceRequirementRepository,
  IOutreachAttemptRepository,
  getOutreachAttemptRepository,
  IEngineAssignmentRepository,
  getEngineAssignmentRepository,
  IEngineCaseEventRepository,
  getEngineCaseEventRepository,
  IOrganizationRepository,
  getOrganizationRepository,
} from "../repositories";
import { GeospatialDiscoveryService } from "./geospatial-discovery.service";
import { NotificationOutboxService } from "./notification-outbox.service";
import {
  AssistanceRequirement,
  OutreachAttempt,
  EngineAssignment,
  EngineCaseEvent,
  RejectionReason,
} from "../types";
import { EngineConfig, getEngineConfig } from "../config";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export class OutreachService {
  private reqRepo: IAssistanceRequirementRepository;
  private attemptRepo: IOutreachAttemptRepository;
  private assignmentRepo: IEngineAssignmentRepository;
  private eventRepo: IEngineCaseEventRepository;
  private orgRepo: IOrganizationRepository;
  private discoveryService: GeospatialDiscoveryService;
  private outboxService: NotificationOutboxService;
  private config: EngineConfig;

  constructor(options?: {
    reqRepo?: IAssistanceRequirementRepository;
    attemptRepo?: IOutreachAttemptRepository;
    assignmentRepo?: IEngineAssignmentRepository;
    eventRepo?: IEngineCaseEventRepository;
    orgRepo?: IOrganizationRepository;
    discoveryService?: GeospatialDiscoveryService;
    outboxService?: NotificationOutboxService;
    config?: Partial<EngineConfig>;
  }) {
    this.reqRepo =
      options?.reqRepo || getAssistanceRequirementRepository();
    this.attemptRepo =
      options?.attemptRepo || getOutreachAttemptRepository();
    this.assignmentRepo =
      options?.assignmentRepo || getEngineAssignmentRepository();
    this.eventRepo =
      options?.eventRepo || getEngineCaseEventRepository();
    this.orgRepo =
      options?.orgRepo || getOrganizationRepository();
    this.config = getEngineConfig(options?.config);
    this.discoveryService =
      options?.discoveryService ||
      new GeospatialDiscoveryService({ config: this.config });
    this.outboxService =
      options?.outboxService || new NotificationOutboxService();
  }

  /**
   * Initiates a controlled first-round outreach wave for an assistance requirement.
   */
  async initiateFirstWave(
    requirementId: string,
    actorId = "system_engine"
  ): Promise<{
    requirement: AssistanceRequirement;
    attempts: OutreachAttempt[];
  }> {
    const req = await this.reqRepo.findById(requirementId);
    if (!req) {
      throw ApiError.notFound(`Assistance requirement '${requirementId}' not found.`);
    }

    if (["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"].includes(req.status)) {
      throw ApiError.badRequest(
        `Cannot initiate outreach for requirement in status '${req.status}'.`
      );
    }

    const discovery = await this.discoveryService.discoverProviders(
      req.caseId,
      req.requirementId,
      {
        serviceType: req.serviceType,
        location: req.location,
        urgency: req.urgency,
      }
    );

    const eligibleCandidates = discovery.rankedCandidates.filter(
      (c) => c.eligibilityStatus === "ELIGIBLE"
    );

    if (eligibleCandidates.length === 0) {
      const now = new Date().toISOString();
      await this.reqRepo.update(req.requirementId, {
        status: "HUMAN_REVIEW",
        nextActionAt: now,
        lastMeaningfulActivityAt: now,
      });

      await this.eventRepo.append({
        eventId: `evt_${crypto.randomUUID()}`,
        caseId: req.caseId,
        requirementId: req.requirementId,
        attemptId: null,
        assignmentId: null,
        eventType: "NO_ELIGIBLE_PROVIDERS_ESCALATED",
        previousState: req.status,
        newState: "HUMAN_REVIEW",
        actorType: "SYSTEM",
        actorId,
        metadata: {
          reason: "Zero eligible providers found in discovery radius",
          searchRadiusKm: discovery.searchRadiusKmUsed,
        },
        timestamp: now,
      });

      const updated = (await this.reqRepo.findById(requirementId))!;
      return { requirement: updated, attempts: [] };
    }

    // Determine wave size from configured urgency limits
    const urgency = req.urgency || "medium";
    let waveLimit = this.config.outreachWaveLimits.medium;
    if (urgency === "low") waveLimit = this.config.outreachWaveLimits.low;
    else if (urgency === "high") waveLimit = this.config.outreachWaveLimits.high;
    else if (urgency === "critical") waveLimit = this.config.outreachWaveLimits.critical;

    const waveCandidates = eligibleCandidates.slice(0, waveLimit);

    // Calculate acknowledgement SLA deadline
    const slaMinutes =
      this.config.acknowledgementSlaMinutes[
        urgency === "unconfirmed" ? "medium" : urgency
      ] || 15;

    const now = new Date();
    const deadlineMs = now.getTime() + slaMinutes * 60 * 1000;
    const deadlineIso = new Date(deadlineMs).toISOString();
    const nowIso = now.toISOString();

    const createdAttempts: OutreachAttempt[] = [];
    const attemptIds: string[] = [];

    for (const candidate of waveCandidates) {
      const attemptId = `att_${crypto.randomUUID()}`;
      const idempotencyKey = crypto
        .createHash("sha256")
        .update(
          `${req.requirementId}:${req.outreachRound}:${req.outreachVersion}:${candidate.providerId}`
        )
        .digest("hex");

      const existing = await this.attemptRepo.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        createdAttempts.push(existing);
        attemptIds.push(existing.attemptId);
        continue;
      }

      const attempt: OutreachAttempt = {
        attemptId,
        caseId: req.caseId,
        requirementId: req.requirementId,
        providerId: candidate.providerId,
        serviceLocationId: candidate.serviceLocationId,
        outreachRound: req.outreachRound,
        outreachVersion: req.outreachVersion,
        channel: "in_app",
        status: "SENT",
        scoreAtTimeOfSelection: candidate.totalScore,
        idempotencyKey,
        messageId: `msg_${attemptId}`,
        sentAt: nowIso,
        deliveredAt: nowIso, // In-app mock delivery
        acknowledgementDeadline: deadlineIso,
        acknowledgedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        supersededAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const saved = await this.attemptRepo.create(attempt);
      createdAttempts.push(saved);
      attemptIds.push(saved.attemptId);

      // Enqueue notification outbox
      const org = await this.orgRepo.findById(candidate.providerId);
      const recipient =
        org?.publicContactChannels.email ||
        org?.publicContactChannels.phone ||
        candidate.providerId;

      await this.outboxService.enqueueNotification({
        caseId: req.caseId,
        requirementId: req.requirementId,
        attemptId,
        recipient,
        channel: "in_app",
        payload: {
          providerId: candidate.providerId,
          serviceType: req.serviceType,
          description: req.description,
          score: candidate.totalScore,
          reasons: candidate.reasons,
          acknowledgementDeadline: deadlineIso,
        },
        idempotencyKey: `notif_key_${attemptId}`,
      });
    }

    // Update requirement
    const updatedReq = await this.reqRepo.update(req.requirementId, {
      status: "OUTREACH_ACTIVE",
      activeAttemptIds: attemptIds,
      nextActionAt: deadlineIso,
      lastMeaningfulActivityAt: nowIso,
    });

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: req.caseId,
      requirementId: req.requirementId,
      attemptId: null,
      assignmentId: null,
      eventType: "OUTREACH_WAVE_INITIATED",
      previousState: req.status,
      newState: "OUTREACH_ACTIVE",
      actorType: "SYSTEM",
      actorId,
      metadata: {
        round: req.outreachRound,
        version: req.outreachVersion,
        waveSize: createdAttempts.length,
        providers: waveCandidates.map((c) => c.providerId),
        acknowledgementDeadline: deadlineIso,
      },
      timestamp: nowIso,
    });

    logger.info("Outreach wave initiated successfully", "OUTREACH_SERVICE", {
      requirementId: req.requirementId,
      attemptsCount: createdAttempts.length,
      deadline: deadlineIso,
    });

    return { requirement: updatedReq!, attempts: createdAttempts };
  }

  /**
   * Records provider acknowledgement.
   * Delivery receipt != acknowledgement.
   */
  async recordAcknowledgement(
    attemptId: string,
    actorId: string
  ): Promise<OutreachAttempt> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound(`Outreach attempt '${attemptId}' not found.`);
    }

    const req = await this.reqRepo.findById(attempt.requirementId);
    if (!req) {
      throw ApiError.notFound(`Requirement '${attempt.requirementId}' not found.`);
    }

    // Version validation (Phase 8)
    if (attempt.outreachVersion !== req.outreachVersion) {
      throw ApiError.badRequest(
        `Stale acknowledgement: Attempt outreach version ${attempt.outreachVersion} does not match current requirement version ${req.outreachVersion}.`
      );
    }

    if (["ACCEPTED", "REJECTED", "TIMED_OUT", "CANCELLED", "SUPERSEDED"].includes(attempt.status)) {
      throw ApiError.badRequest(
        `Cannot acknowledge attempt with status '${attempt.status}'.`
      );
    }

    const nowIso = new Date().toISOString();
    const updated = await this.attemptRepo.update(attemptId, {
      status: "ACKNOWLEDGED",
      acknowledgedAt: nowIso,
    });

    await this.reqRepo.update(req.requirementId, {
      lastMeaningfulActivityAt: nowIso,
    });

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: attempt.caseId,
      requirementId: attempt.requirementId,
      attemptId,
      assignmentId: null,
      eventType: "OUTREACH_ACKNOWLEDGED",
      previousState: attempt.status,
      newState: "ACKNOWLEDGED",
      actorType: "PROVIDER",
      actorId,
      metadata: { providerId: attempt.providerId },
      timestamp: nowIso,
    });

    return updated!;
  }

  /**
   * Records explicit provider acceptance with atomic exclusive assignment locking.
   * Competing offers are cancelled/superseded immediately.
   */
  async recordAcceptance(
    attemptId: string,
    actorId: string
  ): Promise<{
    assignment: EngineAssignment;
    attempt: OutreachAttempt;
    requirement: AssistanceRequirement;
  }> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound(`Outreach attempt '${attemptId}' not found.`);
    }

    const req = await this.reqRepo.findById(attempt.requirementId);
    if (!req) {
      throw ApiError.notFound(`Requirement '${attempt.requirementId}' not found.`);
    }

    // Version validation (Phase 8): Reject stale responses
    if (attempt.outreachVersion !== req.outreachVersion) {
      throw ApiError.badRequest(
        `Stale acceptance rejected: Attempt outreach version ${attempt.outreachVersion} does not match current requirement version ${req.outreachVersion}.`
      );
    }

    // Status check
    if (["REJECTED", "TIMED_OUT", "CANCELLED", "SUPERSEDED"].includes(attempt.status)) {
      throw ApiError.badRequest(
        `Cannot accept attempt in terminal/superseded status '${attempt.status}'.`
      );
    }

    // Exclusive Assignment Check
    const existingActive = await this.assignmentRepo.findByRequirementId(
      attempt.requirementId
    );

    if (existingActive && existingActive.providerId !== attempt.providerId) {
      throw ApiError.conflict(
        `Conflict: Requirement '${attempt.requirementId}' was already assigned to another provider (${existingActive.providerId}).`
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Default 2-hour progress update SLA
    const expectedUpdateMs = now.getTime() + 2 * 60 * 60 * 1000;
    const expectedUpdateIso = new Date(expectedUpdateMs).toISOString();

    const assignmentId = `asgn_${crypto.randomUUID()}`;
    const newAssignment: EngineAssignment = {
      assignmentId,
      caseId: req.caseId,
      requirementId: req.requirementId,
      providerId: attempt.providerId,
      serviceLocationId: attempt.serviceLocationId,
      status: "ACCEPTED",
      acceptedAt: nowIso,
      workStartedAt: null,
      expectedUpdateAt: expectedUpdateIso,
      lastProgressAt: nowIso,
      resolvedAt: null,
      outcome: null,
      humanApproved: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Atomic assignment creation
    let savedAssignment: EngineAssignment;
    try {
      savedAssignment = await this.assignmentRepo.create(newAssignment);
    } catch (err) {
      throw ApiError.conflict(
        `Conflict: Requirement '${attempt.requirementId}' was already accepted by another concurrent provider.`
      );
    }

    // Update attempt
    const updatedAttempt = await this.attemptRepo.update(attemptId, {
      status: "ACCEPTED",
      acceptedAt: nowIso,
    });

    // Cancel or supersede all competing attempts for this requirement
    const allAttempts = await this.attemptRepo.findByRequirementId(
      req.requirementId
    );
    for (const comp of allAttempts) {
      if (
        comp.attemptId !== attemptId &&
        ["CREATED", "QUEUED", "SENT", "DELIVERED", "ACKNOWLEDGED"].includes(
          comp.status
        )
      ) {
        await this.attemptRepo.update(comp.attemptId, {
          status: "SUPERSEDED",
          supersededAt: nowIso,
        });

        await this.eventRepo.append({
          eventId: `evt_${crypto.randomUUID()}`,
          caseId: req.caseId,
          requirementId: req.requirementId,
          attemptId: comp.attemptId,
          assignmentId: savedAssignment.assignmentId,
          eventType: "COMPETING_OFFER_SUPERSEDED",
          previousState: comp.status,
          newState: "SUPERSEDED",
          actorType: "SYSTEM",
          actorId,
          metadata: {
            winningProviderId: attempt.providerId,
            supersededProviderId: comp.providerId,
          },
          timestamp: nowIso,
        });
      }
    }

    // Update requirement to ASSIGNED with progress deadline
    const updatedReq = await this.reqRepo.update(req.requirementId, {
      status: "ASSIGNED",
      assignedProviderId: attempt.providerId,
      assignedServiceLocationId: attempt.serviceLocationId || null,
      nextActionAt: expectedUpdateIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "PROVIDER",
      ownerId: attempt.providerId,
    });

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: req.caseId,
      requirementId: req.requirementId,
      attemptId,
      assignmentId: savedAssignment.assignmentId,
      eventType: "OUTREACH_ACCEPTED_LOCKED",
      previousState: req.status,
      newState: "ASSIGNED",
      actorType: "PROVIDER",
      actorId,
      metadata: {
        providerId: attempt.providerId,
        assignmentId: savedAssignment.assignmentId,
        expectedUpdateAt: expectedUpdateIso,
      },
      timestamp: nowIso,
    });

    // Update organization reliability metrics on acceptance
    const org = await this.orgRepo.findById(attempt.providerId);
    if (org) {
      const metrics = org.reliabilityMetrics || {
        successfulResponses: 0,
        eligibleResolvedAttempts: 0,
        averageResponseMinutes: null,
        sampleSize: 0,
        categoryMetrics: {},
      };
      metrics.successfulResponses = (metrics.successfulResponses || 0) + 1;
      metrics.eligibleResolvedAttempts =
        (metrics.eligibleResolvedAttempts || 0) + 1;

      const catMetric = metrics.categoryMetrics[req.serviceType] || {
        successfulResponses: 0,
        eligibleResolvedAttempts: 0,
      };
      catMetric.successfulResponses += 1;
      catMetric.eligibleResolvedAttempts += 1;
      metrics.categoryMetrics[req.serviceType] = catMetric;

      await this.orgRepo.update(attempt.providerId, {
        reliabilityMetrics: metrics,
      });
    }

    logger.info("Outreach accepted and assignment locked", "OUTREACH_SERVICE", {
      requirementId: req.requirementId,
      providerId: attempt.providerId,
      assignmentId: savedAssignment.assignmentId,
    });

    return {
      assignment: savedAssignment,
      attempt: updatedAttempt!,
      requirement: updatedReq!,
    };
  }

  /**
   * Records provider rejection with a structured reason.
   */
  async recordRejection(
    attemptId: string,
    reason: RejectionReason,
    actorId: string
  ): Promise<OutreachAttempt> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound(`Outreach attempt '${attemptId}' not found.`);
    }

    const req = await this.reqRepo.findById(attempt.requirementId);
    if (!req) {
      throw ApiError.notFound(`Requirement '${attempt.requirementId}' not found.`);
    }

    // Version validation (Phase 8)
    if (attempt.outreachVersion !== req.outreachVersion) {
      throw ApiError.badRequest(
        `Stale rejection: Attempt outreach version ${attempt.outreachVersion} does not match current requirement version ${req.outreachVersion}.`
      );
    }

    const nowIso = new Date().toISOString();
    const updated = await this.attemptRepo.update(attemptId, {
      status: "REJECTED",
      rejectedAt: nowIso,
      rejectionReason: reason,
    });

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: attempt.caseId,
      requirementId: attempt.requirementId,
      attemptId,
      assignmentId: null,
      eventType: "OUTREACH_REJECTED",
      previousState: attempt.status,
      newState: "REJECTED",
      actorType: "PROVIDER",
      actorId,
      metadata: {
        providerId: attempt.providerId,
        rejectionReason: reason,
      },
      timestamp: nowIso,
    });

    // Record response outcome in provider reliability metrics
    const org = await this.orgRepo.findById(attempt.providerId);
    if (org) {
      const metrics = org.reliabilityMetrics || {
        successfulResponses: 0,
        eligibleResolvedAttempts: 0,
        averageResponseMinutes: null,
        sampleSize: 0,
        categoryMetrics: {},
      };
      metrics.eligibleResolvedAttempts =
        (metrics.eligibleResolvedAttempts || 0) + 1;

      const catMetric = metrics.categoryMetrics[req.serviceType] || {
        successfulResponses: 0,
        eligibleResolvedAttempts: 0,
      };
      catMetric.eligibleResolvedAttempts += 1;
      metrics.categoryMetrics[req.serviceType] = catMetric;

      await this.orgRepo.update(attempt.providerId, {
        reliabilityMetrics: metrics,
      });
    }

    return updated!;
  }
}
