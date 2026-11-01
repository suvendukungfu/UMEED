import crypto from "crypto";
import {
  INotificationOutboxRepository,
  getNotificationOutboxRepository,
} from "../repositories";
import { INotificationAdapter, getNotificationAdapter } from "@/features/notifications";
import { NotificationOutbox, OutreachChannel } from "../types";
import { logger } from "@/lib/logging";

export class NotificationOutboxService {
  private outboxRepo: INotificationOutboxRepository;
  private notificationAdapter: INotificationAdapter;
  private maxRetries = 3;

  constructor(options?: {
    outboxRepo?: INotificationOutboxRepository;
    notificationAdapter?: INotificationAdapter;
  }) {
    this.outboxRepo =
      options?.outboxRepo || getNotificationOutboxRepository();
    this.notificationAdapter =
      options?.notificationAdapter || getNotificationAdapter();
  }

  /**
   * Enqueues an outbound notification idempotently.
   */
  async enqueueNotification(params: {
    caseId: string;
    requirementId?: string;
    attemptId?: string;
    recipient: string;
    channel: OutreachChannel;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<NotificationOutbox> {
    const key =
      params.idempotencyKey ||
      crypto
        .createHash("sha256")
        .update(
          `${params.caseId}:${params.requirementId || ""}:${params.attemptId || ""}:${params.recipient}:${params.channel}`
        )
        .digest("hex");

    // Check if already enqueued
    const existing = await this.outboxRepo.findByIdempotencyKey(key);
    if (existing) {
      logger.info("Notification outbox idempotent replay", "OUTBOX_SERVICE", {
        idempotencyKey: key,
        notificationId: existing.notificationId,
      });
      return existing;
    }

    const now = new Date().toISOString();
    const item: NotificationOutbox = {
      notificationId: `notif_${crypto.randomUUID()}`,
      idempotencyKey: key,
      caseId: params.caseId,
      requirementId: params.requirementId || null,
      attemptId: params.attemptId || null,
      recipient: params.recipient,
      channel: params.channel,
      payload: params.payload,
      status: "PENDING",
      retryCount: 0,
      nextRetryAt: now,
      lastError: null,
      createdAt: now,
      sentAt: null,
    };

    return await this.outboxRepo.enqueue(item);
  }

  /**
   * Dispatches pending notifications with retry policy and mock honesty.
   */
  async processOutbox(limit = 20): Promise<{
    processed: number;
    delivered: number;
    failed: number;
  }> {
    const nowIso = new Date().toISOString();
    const pending = await this.outboxRepo.findPendingForDispatch(nowIso, limit);

    let delivered = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        const sendResult = await this.notificationAdapter.send({
          notification_id: item.notificationId,
          case_id: item.caseId,
          assignment_id: item.attemptId || "direct",
          organisation_id: String(item.payload.providerId || "unknown"),
          channel: item.channel,
          recipient_address: item.recipient,
          subject: String(item.payload.subject || "UMEED Assistance Notification"),
          body: String(item.payload.body || ""),
          status: "QUEUED",
          created_at: item.createdAt,
          delivered_at: null,
          error_message: null,
          is_mock: this.notificationAdapter.isMock(),
        });

        if (sendResult.success) {
          const isMockAdapter = this.notificationAdapter.isMock();
          const recordedStatus = isMockAdapter ? "SIMULATED" : "DELIVERED";
          await this.outboxRepo.update(item.notificationId, {
            status: recordedStatus,
            sentAt: new Date().toISOString(),
            lastError: null,
          });
          delivered++;
        } else {
          throw new Error(sendResult.error || "Delivery failed");
        }
      } catch (err: unknown) {
        failed++;
        const nextRetries = item.retryCount + 1;
        const errMsg = err instanceof Error ? err.message : "Unknown notification error";

        if (nextRetries >= this.maxRetries) {
          await this.outboxRepo.update(item.notificationId, {
            status: "PERMANENTLY_FAILED",
            retryCount: nextRetries,
            lastError: errMsg,
          });
          logger.error("Outbox notification permanently failed", err, "OUTBOX_SERVICE", {
            notificationId: item.notificationId,
            retries: nextRetries,
          });
        } else {
          // Exponential backoff: 2^retry * 30 seconds
          const backoffSec = Math.pow(2, nextRetries) * 30;
          const nextRetryAt = new Date(Date.now() + backoffSec * 1000).toISOString();

          await this.outboxRepo.update(item.notificationId, {
            status: "FAILED",
            retryCount: nextRetries,
            nextRetryAt,
            lastError: errMsg,
          });
          logger.warn("Outbox notification failed; scheduled retry", "OUTBOX_SERVICE", {
            notificationId: item.notificationId,
            retryCount: nextRetries,
            nextRetryAt,
          });
        }
      }
    }

    return { processed: pending.length, delivered, failed };
  }
}
