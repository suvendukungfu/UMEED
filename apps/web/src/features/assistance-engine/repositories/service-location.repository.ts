import { ServiceLocation } from "../types";

export interface ServiceLocationFilter {
  providerId?: string;
  district?: string;
  ward?: string;
  service?: string;
  operationalStatus?: string;
  availabilityStatus?: string;
}

export interface IServiceLocationRepository {
  initIndexes(): Promise<void>;
  create(location: ServiceLocation): Promise<ServiceLocation>;
  findById(id: string): Promise<ServiceLocation | null>;
  findByProviderId(providerId: string): Promise<ServiceLocation[]>;
  update(id: string, updates: Partial<ServiceLocation>): Promise<ServiceLocation | null>;
  list(filter?: ServiceLocationFilter): Promise<ServiceLocation[]>;
  findNearby(
    longitude: number,
    latitude: number,
    maxDistanceMeters: number,
    filter?: ServiceLocationFilter
  ): Promise<ServiceLocation[]>;
  clear(): Promise<void>;
}

