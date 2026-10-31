import { Db, Collection } from "mongodb";
import { IncidentType, IncidentSubjectType } from "@umeed/contracts";
import { NGODocument, NGOFilterOptions } from "../types";
import { INGORepository } from "./ngo.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoNGORepository implements INGORepository {
  private db: Db | null = null;
  private collectionName = "ngos";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<NGODocument>> {
    if (this.db) {
      return this.db.collection<NGODocument>(this.collectionName);
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
    return this.db.collection<NGODocument>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    try {
      const col = await this.getCollection();

      // 1. Unique index on ngo_id
      await col.createIndex({ ngo_id: 1 }, { unique: true, name: "idx_ngo_id_unique" });

      // 2. Unique sparse index on registration_number
      await col.createIndex(
        { registration_number: 1 },
        { unique: true, sparse: true, name: "idx_registration_number_unique" }
      );

      // 3. Multi-key index on service_categories
      await col.createIndex({ service_categories: 1 }, { name: "idx_service_categories" });

      // 4. Multi-key index on operational_districts
      await col.createIndex({ operational_districts: 1 }, { name: "idx_operational_districts" });

      // 5. Verification status filter
      await col.createIndex({ verification_status: 1 }, { name: "idx_verification_status" });

      // 6. 2dsphere index on headquarters_location.geo
      await col.createIndex(
        { "headquarters_location.geo": "2dsphere" },
        { sparse: true, name: "idx_hq_geo_2dsphere" }
      );

      logger.info("MongoDB NGO indexes initialized successfully", "NGO_REPO");
    } catch (err) {
      logger.error("Failed to initialize NGO database indexes", err, "NGO_REPO");
      throw err;
    }
  }

  async create(ngo: NGODocument): Promise<NGODocument> {
    const col = await this.getCollection();
    await col.insertOne(ngo as never);
    return ngo;
  }

  async findById(idOrNgoId: string): Promise<NGODocument | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({
      $or: [{ _id: idOrNgoId }, { ngo_id: idOrNgoId }],
    } as never);
    return (doc as unknown as NGODocument) || null;
  }

  async findByRegistrationNumber(regNumber: string): Promise<NGODocument | null> {
    const col = await this.getCollection();
    const clean = regNumber.trim();
    const doc = await col.findOne({
      registration_number: { $regex: new RegExp(`^${clean}$`, "i") },
    } as never);
    return (doc as unknown as NGODocument) || null;
  }

  async findByNameAndDistrict(name: string, district: string): Promise<NGODocument | null> {
    const col = await this.getCollection();
    const cleanName = name.trim();
    const cleanDistrict = district.trim();

    const doc = await col.findOne({
      $and: [
        {
          $or: [
            { organisation_name: { $regex: new RegExp(`^${cleanName}$`, "i") } },
            { alternate_names: { $regex: new RegExp(`^${cleanName}$`, "i") } },
          ],
        },
        {
          operational_districts: { $regex: new RegExp(`^${cleanDistrict}$`, "i") },
        },
      ],
    } as never);

    return (doc as unknown as NGODocument) || null;
  }

  async update(idOrNgoId: string, updates: Partial<NGODocument>): Promise<NGODocument | null> {
    const col = await this.getCollection();
    const res = await col.findOneAndUpdate(
      { $or: [{ _id: idOrNgoId }, { ngo_id: idOrNgoId }] } as never,
      {
        $set: {
          ...updates,
          updated_at: new Date().toISOString(),
        },
      } as never,
      { returnDocument: "after" }
    );
    return (res as unknown as NGODocument) || null;
  }

  async list(filter?: NGOFilterOptions): Promise<{ ngos: NGODocument[]; total: number }> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter) {
      if (filter.service_category) {
        query.service_categories = filter.service_category;
      }
      if (filter.supported_subject_type) {
        query.supported_subject_types = filter.supported_subject_type;
      }
      if (filter.operational_district) {
        query.operational_districts = {
          $regex: new RegExp(`^${filter.operational_district}$`, "i"),
        };
      }
      if (filter.verification_status) {
        query.verification_status = filter.verification_status;
      }
      if (filter.availability_status) {
        query.availability_status = filter.availability_status;
      }
      if (filter.capacity_status) {
        query.capacity_status = filter.capacity_status;
      }
      if (filter.accepting_assignments !== undefined) {
        query.accepting_assignments = filter.accepting_assignments;
      }
      if (filter.is_demo !== undefined) {
        query.is_demo = filter.is_demo;
      }
      if (filter.search_query) {
        const q = filter.search_query.trim();
        query.$or = [
          { organisation_name: { $regex: q, $options: "i" } },
          { ngo_id: { $regex: q, $options: "i" } },
          { registration_number: { $regex: q, $options: "i" } },
          { alternate_names: { $regex: q, $options: "i" } },
        ];
      }
    }

    const total = await col.countDocuments(query as never);
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    const docs = await col
      .find(query as never)
      .sort({ organisation_name: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      ngos: docs as unknown as NGODocument[],
      total,
    };
  }

  async findCandidatesForMatching(criteria: {
    serviceCategory: IncidentType;
    subjectType: IncidentSubjectType;
    district?: string | null;
  }): Promise<NGODocument[]> {
    const col = await this.getCollection();

    const query: Record<string, unknown> = {
      verification_status: { $nin: ["SUSPENDED", "INACTIVE"] },
      service_categories: criteria.serviceCategory,
      supported_subject_types: criteria.subjectType,
    };

    const docs = await col.find(query as never).toArray();
    return docs as unknown as NGODocument[];
  }

  async findNearby(
    location: { longitude: number; latitude: number },
    maxDistanceMeters: number
  ): Promise<NGODocument[]> {
    const col = await this.getCollection();

    const query = {
      "headquarters_location.geo": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [location.longitude, location.latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    const docs = await col.find(query as never).toArray();
    return docs as unknown as NGODocument[];
  }

  async isHealthy(): Promise<boolean> {
    try {
      const col = await this.getCollection();
      await col.findOne({}, { projection: { _id: 1 } });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}
