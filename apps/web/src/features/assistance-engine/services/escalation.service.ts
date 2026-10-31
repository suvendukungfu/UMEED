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
} from "../repositories";
import { OutreachService } from "./outreach.service";
import { GeospatialDiscoveryService } from "./geospatial-discovery.service";
import { NotificationOutboxService } from "./notification-outbox.service";
import {
  AssistanceRequirement,
  OutreachAttempt,
  RejectionReason,
} from "../types";
import { EngineConfig, getEngineConfig } from "../config";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export class EscalationService {
  private reqRepo: IAssistanceRequirementRepository;
  private attemptRepo: IOutreachAttemptRepository;
  private assignmentRepo: IEngineAssignmentRepository;
  private eventRepo: IEngineCaseEventRepository;
  private outreachService: OutreachService;
  private discoveryService: GeospatialDiscoveryService;
  private outboxService: NotificationOutboxService;
  private config: EngineConfig;

  constructor(options?: {
    reqRepo?: IAssistanceRequirementRepository;
    attemptRepo?: IOutreachAttemptRepository;
    assignmentRepo?: IEngineAssignmentRepository;
    eventRepo?: IEngineCaseEventRepository;
    outreachService?: OutreachService;
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
    this.config = getEngineConfig(options?.config);
    this.discoveryService =
      options?.discoveryService ||
      new GeospatialDiscoveryService({ config: this.config });
    this.outboxService =
      options?.outboxService || new NotificationOutboxService();
    this.outreachService =
      options?.outreachService ||
      new OutreachService({
        reqRepo: this.reqRepo,
        attemptRepo: this.attemptRepo,
        assignmentRepo: this.assignmentRepo,
        eventRepo: this.eventRepo,
        discoveryService: this.discoveryService,
        outboxService: this.outboxService,
        config: this.config,
      });
  }

  /**
   * Path A: Provider Failure Escalation (Phase 5)
   * Triggered when a provider rejects, times out, or fails delivery.
   */
  async escalateOnProviderFailure(
    requirementId: string,
    failedAttemptId: string,
    reason: RejectionReason | "TIMEOUT" | "DELIVERY_FAILURE",
    actorId = "system_watchdog"
  ): Promise<{
    requirement: AssistanceRequirement;
    newAttempts: OutreachAttempt[];
    escalatedToHumanReview: boolean;
  }> {
    const req = await this.reqRepo.findById(requirementId);
    if (!req) {
      throw ApiError.notFound(`Requirement '${requirementId}' not found.`);
    }

    const failedAttempt = await this.attemptRepo.findById(failedAttemptId);
    if (!failedAttempt) {
      throw ApiError.notFound(`Attempt '${failedAttemptId}' not found.`);
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Close or supersede the previous attempt
    let newStatus: OutreachAttempt["status"] = "REJECTED";
    let structuredReason: RejectionReason | null = null;

    if (reason === "TIMEOUT") {
      newStatus = "TIMED_OUT";
      structuredReason = "UNAVAILABLE_NOW";
    } else if (reason === "DELIVERY_FAILURE") {
      newStatus = "FAILED";
      structuredReason = "INVALID_CONTACT";
    } else {
      structuredReason = reason;
      newStatus = "REJECTED";
    }

    await this.attemptRepo.update(failedAttemptId, {
      status: newStatus,
      rejectionReason: structuredReason,
      rejectedAt: nowIso,
    });

    // 2. Check if any other active attempts exist for this current version
    const activeAttempts = await this.attemptRepo.list({
      requirementId: req.requirementId,
      outreachVersion: req.outreachVersion,
      status: "SENT",
    });

    // If other providers are still within their acknowledgement deadline, wait for them
    if (activeAttempts.length > 0 && reason !== "TIMEOUT") {
      logger.info(
        "Other provider outreach attempts still pending in current wave",
        "ESCALATION_SERVICE",
        { requirementId: req.requirementId, remaining: activeAttempts.length }
      );
      return {
        requirement: req,
        newAttempts: [],
        escalatedToHumanReview: false,
      };
    }

    // 3. Increment outreachRound and outreachVersion
    const nextRound = req.outreachRound + 1;
    const nextVersion = req.outreachVersion + 1;

    // 4. Invalidate and supersede previous attempts
    const previousAttempts = await this.attemptRepo.findByRequirementId(
      req.requirementId
    );
    for (const prev of previousAttempts) {
      if (
        ["CREATED", "QUEUED", "SENT", "DELIVERED", "ACKNOWLEDGED"].includes(
          prev.status
        )
      ) {
        await this.attemptRepo.update(prev.attemptId, {
          status: "SUPERSEDED",
          supersededAt: nowIso,
        });
      }
    }

    // 5. Gather all previously contacted or rejected provider IDs
    const durableExcluded = previousAttempts
      .filter(
        (a) =>
          a.status === "REJECTED" &&
          [
            "SERVICE_NOT_SUPPORTED",
            "OUTSIDE_SERVICE_AREA",
            "INVALID_CONTACT",
          ].includes(a.rejectionReason || "")
      )
      .map((a) => a.providerId);

    // 6. Re-run discovery with Round 2 rules (penalties, workload limits, durable exclusions)
    const discovery = await this.discoveryService.discoverProviders(
      req.caseId,
      req.requirementId,
      {
        serviceType: req.serviceType,
        location: req.location,
        urgency: req.urgency,
        excludedProviderIds: durableExcluded,
      },
      true // isRound2 = true
    );

    // Filter out candidates that already timed out or rejected in this case
    const alreadyContacted = new Set(previousAttempts.map((a) => a.providerId));
    const eligibleNextWave = discovery.rankedCandidates.filter(
      (c) =>
        c.eligibilityStatus === "ELIGIBLE" &&
        !alreadyContacted.has(c.providerId)
    );

    // 7. If no eligible providers remain, transition to HUMAN_REVIEW
    if (eligibleNextWave.length === 0) {
      const updatedReq = await this.reqRepo.update(req.requirementId, {
        status: "HUMAN_REVIEW",
        outreachRound: nextRound,
        outreachVersion: nextVersion,
        activeAttemptIds: [],
        nextActionAt: nowIso,
        lastMeaningfulActivityAt: nowIso,
        ownerType: "COORDINATOR",
        ownerId: "human_review_queue",
      });

      await this.eventRepo.append({
        eventId: `evt_${crypto.randomUUID()}`,
        caseId: req.caseId,
        requirementId: req.requirementId,
        attemptId: failedAttemptId,
        assignmentId: null,
        eventType: "ESCALATED_TO_HUMAN_REVIEW",
        previousState: req.status,
        newState: "HUMAN_REVIEW",
        actorType: "SYSTEM",
        actorId,
        metadata: {
          reason: `Outreach Round ${nextRound} has zero remaining eligible providers after ${reason}`,
          previousAttemptsCount: previousAttempts.length,
        },
        timestamp: nowIso,
      });

      logger.warn(
        "Zero remaining providers; escalated to HUMAN_REVIEW",
        "ESCALATION_SERVICE",
        { requirementId: req.requirementId, nextRound }
      );

      return {
        requirement: updatedReq!,
        newAttempts: [],
        escalatedToHumanReview: true,
      };
    }

    // 8. Contact next eligible wave
    const urgency = req.urgency || "medium";
    let waveLimit = this.config.outreachWaveLimits.medium;
    if (urgency === "low") waveLimit = this.config.outreachWaveLimits.low;
    else if (urgency === "high") waveLimit = this.config.outreachWaveLimits.high;
    else if (urgency === "critical") waveLimit = this.config.outreachWaveLimits.critical;

    const waveCandidates = eligibleNextWave.slice(0, waveLimit);

    const slaMinutes =
      this.config.acknowledgementSlaMinutes[
        urgency === "unconfirmed" ? "medium" : urgency
      ] || 15;
    const deadlineMs = now.getTime() + slaMinutes * 60 * 1000;
    const deadlineIso = new Date(deadlineMs).toISOString();

    const createdAttempts: OutreachAttempt[] = [];
    const attemptIds: string[] = [];

    for (const candidate of waveCandidates) {
      const attemptId = `att_${crypto.randomUUID()}`;
      const idempotencyKey = crypto
        .createHash("sha256")
        .update(
          `${req.requirementId}:${nextRound}:${nextVersion}:${candidate.providerId}`
        )
        .digest("hex");

      const attempt: OutreachAttempt = {
        attemptId,
        caseId: req.caseId,
        requirementId: req.requirementId,
        providerId: candidate.providerId,
        serviceLocationId: candidate.serviceLocationId,
        outreachRound: nextRound,
        outreachVersion: nextVersion,
        channel: "in_app",
        status: "SENT",
        scoreAtTimeOfSelection: candidate.totalScore,
        idempotencyKey,
        messageId: `msg_${attemptId}`,
        sentAt: nowIso,
        deliveredAt: nowIso,
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

      await this.outboxService.enqueueNotification({
        caseId: req.caseId,
        requirementId: req.requirementId,
        attemptId,
        recipient: candidate.providerId,
        channel: "in_app",
        payload: {
          round: nextRound,
          version: nextVersion,
          serviceType: req.serviceType,
          score: candidate.totalScore,
          deadline: deadlineIso,
        },
        idempotencyKey: `notif_${attemptId}`,
      });
    }

    const updatedReq = await this.reqRepo.update(req.requirementId, {
      status: "OUTREACH_ACTIVE",
      outreachRound: nextRound,
      outreachVersion: nextVersion,
      activeAttemptIds: attemptIds,
      nextActionAt: deadlineIso,
      lastMeaningfulActivityAt: nowIso,
    });

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId: req.caseId,
      requirementId: req.requirementId,
      attemptId: failedAttemptId,
      assignmentId: null,
      eventType: "ROUND_2_WAVE_INITIATED",
      previousState: req.status,
      newState: "OUTREACH_ACTIVE",
      actorType: "SYSTEM",
      actorId,
      metadata: {
        round: nextRound,
        version: nextVersion,
        waveSize: createdAttempts.length,
        providers: waveCandidates.map((c) => c.providerId),
        deadline: deadlineIso,
      },
      timestamp: nowIso,
    });

    logger.info("Round 2 escalation wave launched", "ESCALATION_SERVICE", {
      requirementId: req.requirementId,
      round: nextRound,
      version: nextVersion,
      count: createdAttempts.length,
    });

    return {
      requirement: updatedReq!,
      newAttempts: createdAttempts,
      escalatedToHumanReview: false,
    };
  }

  /**
   * Path B: Assistance Insufficiency (Phase 5)
   * Original assignment remains valid, new linked requirement created & matched independently.
   */
  async addSupplementalRequirement(
    caseId: string,
    params: {
      serviceType: string;
      subcategory?: string;
      description: string;
      urgency?: "low" | "medium" | "high" | "critical" | "unconfirmed";
      location: {
        latitude: number;
        longitude: number;
        address?: string;
        district?: string;
        ward?: string;
      };
      parentRequirementId?: string;
    },
    coordinatorId = "system_engine"
  ): Promise<{
    newRequirement: AssistanceRequirement;
    discovery: unknown;
  }> {
    const nowIso = new Date().toISOString();
    const requirementId = `req_${crypto.randomUUID()}`;

    const newReq: AssistanceRequirement = {
      requirementId,
      caseId,
      serviceType: params.serviceType,
      subcategory: params.subcategory || null,
      urgency: params.urgency || "medium",
      description: params.description,
      location: params.location,
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: params.parentRequirementId || null,
      nextActionAt: nowIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const savedReq = await this.reqRepo.create(newReq);

    await this.eventRepo.append({
      eventId: `evt_${crypto.randomUUID()}`,
      caseId,
      requirementId,
      attemptId: null,
      assignmentId: null,
      eventType: "SUPPLEMENTAL_REQUIREMENT_CREATED",
      previousState: null,
      newState: "PENDING_MATCH",
      actorType: "COORDINATOR",
      actorId: coordinatorId,
      metadata: {
        serviceType: params.serviceType,
        description: params.description,
      },
      timestamp: nowIso,
    });

    // Run first wave for this new supplemental requirement
    const outreachResult = await this.outreachService.initiateFirstWave(
      savedReq.requirementId,
      coordinatorId
    );

    return {
      newRequirement: outreachResult.requirement,
      discovery: outreachResult.attempts,
    };
  }
}
