import { Db, Collection } from "mongodb";
import { AssistanceRequirement } from "../types";
import {
  IAssistanceRequirementRepository,
  RequirementFilter,
} from "./assistance-requirement.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoAssistanceRequirementRepository
  implements IAssistanceRequirementRepository
{
  private db: Db | null = null;
  private collectionName = "assistance_requirements";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<AssistanceRequirement>> {
    if (this.db) {
      return this.db.collection<AssistanceRequirement>(this.collectionName);
    }
    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error("MongoDB client is unavailable.");
    }
    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<AssistanceRequirement>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    await col.createIndex(
      { requirementId: 1 },
      { unique: true, name: "idx_req_id_unique" }
    );
    await col.createIndex({ caseId: 1 }, { name: "idx_req_case_id" });
    await col.createIndex(
      { status: 1, nextActionAt: 1 },
      { name: "idx_req_status_next_action" }
    );
    await col.createIndex(
      { outreachVersion: 1 },
      { name: "idx_req_outreach_version" }
    );
    logger.info("MongoDB AssistanceRequirement indexes initialized", "REQ_REPO");
  }

  async create(req: AssistanceRequirement): Promise<AssistanceRequirement> {
    const col = await this.getCollection();
    await col.insertOne({ ...req } as never);
    return req;
  }

  async findById(id: string): Promise<AssistanceRequirement | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ requirementId: id } as never);
    return (doc as unknown as AssistanceRequirement) || null;
  }

  async findByCaseId(caseId: string): Promise<AssistanceRequirement[]> {
    const col = await this.getCollection();
    const docs = await col.find({ caseId } as never).toArray();
    return docs as unknown as AssistanceRequirement[];
  }

  async update(
    id: string,
    updates: Partial<AssistanceRequirement>
  ): Promise<AssistanceRequirement | null> {
    const col = await this.getCollection();
    const res = await col.findOneAndUpdate(
      { requirementId: id } as never,
      { $set: { ...updates, updatedAt: new Date().toISOString() } } as never,
      { returnDocument: "after" }
    );
    return (res as unknown as AssistanceRequirement) || null;
  }

  async list(filter?: RequirementFilter): Promise<AssistanceRequirement[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter?.caseId) query.caseId = filter.caseId;
    if (filter?.status) query.status = filter.status;
    if (filter?.serviceType) query.serviceType = filter.serviceType;
    if (filter?.assignedProviderId) query.assignedProviderId = filter.assignedProviderId;
    if (filter?.ownerId) query.ownerId = filter.ownerId;

    const docs = await col.find(query as never).toArray();
    return docs as unknown as AssistanceRequirement[];
  }

  async findPendingWatchdog(thresholdIso: string): Promise<AssistanceRequirement[]> {
    const col = await this.getCollection();
    const docs = await col
      .find({
        status: { $nin: ["RESOLVED", "CANCELLED"] },
        nextActionAt: { $lte: thresholdIso },
      } as never)
      .toArray();
    return docs as unknown as AssistanceRequirement[];
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}

