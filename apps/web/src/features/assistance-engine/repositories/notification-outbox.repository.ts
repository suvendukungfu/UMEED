import { NotificationOutbox, OutboxStatus } from "../types";

export interface OutboxFilter {
  status?: OutboxStatus;
  caseId?: string;
  requirementId?: string;
  attemptId?: string;
  channel?: string;
}

export interface INotificationOutboxRepository {
  initIndexes(): Promise<void>;
  enqueue(item: NotificationOutbox): Promise<NotificationOutbox>;
  findById(id: string): Promise<NotificationOutbox | null>;
  findByIdempotencyKey(key: string): Promise<NotificationOutbox | null>;
  update(
    id: string,
    updates: Partial<NotificationOutbox>
  ): Promise<NotificationOutbox | null>;
  list(filter?: OutboxFilter): Promise<NotificationOutbox[]>;
  findPendingForDispatch(nowIso: string, limit?: number): Promise<NotificationOutbox[]>;
  clear(): Promise<void>;
}

