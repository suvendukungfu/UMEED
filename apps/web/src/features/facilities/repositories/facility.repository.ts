import { ServiceFacilityEntity, OrganizationEntity, ProviderFacilityRelationship } from "@umeed/contracts";

export interface FacilityFilterOptions {
  district?: string;
  facilityType?: string;
  verificationState?: string;
  isReferralOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface IFacilityRepository {
  findById(id: string): Promise<ServiceFacilityEntity | null>;
  create(facility: ServiceFacilityEntity): Promise<ServiceFacilityEntity>;
  update(id: string, updates: Partial<ServiceFacilityEntity>): Promise<ServiceFacilityEntity | null>;
  list(filter?: FacilityFilterOptions): Promise<{ facilities: ServiceFacilityEntity[]; total: number }>;
  findNearby(coords: [number, number], maxDistanceMeters: number): Promise<ServiceFacilityEntity[]>;
}

export interface IOrganizationEntityRepository {
  findById(id: string): Promise<OrganizationEntity | null>;
  create(org: OrganizationEntity): Promise<OrganizationEntity>;
  update(id: string, updates: Partial<OrganizationEntity>): Promise<OrganizationEntity | null>;
  list(filter?: { isUmeedPartner?: boolean; district?: string }): Promise<OrganizationEntity[]>;
}

export interface IProviderRelationshipRepository {
  create(rel: ProviderFacilityRelationship): Promise<ProviderFacilityRelationship>;
  findByFacility(facilityId: string): Promise<ProviderFacilityRelationship[]>;
  findByOrganization(organizationId: string): Promise<ProviderFacilityRelationship[]>;
}
