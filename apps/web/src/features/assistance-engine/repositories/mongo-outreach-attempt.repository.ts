import { Db, Collection, MongoError } from "mongodb";
import { OutreachAttempt } from "../types";
import {
  IOutreachAttemptRepository,
  OutreachAttemptFilter,
} from "./outreach-attempt.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoOutreachAttemptRepository implements IOutreachAttemptRepository {
  private db: Db | null = null;
  private collectionName = "outreach_attempts";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<OutreachAttempt>> {
    if (this.db) {
      return this.db.collection<OutreachAttempt>(this.collectionName);
    }
    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error("MongoDB client is unavailable.");
    }
    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<OutreachAttempt>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    // Unique on attemptId
    await col.createIndex(
      { attemptId: 1 },
      { unique: true, name: "idx_attempt_id_unique" }
    );
    // Mandatory unique on idempotencyKey
    await col.createIndex(
      { idempotencyKey: 1 },
      { unique: true, name: "idx_attempt_idempotency_unique" }
    );
    await col.createIndex(
      { requirementId: 1, outreachVersion: 1 },
      { name: "idx_attempt_req_version" }
    );
    await col.createIndex(
      { status: 1, acknowledgementDeadline: 1 },
      { name: "idx_attempt_status_deadline" }
    );
    logger.info("MongoDB OutreachAttempt indexes initialized", "ATTEMPT_REPO");
  }

  async create(attempt: OutreachAttempt): Promise<OutreachAttempt> {
    const col = await this.getCollection();
    try {
      await col.insertOne({ ...attempt } as never);
      return attempt;
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        logger.warn("Idempotency collision on outreach attempt insertion", "ATTEMPT_REPO", {
          idempotencyKey: attempt.idempotencyKey,
        });
      }
      throw err;
    }
  }

  async findById(attemptId: string): Promise<OutreachAttempt | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ attemptId } as never);
    return (doc as unknown as OutreachAttempt) || null;
  }

  async findByIdempotencyKey(key: string): Promise<OutreachAttempt | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ idempotencyKey: key } as never);
    return (doc as unknown as OutreachAttempt) || null;
  }

  async findByRequirementId(requirementId: string): Promise<OutreachAttempt[]> {
    const col = await this.getCollection();
    const docs = await col.find({ requirementId } as never).toArray();
    return docs as unknown as OutreachAttempt[];
  }

  async findByCaseId(caseId: string): Promise<OutreachAttempt[]> {
    const col = await this.getCollection();
    const docs = await col.find({ caseId } as never).toArray();
    return docs as unknown as OutreachAttempt[];
  }

  async update(
    attemptId: string,
    updates: Partial<OutreachAttempt>
  ): Promise<OutreachAttempt | null> {
    const col = await this.getCollection();
    const res = await col.findOneAndUpdate(
      { attemptId } as never,
      { $set: { ...updates, updatedAt: new Date().toISOString() } } as never,
      { returnDocument: "after" }
    );
    return (res as unknown as OutreachAttempt) || null;
  }

  async list(filter?: OutreachAttemptFilter): Promise<OutreachAttempt[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter?.caseId) query.caseId = filter.caseId;
    if (filter?.requirementId) query.requirementId = filter.requirementId;
    if (filter?.providerId) query.providerId = filter.providerId;
    if (filter?.status) query.status = filter.status;
    if (filter?.outreachRound) query.outreachRound = filter.outreachRound;
    if (filter?.outreachVersion) query.outreachVersion = filter.outreachVersion;

    const docs = await col.find(query as never).toArray();
    return docs as unknown as OutreachAttempt[];
  }

  async findOverdueAwaitingResponses(nowIso: string): Promise<OutreachAttempt[]> {
    const col = await this.getCollection();
    const docs = await col
      .find({
        status: { $in: ["SENT", "DELIVERED", "QUEUED", "CREATED"] },
        acknowledgementDeadline: { $lte: nowIso },
      } as never)
      .toArray();
    return docs as unknown as OutreachAttempt[];
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}

