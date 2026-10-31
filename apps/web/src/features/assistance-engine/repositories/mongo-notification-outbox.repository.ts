import { Db, Collection, MongoError } from "mongodb";
import { NotificationOutbox } from "../types";
import {
  INotificationOutboxRepository,
  OutboxFilter,
} from "./notification-outbox.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoNotificationOutboxRepository
  implements INotificationOutboxRepository
{
  private db: Db | null = null;
  private collectionName = "notification_outbox";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<NotificationOutbox>> {
    if (this.db) {
      return this.db.collection<NotificationOutbox>(this.collectionName);
    }
    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error("MongoDB client is unavailable.");
    }
    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<NotificationOutbox>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    await col.createIndex(
      { notificationId: 1 },
      { unique: true, name: "idx_outbox_notification_id_unique" }
    );
    // Enforce uniqueness on idempotencyKey
    await col.createIndex(
      { idempotencyKey: 1 },
      { unique: true, name: "idx_outbox_idempotency_unique" }
    );
    await col.createIndex(
      { status: 1, nextRetryAt: 1 },
      { name: "idx_outbox_status_next_retry" }
    );
    logger.info("MongoDB NotificationOutbox indexes initialized", "OUTBOX_REPO");
  }

  async enqueue(item: NotificationOutbox): Promise<NotificationOutbox> {
    const col = await this.getCollection();
    try {
      await col.insertOne({ ...item } as never);
      return item;
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        logger.warn("Idempotency collision on outbox enqueue", "OUTBOX_REPO", {
          idempotencyKey: item.idempotencyKey,
        });
      }
      throw err;
    }
  }

  async findById(id: string): Promise<NotificationOutbox | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ notificationId: id } as never);
    return (doc as unknown as NotificationOutbox) || null;
  }

  async findByIdempotencyKey(key: string): Promise<NotificationOutbox | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ idempotencyKey: key } as never);
    return (doc as unknown as NotificationOutbox) || null;
  }

  async update(
    id: string,
    updates: Partial<NotificationOutbox>
  ): Promise<NotificationOutbox | null> {
    const col = await this.getCollection();
    const res = await col.findOneAndUpdate(
      { notificationId: id } as never,
      { $set: updates } as never,
      { returnDocument: "after" }
    );
    return (res as unknown as NotificationOutbox) || null;
  }

  async list(filter?: OutboxFilter): Promise<NotificationOutbox[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter?.status) query.status = filter.status;
    if (filter?.caseId) query.caseId = filter.caseId;
    if (filter?.requirementId) query.requirementId = filter.requirementId;
    if (filter?.attemptId) query.attemptId = filter.attemptId;
    if (filter?.channel) query.channel = filter.channel;

    const docs = await col.find(query as never).toArray();
    return docs as unknown as NotificationOutbox[];
  }

  async findPendingForDispatch(
    nowIso: string,
    limit = 50
  ): Promise<NotificationOutbox[]> {
    const col = await this.getCollection();
    const docs = await col
      .find({
        status: { $in: ["PENDING", "FAILED"] },
        $or: [
          { nextRetryAt: null },
          { nextRetryAt: { $lte: nowIso } },
        ],
      } as never)
      .limit(limit)
      .toArray();
    return docs as unknown as NotificationOutbox[];
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}

