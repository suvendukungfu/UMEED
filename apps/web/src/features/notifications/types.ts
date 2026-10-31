export type NotificationChannel =
  | "in_app"
  | "sms"
  | "whatsapp"
  | "email"
  | "phone_call";

export type NotificationDeliveryStatus =
  | "QUEUED"
  | "DELIVERED"
  | "SIMULATED_MOCK"
  | "FAILED";

export interface NotificationPayload {
  notification_id: string;
  case_id: string;
  assignment_id: string;
  organisation_id: string;
  channel: NotificationChannel;
  recipient_address: string;
  subject: string;
  body: string;
  status: NotificationDeliveryStatus;
  created_at: string;
  delivered_at: string | null;
  error_message: string | null;
  is_mock: boolean;
}

export interface SendNotificationResult {
  success: boolean;
  status: NotificationDeliveryStatus;
  error?: string;
  delivered_at?: string;
}
