import {
  ServiceFacilityEntity,
  OrganizationEntity,
  ProviderFacilityRelationship,
} from "@umeed/contracts";
import {
  IFacilityRepository,
  IOrganizationEntityRepository,
  IProviderRelationshipRepository,
  FacilityFilterOptions,
} from "./facility.repository";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";

export class MongoFacilityRepository implements IFacilityRepository {
  private collectionName = "facilities";

  private async getCollection() {
    const promise = getMongoClientPromise();
    if (!promise) {
      throw new Error("MongoDB client is not configured.");
    }
    const client = await promise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    return client.db(dbName).collection<ServiceFacilityEntity>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    await col.createIndex({ id: 1 }, { unique: true, name: "idx_facility_id_unique" });
    await col.createIndex({ "location.geo": "2dsphere" }, { name: "idx_facility_geo_2dsphere" });
    await col.createIndex({ "location.district": 1 }, { name: "idx_facility_district" });
    await col.createIndex({ facilityType: 1 }, { name: "idx_facility_type" });
    await col.createIndex({ verificationState: 1 }, { name: "idx_facility_verification_state" });
  }

  async findById(id: string): Promise<ServiceFacilityEntity | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ id });
    return doc || null;
  }

  async create(facility: ServiceFacilityEntity): Promise<ServiceFacilityEntity> {
    const col = await this.getCollection();
    await col.insertOne({ ...facility });
    return facility;
  }

  async update(
    id: string,
    updates: Partial<ServiceFacilityEntity>
  ): Promise<ServiceFacilityEntity | null> {
    const col = await this.getCollection();
    const doc = await col.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    return doc || null;
  }

  async list(filter?: FacilityFilterOptions): Promise<{ facilities: ServiceFacilityEntity[]; total: number }> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};
    if (filter?.district) {
      query["location.district"] = new RegExp(`^${filter.district}$`, "i");
    }
    if (filter?.facilityType) {
      query["facilityType"] = filter.facilityType;
    }
    if (filter?.verificationState) {
      query["verificationState"] = filter.verificationState;
    }
    if (filter?.isReferralOnly !== undefined) {
      query["isReferralDestinationOnly"] = filter.isReferralOnly;
    }
    const total = await col.countDocuments(query);
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const facilities = await col.find(query).skip(offset).limit(limit).toArray();
    return { facilities, total };
  }

  async findNearby(coords: [number, number], maxDistanceMeters: number): Promise<ServiceFacilityEntity[]> {
    const col = await this.getCollection();
    return col
      .find({
        "location.geo": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: coords,
            },
            $maxDistance: maxDistanceMeters,
          },
        },
      })
      .toArray();
  }
}

export class MongoOrganizationEntityRepository implements IOrganizationEntityRepository {
  private collectionName = "organizations";

  private async getCollection() {
    const promise = getMongoClientPromise();
    if (!promise) {
      throw new Error("MongoDB client is not configured.");
    }
    const client = await promise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    return client.db(dbName).collection<OrganizationEntity>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    await col.createIndex({ id: 1 }, { unique: true, name: "idx_org_id_unique" });
    await col.createIndex({ isUmeedPartner: 1 }, { name: "idx_org_is_partner" });
    await col.createIndex({ operationalDistricts: 1 }, { name: "idx_org_districts" });
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    const col = await this.getCollection();
    return col.findOne({ id });
  }

  async create(org: OrganizationEntity): Promise<OrganizationEntity> {
    const col = await this.getCollection();
    await col.insertOne({ ...org });
    return org;
  }

  async update(id: string, updates: Partial<OrganizationEntity>): Promise<OrganizationEntity | null> {
    const col = await this.getCollection();
    const doc = await col.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    return doc || null;
  }

  async list(filter?: { isUmeedPartner?: boolean; district?: string }): Promise<OrganizationEntity[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};
    if (filter?.isUmeedPartner !== undefined) {
      query["isUmeedPartner"] = filter.isUmeedPartner;
    }
    if (filter?.district) {
      query["operationalDistricts"] = new RegExp(`^${filter.district}$`, "i");
    }
    return col.find(query).toArray();
  }
}

export class MongoProviderRelationshipRepository implements IProviderRelationshipRepository {
  private collectionName = "provider_relationships";

  private async getCollection() {
    const promise = getMongoClientPromise();
    if (!promise) {
      throw new Error("MongoDB client is not configured.");
    }
    const client = await promise;
    const dbName = getServerEnv().MONGODB_DB || "umeed_db";
    return client.db(dbName).collection<ProviderFacilityRelationship>(this.collectionName);
  }

  async initIndexes(): Promise<void> {
    const col = await this.getCollection();
    await col.createIndex({ relationshipId: 1 }, { unique: true, name: "idx_rel_id_unique" });
    await col.createIndex({ facilityId: 1 }, { name: "idx_rel_facility" });
    await col.createIndex({ organizationId: 1 }, { name: "idx_rel_org" });
  }

  async create(rel: ProviderFacilityRelationship): Promise<ProviderFacilityRelationship> {
    const col = await this.getCollection();
    await col.insertOne({ ...rel });
    return rel;
  }

  async findByFacility(facilityId: string): Promise<ProviderFacilityRelationship[]> {
    const col = await this.getCollection();
    return col.find({ facilityId }).toArray();
  }

  async findByOrganization(organizationId: string): Promise<ProviderFacilityRelationship[]> {
    const col = await this.getCollection();
    return col.find({ organizationId }).toArray();
  }
}
