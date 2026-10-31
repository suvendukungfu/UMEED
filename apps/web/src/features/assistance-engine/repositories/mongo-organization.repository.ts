import { Db, Collection } from "mongodb";
import { Organization } from "../types";
import { IOrganizationRepository, OrganizationFilter } from "./organization.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export class MongoOrganizationRepository implements IOrganizationRepository {
  private db: Db | null = null;
  private collectionName = "organizations";

  constructor(injectedDb?: Db) {
    if (injectedDb) {
      this.db = injectedDb;
    }
  }

  private async getCollection(): Promise<Collection<Organization>> {
    if (this.db) {
      return this.db.collection<Organization>(this.collectionName);
    }
    const clientPromise = getMongoClientPromise();
    if (!clientPromise) {
      throw new Error("MongoDB client is unavailable.");
    }
    const client = await clientPromise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    this.db = client.db(dbName);
    return this.db.collection<Organization>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    await col.createIndex(
      { organizationId: 1 },
      { unique: true, name: "idx_organization_id_unique" }
    );
    await col.createIndex(
      { serviceCategories: 1 },
      { name: "idx_org_service_categories" }
    );
    await col.createIndex(
      { verificationStatus: 1, operationalStatus: 1 },
      { name: "idx_org_verification_operational" }
    );
    logger.info("MongoDB Organization indexes initialized", "ORG_REPO");
  }

  async create(org: Organization): Promise<Organization> {
    const col = await this.getCollection();
    await col.insertOne({ ...org } as never);
    return org;
  }

  async findById(id: string): Promise<Organization | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ organizationId: id } as never);
    return (doc as unknown as Organization) || null;
  }

  async update(
    id: string,
    updates: Partial<Organization>
  ): Promise<Organization | null> {
    const col = await this.getCollection();
    const res = await col.findOneAndUpdate(
      { organizationId: id } as never,
      { $set: { ...updates, updatedAt: new Date().toISOString() } } as never,
      { returnDocument: "after" }
    );
    return (res as unknown as Organization) || null;
  }

  async list(filter?: OrganizationFilter): Promise<Organization[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};

    if (filter?.serviceCategory) query.serviceCategories = filter.serviceCategory;
    if (filter?.verificationStatus) query.verificationStatus = filter.verificationStatus;
    if (filter?.operationalStatus) query.operationalStatus = filter.operationalStatus;
    if (filter?.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: "i" } },
        { organizationId: { $regex: filter.search, $options: "i" } },
      ];
    }

    const docs = await col.find(query as never).toArray();
    return docs as unknown as Organization[];
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    await col.deleteMany({});
  }
}

