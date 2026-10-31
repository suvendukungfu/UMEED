import { Db, Collection, MongoError } from "mongodb";
import { EngineAssignment } from "../types";
import {
  IEngineAssignmentRepository,
  EngineAssignmentFilter,
} from "./engine-assignment.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoEngineAssignmentRepository implements IEngineAssignmentRepository {
  private db: Db | null = null;
  private collectionName = "engine_assignments";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<EngineAssignment>> {
    if (this.db) {
      return this.db.collection<EngineAssignment>(this.collectionName);
    }
    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error("MongoDB client is unavailable.");
    }
    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<EngineAssignment>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    // Unique on assignmentId
    await col.createIndex(
      { assignmentId: 1 },
      { unique: true, name: "idx_engine_assignment_id_unique" }
    );
    // Index on caseId
    await col.createIndex({ caseId: 1 }, { name: "idx_engine_assignment_case_id" });
    // Partial unique index for active assignment per requirement to prevent race conditions:
    // Only one active assignment (ACCEPTED, WORK_STARTED, IN_PROGRESS) allowed per requirementId!
    await col.createIndex(
      { requirementId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: { $in: ["ACCEPTED", "WORK_STARTED", "IN_PROGRESS"] },
        },
        name: "idx_unique_active_assignment_per_req",
      }
    );
    await col.createIndex(
      { providerId: 1, status: 1 },
      { name: "idx_engine_assignment_provider_status" }
    );
    logger.info("MongoDB EngineAssignment indexes initialized", "ENGINE_ASSIGNMENT_REPO");
  }

  async create(assignment: EngineAssignment): Promise<EngineAssignment> {
    const col = await this.getCollection();
    try {
      await col.insertOne({ ...assignment } as never);
      return assignment;
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        logger.warn("Conflict: Active assignment already exists for requirement", "ENGINE_ASSIGNMENT_REPO", {
          requirementId: assignment.requirementId,
        });
      }
      throw err;
    }
  }

  async findById(assignmentId: string): Promise<EngineAssignment | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ assignmentId } as never);
    return (doc as unknown as EngineAssignment) || null;
  }

  async findByRequirementId(requirementId: string): Promise<EngineAssignment | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({
      requirementId,
      status: { $in: ["ACCEPTED", "WORK_STARTED", "IN_PROGRESS", "RESOLVED"] },
    } as never);
    return (doc as unknown as EngineAssignment) || null;
  }

  async findByCaseId(caseId: string): Promise<EngineAssignment[]> {
    const col = await this.getCollection();
    const docs = await col.find({ caseId } as never).toArray();
    return docs as unknown as EngineAssignment[];
  }

  async findByProviderId(providerId: string): Promise<EngineAssignment[]> {
    const col = await this.getCollection();
    const docs = await col.find({ providerId } as never).toArray();
    return docs as unknown as EngineAssignment[];
  }

  async update(
    assignmentId: string,
    updates: Partial<EngineAssignment>
  ): Promise<EngineAssignment | null> {
    const col = await this.getCollection();
    const res = await col.findOneAndUpdate(
      { assignmentId } as never,
      { $set: { ...updates, updatedAt: new Date().toISOString() } } as never,
      { returnDocument: "after" }
    );
    return (res as unknown as EngineAssignment) || null;
  }

  async list(filter?: EngineAssignmentFilter): Promise<EngineAssignment[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter?.caseId) query.caseId = filter.caseId;
    if (filter?.requirementId) query.requirementId = filter.requirementId;
    if (filter?.providerId) query.providerId = filter.providerId;
    if (filter?.status) query.status = filter.status;

    const docs = await col.find(query as never).toArray();
    return docs as unknown as EngineAssignment[];
  }

  async findStaleProgress(thresholdIso: string): Promise<EngineAssignment[]> {
    const col = await this.getCollection();
    const docs = await col
      .find({
        status: { $in: ["ACCEPTED", "WORK_STARTED", "IN_PROGRESS"] },
        expectedUpdateAt: { $lte: thresholdIso },
      } as never)
      .toArray();
    return docs as unknown as EngineAssignment[];
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}

