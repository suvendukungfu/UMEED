import { OrganizationMembership } from "@umeed/contracts";
import { getMongoClientPromise } from "@/lib/db/mongodb";

export interface IOrganizationMembershipRepository {
  create(membership: OrganizationMembership): Promise<OrganizationMembership>;
  findByUser(userId: string): Promise<OrganizationMembership[]>;
  findByOrganization(organizationId: string): Promise<OrganizationMembership[]>;
  findByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembership | null>;
  update(membershipId: string, updates: Partial<OrganizationMembership>): Promise<OrganizationMembership | null>;
  delete(membershipId: string): Promise<boolean>;
}

export class InMemoryOrganizationMembershipRepository implements IOrganizationMembershipRepository {
  private memberships: Map<string, OrganizationMembership> = new Map();

  async create(membership: OrganizationMembership): Promise<OrganizationMembership> {
    this.memberships.set(membership.membershipId, { ...membership });
    return { ...membership };
  }

  async findByUser(userId: string): Promise<OrganizationMembership[]> {
    return Array.from(this.memberships.values()).filter((m) => m.userId === userId);
  }

  async findByOrganization(organizationId: string): Promise<OrganizationMembership[]> {
    return Array.from(this.memberships.values()).filter((m) => m.organizationId === organizationId);
  }

  async findByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembership | null> {
    for (const m of this.memberships.values()) {
      if (m.userId === userId && m.organizationId === organizationId) {
        return { ...m };
      }
    }
    return null;
  }

  async update(
    membershipId: string,
    updates: Partial<OrganizationMembership>
  ): Promise<OrganizationMembership | null> {
    const existing = this.memberships.get(membershipId);
    if (!existing) return null;
    const updated: OrganizationMembership = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memberships.set(membershipId, updated);
    return { ...updated };
  }

  async delete(membershipId: string): Promise<boolean> {
    return this.memberships.delete(membershipId);
  }
}

export class MongoOrganizationMembershipRepository implements IOrganizationMembershipRepository {
  private collectionName = "organization_memberships";

  private async getCollection() {
    const promise = getMongoClientPromise();
    if (!promise) {
      throw new Error("MongoDB client is not configured.");
    }
    const client = await promise;
    return client.db().collection<OrganizationMembership>(this.collectionName);
  }

  async create(membership: OrganizationMembership): Promise<OrganizationMembership> {
    const col = await this.getCollection();
    await col.insertOne({ ...membership });
    return membership;
  }

  async findByUser(userId: string): Promise<OrganizationMembership[]> {
    const col = await this.getCollection();
    return col.find({ userId }).toArray();
  }

  async findByOrganization(organizationId: string): Promise<OrganizationMembership[]> {
    const col = await this.getCollection();
    return col.find({ organizationId }).toArray();
  }

  async findByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembership | null> {
    const col = await this.getCollection();
    return col.findOne({ userId, organizationId });
  }

  async update(
    membershipId: string,
    updates: Partial<OrganizationMembership>
  ): Promise<OrganizationMembership | null> {
    const col = await this.getCollection();
    const doc = await col.findOneAndUpdate(
      { membershipId },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    return doc || null;
  }

  async delete(membershipId: string): Promise<boolean> {
    const col = await this.getCollection();
    const res = await col.deleteOne({ membershipId });
    return res.deletedCount > 0;
  }
}

