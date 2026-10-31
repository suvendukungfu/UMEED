import { Db, Collection, MongoError } from "mongodb";
import { Case, CaseEvent, CaseFilterOptions } from "../types";
import { ICaseRepository } from "./case.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoCaseRepository implements ICaseRepository {
  private db: Db | null = null;
  private casesCollectionName = "cases";
  private eventsCollectionName = "case_events";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCasesCollection(): Promise<Collection<Case>> {
    if (this.db) {
      return this.db.collection<Case>(this.casesCollectionName);
    }

    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error(
        "MongoDB client is unavailable. MONGODB_URI must be configured in environment."
      );
    }

    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<Case>(this.casesCollectionName);
  }

  private async getEventsCollection(): Promise<Collection<CaseEvent>> {
    if (this.db) {
      return this.db.collection<CaseEvent>(this.eventsCollectionName);
    }

    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error(
        "MongoDB client is unavailable. MONGODB_URI must be configured in environment."
      );
    }

    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<CaseEvent>(this.eventsCollectionName);
  }

  async initIndexes(): Promise<void> {
    try {
      const collection = await this.getCasesCollection();

      await collection.createIndex(
        { case_id: 1 },
        { unique: true, name: "idx_case_id_unique" }
      );

      await collection.createIndex(
        { incident_id: 1 },
        { unique: true, name: "idx_case_incident_unique" }
      );

      await collection.createIndex(
        { public_case_reference: 1 },
        { unique: true, name: "idx_case_ref_unique" }
      );

      await collection.createIndex(
        { case_status: 1, updated_at: -1 },
        { name: "idx_case_status_updated" }
      );

      await collection.createIndex(
        { "assignments.organisation_id": 1 },
        { name: "idx_case_assignments_org" }
      );

      const eventsCollection = await this.getEventsCollection();
      await eventsCollection.createIndex(
        { case_id: 1, timestamp: 1 },
        { name: "idx_case_events_case_time" }
      );

      logger.info("MongoDB Case & Event indexes initialized successfully", "CASE_REPO");
    } catch (error) {
      logger.error("Failed to initialize MongoDB Case indexes", error, "CASE_REPO");
      throw error;
    }
  }

  async create(caseRecord: Case): Promise<Case> {
    const collection = await this.getCasesCollection();
    try {
      await collection.insertOne({ ...caseRecord });
      return caseRecord;
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        logger.warn("Duplicate key collision on case insertion", "CASE_REPO", {
          incident_id: caseRecord.incident_id,
          case_id: caseRecord.case_id,
        });
      }
      throw error;
    }
  }

  async findById(caseId: string): Promise<Case | null> {
    const collection = await this.getCasesCollection();
    const doc = await collection.findOne({ case_id: caseId });
    return doc ? (doc as unknown as Case) : null;
  }

  async findByReference(publicCaseReference: string): Promise<Case | null> {
    const collection = await this.getCasesCollection();
    const doc = await collection.findOne({ public_case_reference: publicCaseReference });
    return doc ? (doc as unknown as Case) : null;
  }

  async findByIncidentId(incidentId: string): Promise<Case | null> {
    const collection = await this.getCasesCollection();
    const doc = await collection.findOne({ incident_id: incidentId });
    return doc ? (doc as unknown as Case) : null;
  }

  async findMany(filter?: CaseFilterOptions): Promise<{ cases: Case[]; total: number }> {
    const collection = await this.getCasesCollection();
    const query: Record<string, unknown> = {};

    if (filter?.status) {
      query.case_status = filter.status;
    }

    if (filter?.incident_reference) {
      query.incident_reference = filter.incident_reference;
    }

    if (filter?.organisation_id) {
      query["assignments.organisation_id"] = filter.organisation_id;
    }

    if (filter?.search) {
      const regex = { $regex: filter.search, $options: "i" };
      query.$or = [
        { public_case_reference: regex },
        { incident_reference: regex },
        { assistance_requirements: regex },
      ];
    }

    const total = await collection.countDocuments(query);
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;

    const docs = await collection
      .find(query)
      .sort({ updated_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      cases: docs as unknown as Case[],
      total,
    };
  }

  async update(caseId: string, partial: Partial<Case>): Promise<Case | null> {
    const collection = await this.getCasesCollection();
    const updated = await collection.findOneAndUpdate(
      { case_id: caseId },
      {
        $set: {
          ...partial,
          updated_at: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    return updated ? (updated as unknown as Case) : null;
  }

  async addEvent(event: CaseEvent): Promise<void> {
    const collection = await this.getEventsCollection();
    await collection.insertOne({ ...event });
  }

  async getEvents(caseId: string): Promise<CaseEvent[]> {
    const collection = await this.getEventsCollection();
    const docs = await collection
      .find({ case_id: caseId })
      .sort({ timestamp: 1 })
      .toArray();
    return docs as unknown as CaseEvent[];
  }
}
