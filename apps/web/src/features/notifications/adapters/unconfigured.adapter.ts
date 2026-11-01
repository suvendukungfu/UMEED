import { INotificationAdapter } from "./notification.adapter";
import { NotificationPayload, SendNotificationResult } from "../types";
import { logger } from "@/lib/logging";

/**
 * Production Unconfigured Notification Adapter
 *
 * Enforces production safety invariant:
 * In production, if live notification carrier credentials are not configured,
 * UMEED never fabricates successful SMS, WhatsApp, or email delivery.
 * Accurately records NOT_CONFIGURED status.
 */
export class UnconfiguredNotificationAdapter implements INotificationAdapter {
  isMock(): boolean {
    return false;
  }

  getChannelName(): string {
    return "unconfigured";
  }

  async send(payload: NotificationPayload): Promise<SendNotificationResult> {
    logger.warn("Notification dispatch skipped: live provider unconfigured in production", "NOTIFICATIONS", {
      notification_id: payload.notification_id,
      channel: payload.channel,
      organisation_id: payload.organisation_id,
    });

    return {
      success: false,
      status: "NOT_CONFIGURED",
      error: "Notification provider credentials are not configured in production. Outbound communications are disabled.",
    };
  }
}

