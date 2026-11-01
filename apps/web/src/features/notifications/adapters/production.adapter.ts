import { INotificationAdapter } from "./notification.adapter";
import { NotificationPayload, SendNotificationResult } from "../types";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

/**
 * Production Notification Adapter
 *
 * Enforces Absolute Production Rule #9:
 * No simulated production notifications. If external carrier credentials
 * (SMS / Email / WhatsApp Webhook) are unconfigured, fails cleanly and reports
 * NOT_CONFIGURED without claiming false operational delivery.
 */
export class ProductionNotificationAdapter implements INotificationAdapter {
  isMock(): boolean {
    return false;
  }

  getChannelName(): string {
    return "production_multichannel";
  }

  async send(payload: NotificationPayload): Promise<SendNotificationResult> {
    const env = getServerEnv();

    // Check if live notification webhook or credentials exist
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const sendgridKey = process.env.SENDGRID_API_KEY;

    if (!webhookUrl && !twilioSid && !sendgridKey) {
      logger.warn(
        "Notification provider credentials missing; cannot dispatch live notification",
        "NOTIFICATIONS_PRODUCTION",
        {
          notification_id: payload.notification_id,
          channel: payload.channel,
          organisation_id: payload.organisation_id,
        }
      );
      return {
        success: false,
        status: "NOT_CONFIGURED",
        error: "Production notification provider credentials (SMS / Email / Webhook) are unconfigured.",
      };
    }

    // If webhook is configured, dispatch HTTP POST
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-umeed-notification-id": payload.notification_id,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          return {
            success: true,
            status: "ACCEPTED_BY_PROVIDER",
            delivered_at: new Date().toISOString(),
          };
        }

        return {
          success: false,
          status: "FAILED",
          error: `Provider HTTP Error ${res.status}: ${await res.text().catch(() => "")}`,
        };
      } catch (err: any) {
        return {
          success: false,
          status: "FAILED",
          error: `Failed to deliver notification to gateway: ${err.message}`,
        };
      }
    }

    return {
      success: false,
      status: "NOT_CONFIGURED",
      error: "No active notification gateway route available.",
    };
  }
}
