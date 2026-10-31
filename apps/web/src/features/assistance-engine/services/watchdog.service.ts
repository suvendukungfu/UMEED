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
import { EscalationService } from "./escalation.service";
import { OutreachService } from "./outreach.service";
import { NotificationOutboxService } from "./notification-outbox.service";
import { EngineConfig, getEngineConfig } from "../config";
import { logger } from "@/lib/logging";

export interface WatchdogScanResult {
  timestamp: string;
  expiredAttemptsRecovered: number;
  expiredRequirementsRecovered: number;
  unassignedRecovered: number;
  staleAssignmentsFlagged: number;
  outboxProcessed: number;
  totalIssuesResolved: number;
  issues: Array<{
    type: string;
    id: string;
    actionTaken: string;
    details: Record<string, unknown>;
  }>;
}

export class NoColdCaseWatchdog {
  private reqRepo: IAssistanceRequirementRepository;
  private attemptRepo: IOutreachAttemptRepository;
  private assignmentRepo: IEngineAssignmentRepository;
  private eventRepo: IEngineCaseEventRepository;
  private escalationService: EscalationService;
  private outreachService: OutreachService;
  private outboxService: NotificationOutboxService;
  private config: EngineConfig;

  constructor(options?: {
    reqRepo?: IAssistanceRequirementRepository;
    attemptRepo?: IOutreachAttemptRepository;
    assignmentRepo?: IEngineAssignmentRepository;
    eventRepo?: IEngineCaseEventRepository;
    escalationService?: EscalationService;
    outreachService?: OutreachService;
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
    this.escalationService =
      options?.escalationService ||
      new EscalationService({
        reqRepo: this.reqRepo,
        attemptRepo: this.attemptRepo,
        assignmentRepo: this.assignmentRepo,
        eventRepo: this.eventRepo,
        config: this.config,
      });
    this.outboxService =
      options?.outboxService || new NotificationOutboxService();
    this.outreachService =
      options?.outreachService ||
      new OutreachService({
        reqRepo: this.reqRepo,
        attemptRepo: this.attemptRepo,
        assignmentRepo: this.assignmentRepo,
        eventRepo: this.eventRepo,
        outboxService: this.outboxService,
        config: this.config,
      });
  }

  /**
   * Performs an end-to-end watchdog scan and recovery cycle.
   */
  async runWatchdogCycle(currentDate?: Date): Promise<WatchdogScanResult> {
    const now = currentDate || new Date();
    const nowIso = now.toISOString();

    const result: WatchdogScanResult = {
      timestamp: nowIso,
      expiredAttemptsRecovered: 0,
      expiredRequirementsRecovered: 0,
      unassignedRecovered: 0,
      staleAssignmentsFlagged: 0,
      outboxProcessed: 0,
      totalIssuesResolved: 0,
      issues: [],
    };

    // -------------------------------------------------------------------------
    // 1. Recover Outreach Attempts Awaiting Response Beyond Deadline
    // -------------------------------------------------------------------------
    const overdueAttempts =
      await this.attemptRepo.findOverdueAwaitingResponses(nowIso);

    for (const attempt of overdueAttempts) {
      try {
        await this.escalationService.escalateOnProviderFailure(
          attempt.requirementId,
          attempt.attemptId,
          "TIMEOUT",
          "watchdog_worker"
        );

        result.expiredAttemptsRecovered++;
        result.issues.push({
          type: "OVERDUE_OUTREACH_ATTEMPT",
          id: attempt.attemptId,
          actionTaken: "Escalated to next round wave or human review due to timeout",
          details: {
            requirementId: attempt.requirementId,
            providerId: attempt.providerId,
            deadline: attempt.acknowledgementDeadline,
          },
        });
      } catch (err: unknown) {
        logger.error("Watchdog attempt recovery failed", err, "WATCHDOG", {
          attemptId: attempt.attemptId,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. Recover Open Requirements with Expired nextActionAt
    // -------------------------------------------------------------------------
    const pendingReqs = await this.reqRepo.findPendingWatchdog(nowIso);

    for (const req of pendingReqs) {
      try {
        if (req.status === "PENDING_MATCH") {
          await this.outreachService.initiateFirstWave(
            req.requirementId,
            "watchdog_worker"
          );
          result.expiredRequirementsRecovered++;
          result.issues.push({
            type: "EXPIRED_NEXT_ACTION_PENDING_MATCH",
            id: req.requirementId,
            actionTaken: "Initiated first wave outreach",
            details: { previousNextAction: req.nextActionAt },
          });
        } else if (req.status === "OUTREACH_ACTIVE") {
          // Check if active attempts still exist
          const active = await this.attemptRepo.list({
            requirementId: req.requirementId,
            outreachVersion: req.outreachVersion,
            status: "SENT",
          });

          if (active.length === 0) {
            // No active attempts; move to human review or trigger escalation
            const nextAction = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
            await this.reqRepo.update(req.requirementId, {
              status: "HUMAN_REVIEW",
              nextActionAt: nextAction,
              lastMeaningfulActivityAt: nowIso,
              ownerType: "COORDINATOR",
              ownerId: "human_review_queue",
            });

            await this.eventRepo.append({
              eventId: `evt_${crypto.randomUUID()}`,
              caseId: req.caseId,
              requirementId: req.requirementId,
              attemptId: null,
              assignmentId: null,
              eventType: "WATCHDOG_RECOVERED_STALLED_REQUIREMENT",
              previousState: req.status,
              newState: "HUMAN_REVIEW",
              actorType: "SYSTEM",
              actorId: "watchdog_worker",
              metadata: { reason: "Outreach active with zero active attempts" },
              timestamp: nowIso,
            });

            result.expiredRequirementsRecovered++;
            result.issues.push({
              type: "STALLED_OUTREACH_REQUIREMENT",
              id: req.requirementId,
              actionTaken: "Transitioned to HUMAN_REVIEW",
              details: { previousNextAction: req.nextActionAt },
            });
          }
        }
      } catch (err: unknown) {
        logger.error("Watchdog requirement recovery failed", err, "WATCHDOG", {
          requirementId: req.requirementId,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 3. Detect & Assign Cases / Requirements Without Owner
    // -------------------------------------------------------------------------
    const allOpenReqs = await this.reqRepo.list();
    for (const req of allOpenReqs) {
      if (
        !["RESOLVED", "CANCELLED"].includes(req.status) &&
        (!req.ownerId || req.ownerId.trim() === "")
      ) {
        const nextAction = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
        await this.reqRepo.update(req.requirementId, {
          ownerType: "COORDINATOR",
          ownerId: "coordinator_queue",
          nextActionAt: req.nextActionAt || nextAction,
          lastMeaningfulActivityAt: nowIso,
        });

        await this.eventRepo.append({
          eventId: `evt_${crypto.randomUUID()}`,
          caseId: req.caseId,
          requirementId: req.requirementId,
          attemptId: null,
          assignmentId: null,
          eventType: "WATCHDOG_OWNER_REMEDIATION",
          previousState: req.status,
          newState: req.status,
          actorType: "SYSTEM",
          actorId: "watchdog_worker",
          metadata: { assignedOwner: "coordinator_queue" },
          timestamp: nowIso,
        });

        result.unassignedRecovered++;
        result.issues.push({
          type: "MISSING_OWNER",
          id: req.requirementId,
          actionTaken: "Assigned default coordinator_queue owner",
          details: {},
        });
      }
    }

    // -------------------------------------------------------------------------
    // 4. Detect Accepted Assignments Lacking Expected Progress Updates
    // -------------------------------------------------------------------------
    const staleAssignments =
      await this.assignmentRepo.findStaleProgress(nowIso);

    for (const asgn of staleAssignments) {
      const nextExpected = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      await this.assignmentRepo.update(asgn.assignmentId, {
        expectedUpdateAt: nextExpected,
      });

      await this.outboxService.enqueueNotification({
        caseId: asgn.caseId,
        requirementId: asgn.requirementId,
        attemptId: asgn.assignmentId,
        recipient: asgn.providerId,
        channel: "in_app",
        payload: {
          type: "PROGRESS_REMINDER",
          assignmentId: asgn.assignmentId,
          message: "Please record arrival or ongoing progress update for your active assignment.",
        },
        idempotencyKey: `remind_${asgn.assignmentId}_${now.getHours()}`,
      });

      await this.eventRepo.append({
        eventId: `evt_${crypto.randomUUID()}`,
        caseId: asgn.caseId,
        requirementId: asgn.requirementId,
        attemptId: null,
        assignmentId: asgn.assignmentId,
        eventType: "WATCHDOG_PROGRESS_REMINDER_SENT",
        previousState: asgn.status,
        newState: asgn.status,
        actorType: "SYSTEM",
        actorId: "watchdog_worker",
        metadata: { nextExpectedUpdateAt: nextExpected },
        timestamp: nowIso,
      });

      result.staleAssignmentsFlagged++;
      result.issues.push({
        type: "STALE_ASSIGNMENT_PROGRESS",
        id: asgn.assignmentId,
        actionTaken: "Dispatched progress reminder and extended next action deadline",
        details: { previousExpectedUpdateAt: asgn.expectedUpdateAt },
      });
    }

    // -------------------------------------------------------------------------
    // 5. Process Failed / Pending Outbox Notifications
    // -------------------------------------------------------------------------
    try {
      const outboxRes = await this.outboxService.processOutbox(25);
      result.outboxProcessed = outboxRes.processed;
    } catch (err: unknown) {
      logger.error("Watchdog outbox processing failed", err, "WATCHDOG");
    }

    result.totalIssuesResolved =
      result.expiredAttemptsRecovered +
      result.expiredRequirementsRecovered +
      result.unassignedRecovered +
      result.staleAssignmentsFlagged;

    if (result.totalIssuesResolved > 0) {
      logger.info(
        `Watchdog cycle resolved ${result.totalIssuesResolved} operational issues`,
        "WATCHDOG",
        { summary: result }
      );
    }

    return result;
  }
}

export { NoColdCaseWatchdog as WatchdogService };
