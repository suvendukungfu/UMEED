import { INotificationAdapter } from "./notification.adapter";
import { NotificationPayload, SendNotificationResult } from "../types";
import { logger } from "@/lib/logging";

/**
 * Truthful Mock Notification Adapter
 *
 * Security & Ethics Invariant:
 * Never fabricates real SMS, email, or WhatsApp delivery.
 * Accurately surfaces SIMULATED_MOCK status.
 */
export class MockNotificationAdapter implements INotificationAdapter {
  private simulateFailure: boolean = false;

  constructor(options?: { simulateFailure?: boolean }) {
    this.simulateFailure = options?.simulateFailure ?? false;
  }

  setSimulateFailure(value: boolean): void {
    this.simulateFailure = value;
  }

  isMock(): boolean {
    return true;
  }

  getChannelName(): string {
    return "simulated_mock";
  }

  async send(payload: NotificationPayload): Promise<SendNotificationResult> {
    if (this.simulateFailure) {
      logger.warn("Simulated mock notification failure triggered", "NOTIFICATIONS", {
        notification_id: payload.notification_id,
        channel: payload.channel,
        organisation_id: payload.organisation_id,
      });
      return {
        success: false,
        status: "FAILED",
        error: "Simulated Carrier connection error for testing resiliency.",
      };
    }

    const now = new Date().toISOString();
    logger.info("Mock notification delivered successfully", "NOTIFICATIONS", {
      notification_id: payload.notification_id,
      channel: payload.channel,
      organisation_id: payload.organisation_id,
      is_mock: true,
      // Redact recipient for privacy in logs
      recipient_preview: payload.recipient_address.substring(0, 3) + "***",
    });

    return {
      success: true,
      status: "SIMULATED_MOCK",
      delivered_at: now,
    };
  }
}
