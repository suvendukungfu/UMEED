import { NotificationPayload, SendNotificationResult } from "../types";

export interface INotificationAdapter {
  send(payload: NotificationPayload): Promise<SendNotificationResult>;
  isMock(): boolean;
  getChannelName(): string;
}
