import { Db, Collection } from "mongodb";
import { EngineCaseEvent } from "../types";
import { IEngineCaseEventRepository } from "./case-event.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoEngineCaseEventRepository implements IEngineCaseEventRepository {
  private db: Db | null = null;
  private collectionName = "engine_case_events";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<EngineCaseEvent>> {
    if (this.db) {
      return this.db.collection<EngineCaseEvent>(this.collectionName);
    }
    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error("MongoDB client is unavailable.");
    }
    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<EngineCaseEvent>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    await col.createIndex(
      { eventId: 1 },
      { unique: true, name: "idx_engine_event_id_unique" }
    );
    await col.createIndex(
      { caseId: 1, timestamp: 1 },
      { name: "idx_engine_event_case_time" }
    );
    await col.createIndex(
      { requirementId: 1, timestamp: 1 },
      { name: "idx_engine_event_req_time" }
    );
    logger.info("MongoDB EngineCaseEvent indexes initialized", "CASE_EVENT_REPO");
  }

  async append(event: EngineCaseEvent): Promise<EngineCaseEvent> {
    const col = await this.getCollection();
    await col.insertOne({ ...event } as never);
    return event;
  }

  async findByCaseId(caseId: string): Promise<EngineCaseEvent[]> {
    const col = await this.getCollection();
    const docs = await col
      .find({ caseId } as never)
      .sort({ timestamp: 1 })
      .toArray();
    return docs as unknown as EngineCaseEvent[];
  }

  async findByRequirementId(requirementId: string): Promise<EngineCaseEvent[]> {
    const col = await this.getCollection();
    const docs = await col
      .find({ requirementId } as never)
      .sort({ timestamp: 1 })
      .toArray();
    return docs as unknown as EngineCaseEvent[];
  }

  async list(limit = 100): Promise<EngineCaseEvent[]> {
    const col = await this.getCollection();
    const docs = await col
      .find({} as never)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return docs as unknown as EngineCaseEvent[];
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}

