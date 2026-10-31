import { NotificationOutbox } from "../types";
import {
  INotificationOutboxRepository,
  OutboxFilter,
} from "./notification-outbox.repository";

export class InMemoryNotificationOutboxRepository
  implements INotificationOutboxRepository
{
  private outbox: Map<string, NotificationOutbox> = new Map();
  private idempotencyMap: Map<string, string> = new Map();

  async initIndexes(): Promise<void> {
    // In-memory no-op
  }

  async enqueue(item: NotificationOutbox): Promise<NotificationOutbox> {
    if (this.outbox.has(item.notificationId)) {
      const err = new Error(
        `E11000 duplicate key error: notificationId ${item.notificationId} already exists`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    if (this.idempotencyMap.has(item.idempotencyKey)) {
      const err = new Error(
        `E11000 duplicate key error: idempotencyKey ${item.idempotencyKey} already exists`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    const copy = JSON.parse(JSON.stringify(item));
    this.outbox.set(copy.notificationId, copy);
    this.idempotencyMap.set(copy.idempotencyKey, copy.notificationId);
    return JSON.parse(JSON.stringify(copy));
  }

  async findById(id: string): Promise<NotificationOutbox | null> {
    const found = this.outbox.get(id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByIdempotencyKey(key: string): Promise<NotificationOutbox | null> {
    const id = this.idempotencyMap.get(key);
    if (!id) return null;
    return this.findById(id);
  }

  async update(
    id: string,
    updates: Partial<NotificationOutbox>
  ): Promise<NotificationOutbox | null> {
    const existing = this.outbox.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
    };
    this.outbox.set(id, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter?: OutboxFilter): Promise<NotificationOutbox[]> {
    let result = Array.from(this.outbox.values());

    if (filter) {
      if (filter.status) {
        result = result.filter((n) => n.status === filter.status);
      }
      if (filter.caseId) {
        result = result.filter((n) => n.caseId === filter.caseId);
      }
      if (filter.requirementId) {
        result = result.filter((n) => n.requirementId === filter.requirementId);
      }
      if (filter.attemptId) {
        result = result.filter((n) => n.attemptId === filter.attemptId);
      }
      if (filter.channel) {
        result = result.filter((n) => n.channel === filter.channel);
      }
    }

    return JSON.parse(JSON.stringify(result));
  }

  async findPendingForDispatch(
    nowIso: string,
    limit = 50
  ): Promise<NotificationOutbox[]> {
    const nowMs = new Date(nowIso).getTime();
    const result: NotificationOutbox[] = [];

    for (const item of this.outbox.values()) {
      if (["PENDING", "FAILED"].includes(item.status)) {
        if (!item.nextRetryAt || new Date(item.nextRetryAt).getTime() <= nowMs) {
          result.push(JSON.parse(JSON.stringify(item)));
        }
      }
    }

    return result.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.outbox.clear();
    this.idempotencyMap.clear();
  }
}

