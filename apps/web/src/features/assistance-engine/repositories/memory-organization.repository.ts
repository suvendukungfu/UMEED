import { Organization } from "../types";
import { IOrganizationRepository, OrganizationFilter } from "./organization.repository";

export class InMemoryOrganizationRepository implements IOrganizationRepository {
  private organizations: Map<string, Organization> = new Map();

  async initIndexes(): Promise<void> {
    // In-memory no-op
  }

  async create(org: Organization): Promise<Organization> {
    const copy = JSON.parse(JSON.stringify(org));
    this.organizations.set(copy.organizationId, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async findById(id: string): Promise<Organization | null> {
    const found = this.organizations.get(id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async update(
    id: string,
    updates: Partial<Organization>
  ): Promise<Organization | null> {
    const existing = this.organizations.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.organizations.set(id, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter?: OrganizationFilter): Promise<Organization[]> {
    let result = Array.from(this.organizations.values());

    if (filter) {
      if (filter.serviceCategory) {
        result = result.filter((o) =>
          o.serviceCategories.includes(filter.serviceCategory!)
        );
      }
      if (filter.verificationStatus) {
        result = result.filter(
          (o) => o.verificationStatus === filter.verificationStatus
        );
      }
      if (filter.operationalStatus) {
        result = result.filter(
          (o) => o.operationalStatus === filter.operationalStatus
        );
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        result = result.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.organizationId.toLowerCase().includes(q)
        );
      }
    }

    return JSON.parse(JSON.stringify(result));
  }

  async clear(): Promise<void> {
    this.organizations.clear();
  }
}

