import { INotificationAdapter } from "./notification.adapter";
import { MockNotificationAdapter } from "./mock.adapter";
import { ProductionNotificationAdapter } from "./production.adapter";
import { getServerEnv } from "@/lib/config/env";

export * from "./notification.adapter";
export * from "./mock.adapter";
export * from "./production.adapter";

export function getNotificationAdapter(custom?: INotificationAdapter): INotificationAdapter {
  if (custom) return custom;
  const env = getServerEnv();
  if (env.NODE_ENV === "production") {
    return new ProductionNotificationAdapter();
  }
  return new MockNotificationAdapter();
}
