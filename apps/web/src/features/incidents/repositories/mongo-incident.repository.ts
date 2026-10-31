import { Db, Collection, MongoError } from "mongodb";
import {
  IncidentSourceType,
  IncidentSubjectType,
} from "@umeed/contracts";
import {
  IncidentDocument,
  IncidentFilterOptions,
  ReviewActionDocument,
} from "../types";
import { IIncidentRepository } from "./incident.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

/**
 * Production MongoDB Atlas Incident Repository
 *
 * Implements strict indexes, atomic operations, GeoJSON 2dsphere indexing,
 * and reliable duplicate key resolution.
 */
export class MongoIncidentRepository implements IIncidentRepository {
  private db: Db | null = null;
  private collectionName = "incidents";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<IncidentDocument>> {
    if (this.db) {
      return this.db.collection<IncidentDocument>(this.collectionName);
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
    return this.db.collection<IncidentDocument>(this.collectionName);
  }

  /**
   * Initializes all required production indexes idempotently.
   */
  async initIndexes(): Promise<void> {
    try {
      const collection = await this.getCollection();

      // 1. Unique compound index on { source_type: 1, source_reference: 1 } for idempotency
      await collection.createIndex(
        { source_type: 1, source_reference: 1 },
        { unique: true, name: "idx_source_idempotency" }
      );

      // 2. Geospatial 2dsphere index for proximity and duplicate candidate queries
      await collection.createIndex(
        { "location.geo": "2dsphere" },
        { name: "idx_location_geo_2dsphere", sparse: true }
      );

      // 3. Operational query index on status and created_at
      await collection.createIndex(
        { status: 1, created_at: -1 },
        { name: "idx_status_created" }
      );

      // 4. Filtering index on incident_type and reported_at
      await collection.createIndex(
        { incident_type: 1, reported_at: -1 },
        { name: "idx_type_reported" }
      );

      // 5. Unique index on public_reference
      await collection.createIndex(
        { public_reference: 1 },
        { unique: true, name: "idx_public_reference_unique" }
      );

      // 6. Secure lookup index on tracking_token_hash
      await collection.createIndex(
        { tracking_token_hash: 1 },
        { name: "idx_tracking_token_hash", sparse: true }
      );

      logger.info("MongoDB incident collection indexes successfully verified", "DB");
    } catch (err) {
      logger.error("Failed to initialize MongoDB incident indexes", err, "DB");
      throw err;
    }
  }

  async create(incident: IncidentDocument): Promise<IncidentDocument> {
    const collection = await this.getCollection();

    // Ensure GeoJSON is properly formatted with [longitude, latitude] ordering
    const docToInsert: IncidentDocument = { ...incident };
    if (
      incident.location.latitude !== null &&
      incident.location.longitude !== null
    ) {
      docToInsert.location = {
        ...incident.location,
        geo: {
          type: "Point",
          coordinates: [incident.location.longitude, incident.location.latitude],
        },
      };
    } else {
      docToInsert.location = {
        ...incident.location,
        geo: null,
      };
    }

    try {
      await collection.insertOne(docToInsert as never);
      return docToInsert;
    } catch (err) {
      // Catch MongoDB duplicate key error code 11000
      if ((err as MongoError).code === 11000) {
        const error = new Error(`Duplicate incident key: ${(err as Error).message}`);
        (error as unknown as { code: number }).code = 11000;
        throw error;
      }
      throw err;
    }
  }

  async findBySource(
    sourceType: IncidentSourceType,
    sourceReference: string
  ): Promise<IncidentDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({
      source_type: sourceType,
      source_reference: sourceReference,
    } as never) as Promise<IncidentDocument | null>;
  }

  async findByPublicReference(publicReference: string): Promise<IncidentDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({
      public_reference: publicReference,
    } as never) as Promise<IncidentDocument | null>;
  }

  async findByTrackingHash(tokenHash: string): Promise<IncidentDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({
      tracking_token_hash: tokenHash,
    } as never) as Promise<IncidentDocument | null>;
  }

  async findNearbyCandidates(
    location: { longitude: number; latitude: number },
    maxDistanceMeters: number,
    maxAgeHours: number,
    subjectType?: IncidentSubjectType
  ): Promise<IncidentDocument[]> {
    const collection = await this.getCollection();
    const minTimestamp = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

    const query: Record<string, unknown> = {
      "location.geo": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [location.longitude, location.latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
      reported_at: { $gte: minTimestamp },
    };

    if (subjectType) {
      query.subject_type = subjectType;
    }

    const cursor = collection.find(query as never).limit(20);
    return cursor.toArray() as Promise<IncidentDocument[]>;
  }

  async list(
    filter: IncidentFilterOptions = {}
  ): Promise<{ incidents: IncidentDocument[]; total: number }> {
    const collection = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter.status) query.status = filter.status;
    if (filter.incident_type) query.incident_type = filter.incident_type;
    if (filter.source_type) query.source_type = filter.source_type;
    if (filter.is_suspected_duplicate !== undefined) {
      query.is_suspected_duplicate = filter.is_suspected_duplicate;
    }
    if (filter.requires_human_review !== undefined) {
      query.requires_human_review = filter.requires_human_review;
    }
    if (filter.district) {
      query["location.district"] = filter.district;
    }

    const total = await collection.countDocuments(query as never);
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    const incidents = (await collection
      .find(query as never)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()) as IncidentDocument[];

    return { incidents, total };
  }

  async update(idOrRef: string, updates: Partial<IncidentDocument>): Promise<IncidentDocument | null> {
    const collection = await this.getCollection();
    const query = idOrRef.startsWith("UMD-")
      ? { public_reference: idOrRef }
      : { _id: idOrRef };

    const result = await collection.findOneAndUpdate(
      query as never,
      {
        $set: {
          ...updates,
          updated_at: new Date().toISOString(),
        },
      } as never,
      { returnDocument: "after" }
    );

    return result as IncidentDocument | null;
  }

  async recordReviewAction(action: ReviewActionDocument): Promise<ReviewActionDocument> {
    if (!this.db) {
      await this.getCollection();
    }
    const reviewCollection = this.db!.collection<ReviewActionDocument>("review_actions");
    await reviewCollection.insertOne(action as never);
    return action;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      await collection.db.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({});
  }
}
