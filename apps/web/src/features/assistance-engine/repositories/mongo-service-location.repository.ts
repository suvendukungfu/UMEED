import { Db, Collection } from "mongodb";
import { ServiceLocation } from "../types";
import { IServiceLocationRepository, ServiceLocationFilter } from "./service-location.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoServiceLocationRepository implements IServiceLocationRepository {
  private db: Db | null = null;
  private collectionName = "service_locations";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<ServiceLocation>> {
    if (this.db) {
      return this.db.collection<ServiceLocation>(this.collectionName);
    }
    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error("MongoDB client is unavailable.");
    }
    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<ServiceLocation>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    // 1. Unique index on serviceLocationId
    await col.createIndex(
      { serviceLocationId: 1 },
      { unique: true, name: "idx_service_location_id_unique" }
    );
    // 2. Index on providerId
    await col.createIndex({ providerId: 1 }, { name: "idx_provider_id" });
    // 3. 2dsphere index on GeoJSON Point
    await col.createIndex({ location: "2dsphere" }, { name: "idx_location_2dsphere" });
    // 4. Index on operational status & availability
    await col.createIndex(
      { operationalStatus: 1, availabilityStatus: 1 },
      { name: "idx_op_avail_status" }
    );
    // 5. Index on supportedServices
    await col.createIndex({ supportedServices: 1 }, { name: "idx_supported_services" });

    logger.info("MongoDB ServiceLocation indexes initialized", "SERVICE_LOCATION_REPO");
  }

  async create(loc: ServiceLocation): Promise<ServiceLocation> {
    const col = await this.getCollection();
    await col.insertOne({ ...loc } as never);
    return loc;
  }

  async findById(id: string): Promise<ServiceLocation | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ serviceLocationId: id } as never);
    return (doc as unknown as ServiceLocation) || null;
  }

  async findByProviderId(providerId: string): Promise<ServiceLocation[]> {
    const col = await this.getCollection();
    const docs = await col.find({ providerId } as never).toArray();
    return docs as unknown as ServiceLocation[];
  }

  async update(
    id: string,
    updates: Partial<ServiceLocation>
  ): Promise<ServiceLocation | null> {
    const col = await this.getCollection();
    const res = await col.findOneAndUpdate(
      { serviceLocationId: id } as never,
      { $set: updates } as never,
      { returnDocument: "after" }
    );
    return (res as unknown as ServiceLocation) || null;
  }

  async list(filter?: ServiceLocationFilter): Promise<ServiceLocation[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter?.providerId) query.providerId = filter.providerId;
    if (filter?.district) query.district = new RegExp(`^${filter.district}$`, "i");
    if (filter?.ward) query.ward = new RegExp(`^${filter.ward}$`, "i");
    if (filter?.service) query.supportedServices = filter.service;
    if (filter?.operationalStatus) query.operationalStatus = filter.operationalStatus;
    if (filter?.availabilityStatus) query.availabilityStatus = filter.availabilityStatus;

    const docs = await col.find(query as never).toArray();
    return docs as unknown as ServiceLocation[];
  }

  async findNearby(
    longitude: number,
    latitude: number,
    maxDistanceMeters: number,
    filter?: ServiceLocationFilter
  ): Promise<ServiceLocation[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    if (filter?.providerId) query.providerId = filter.providerId;
    if (filter?.service) query.supportedServices = filter.service;
    if (filter?.operationalStatus) query.operationalStatus = filter.operationalStatus;
    if (filter?.availabilityStatus) query.availabilityStatus = filter.availabilityStatus;

    const docs = await col.find(query as never).toArray();
    return docs as unknown as ServiceLocation[];
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}

