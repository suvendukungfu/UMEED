import { Organization } from "../types";

export interface OrganizationFilter {
  serviceCategory?: string;
  verificationStatus?: string;
  operationalStatus?: string;
  search?: string;
}

export interface IOrganizationRepository {
  initIndexes(): Promise<void>;
  create(org: Organization): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  update(id: string, updates: Partial<Organization>): Promise<Organization | null>;
  list(filter?: OrganizationFilter): Promise<Organization[]>;
  clear(): Promise<void>;
}

