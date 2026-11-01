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

export class InMemoryFacilityRepository implements IFacilityRepository {
  private facilities: Map<string, ServiceFacilityEntity> = new Map();

  async findById(id: string): Promise<ServiceFacilityEntity | null> {
    return this.facilities.get(id) || null;
  }

  async create(facility: ServiceFacilityEntity): Promise<ServiceFacilityEntity> {
    this.facilities.set(facility.id, { ...facility });
    return { ...facility };
  }

  async update(
    id: string,
    updates: Partial<ServiceFacilityEntity>
  ): Promise<ServiceFacilityEntity | null> {
    const existing = this.facilities.get(id);
    if (!existing) return null;
    const updated: ServiceFacilityEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.facilities.set(id, updated);
    return { ...updated };
  }

  async list(filter?: FacilityFilterOptions): Promise<{ facilities: ServiceFacilityEntity[]; total: number }> {
    let items = Array.from(this.facilities.values());
    if (filter?.district) {
      const d = filter.district.toLowerCase();
      items = items.filter((f) => f.location.district.toLowerCase() === d);
    }
    if (filter?.facilityType) {
      items = items.filter((f) => f.facilityType === filter.facilityType);
    }
    if (filter?.verificationState) {
      items = items.filter((f) => f.verificationState === filter.verificationState);
    }
    if (filter?.isReferralOnly !== undefined) {
      items = items.filter((f) => f.isReferralDestinationOnly === filter.isReferralOnly);
    }
    const total = items.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    return {
      facilities: items.slice(offset, offset + limit),
      total,
    };
  }

  async findNearby(coords: [number, number], maxDistanceMeters: number): Promise<ServiceFacilityEntity[]> {
    const [targetLng, targetLat] = coords;
    return Array.from(this.facilities.values()).filter((f) => {
      const [lng, lat] = f.location.geo.coordinates;
      const dMeters = calculateHaversineDistanceKm(targetLat, targetLng, lat, lng) * 1000;
      return dMeters <= maxDistanceMeters;
    });
  }

  seed(facilities: ServiceFacilityEntity[]): void {
    for (const f of facilities) {
      this.facilities.set(f.id, { ...f });
    }
  }
}

export class InMemoryOrganizationEntityRepository implements IOrganizationEntityRepository {
  private orgs: Map<string, OrganizationEntity> = new Map();

  async findById(id: string): Promise<OrganizationEntity | null> {
    return this.orgs.get(id) || null;
  }

  async create(org: OrganizationEntity): Promise<OrganizationEntity> {
    this.orgs.set(org.id, { ...org });
    return { ...org };
  }

  async update(id: string, updates: Partial<OrganizationEntity>): Promise<OrganizationEntity | null> {
    const existing = this.orgs.get(id);
    if (!existing) return null;
    const updated: OrganizationEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.orgs.set(id, updated);
    return { ...updated };
  }

  async list(filter?: { isUmeedPartner?: boolean; district?: string }): Promise<OrganizationEntity[]> {
    let items = Array.from(this.orgs.values());
    if (filter?.isUmeedPartner !== undefined) {
      items = items.filter((o) => o.isUmeedPartner === filter.isUmeedPartner);
    }
    if (filter?.district) {
      const d = filter.district.toLowerCase();
      items = items.filter((o) => o.operationalDistricts.some((od) => od.toLowerCase() === d));
    }
    return items;
  }

  seed(orgs: OrganizationEntity[]): void {
    for (const o of orgs) {
      this.orgs.set(o.id, { ...o });
    }
  }
}

export class InMemoryProviderRelationshipRepository implements IProviderRelationshipRepository {
  private rels: Map<string, ProviderFacilityRelationship> = new Map();

  async create(rel: ProviderFacilityRelationship): Promise<ProviderFacilityRelationship> {
    this.rels.set(rel.relationshipId, { ...rel });
    return { ...rel };
  }

  async findByFacility(facilityId: string): Promise<ProviderFacilityRelationship[]> {
    return Array.from(this.rels.values()).filter((r) => r.facilityId === facilityId);
  }

  async findByOrganization(organizationId: string): Promise<ProviderFacilityRelationship[]> {
    return Array.from(this.rels.values()).filter((r) => r.organizationId === organizationId);
  }

  seed(rels: ProviderFacilityRelationship[]): void {
    for (const r of rels) {
      this.rels.set(r.relationshipId, { ...r });
    }
  }
}

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
