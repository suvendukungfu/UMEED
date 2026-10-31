import { IncidentType, IncidentSubjectType } from "@umeed/contracts";
import { NGODocument, NGOFilterOptions } from "../types";

export interface INGORepository {
  create(ngo: NGODocument): Promise<NGODocument>;
  findById(idOrNgoId: string): Promise<NGODocument | null>;
  findByRegistrationNumber(regNumber: string): Promise<NGODocument | null>;
  findByNameAndDistrict(name: string, district: string): Promise<NGODocument | null>;
  update(idOrNgoId: string, updates: Partial<NGODocument>): Promise<NGODocument | null>;
  list(filter?: NGOFilterOptions): Promise<{ ngos: NGODocument[]; total: number }>;
  findCandidatesForMatching(criteria: {
    serviceCategory: IncidentType;
    subjectType: IncidentSubjectType;
    district?: string | null;
  }): Promise<NGODocument[]>;
  findNearby(
    location: { longitude: number; latitude: number },
    maxDistanceMeters: number
  ): Promise<NGODocument[]>;
  initIndexes(): Promise<void>;
  isHealthy(): Promise<boolean>;
  clear(): Promise<void>;
}
