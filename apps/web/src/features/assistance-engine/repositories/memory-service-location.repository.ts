import { ServiceLocation } from "../types";
import { IServiceLocationRepository, ServiceLocationFilter } from "./service-location.repository";

export class InMemoryServiceLocationRepository implements IServiceLocationRepository {
  private locations: Map<string, ServiceLocation> = new Map();

  async initIndexes(): Promise<void> {
    // In-memory no-op
  }

  async create(loc: ServiceLocation): Promise<ServiceLocation> {
    const copy = JSON.parse(JSON.stringify(loc));
    this.locations.set(copy.serviceLocationId, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async findById(id: string): Promise<ServiceLocation | null> {
    const found = this.locations.get(id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByProviderId(providerId: string): Promise<ServiceLocation[]> {
    const res: ServiceLocation[] = [];
    for (const loc of this.locations.values()) {
      if (loc.providerId === providerId) {
        res.push(JSON.parse(JSON.stringify(loc)));
      }
    }
    return res;
  }

  async update(
    id: string,
    updates: Partial<ServiceLocation>
  ): Promise<ServiceLocation | null> {
    const existing = this.locations.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
    };
    this.locations.set(id, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter?: ServiceLocationFilter): Promise<ServiceLocation[]> {
    let result = Array.from(this.locations.values());

    if (filter) {
      if (filter.providerId) {
        result = result.filter((l) => l.providerId === filter.providerId);
      }
      if (filter.district) {
        const d = filter.district.toLowerCase();
        result = result.filter((l) => l.district.toLowerCase() === d);
      }
      if (filter.ward) {
        const w = filter.ward.toLowerCase();
        result = result.filter((l) => (l.ward || "").toLowerCase() === w);
      }
      if (filter.service) {
        result = result.filter((l) => l.supportedServices.includes(filter.service!));
      }
      if (filter.operationalStatus) {
        result = result.filter((l) => l.operationalStatus === filter.operationalStatus);
      }
      if (filter.availabilityStatus) {
        result = result.filter((l) => l.availabilityStatus === filter.availabilityStatus);
      }
    }

    return JSON.parse(JSON.stringify(result));
  }

  async findNearby(
    longitude: number,
    latitude: number,
    maxDistanceMeters: number,
    filter?: ServiceLocationFilter
  ): Promise<ServiceLocation[]> {
    const candidates = await this.list(filter);
    const maxKm = maxDistanceMeters / 1000;

    const nearby = candidates
      .map((loc) => {
        const distKm = this.calculateHaversineDistanceKm(
          latitude,
          longitude,
          loc.location.coordinates[1],
          loc.location.coordinates[0]
        );
        return { loc, distKm };
      })
      .filter((item) => item.distKm <= maxKm)
      .sort((a, b) => a.distKm - b.distKm)
      .map((item) => item.loc);

    return nearby;
  }

  calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // km
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const d = 2 * R * Math.asin(Math.sqrt(a));
    return d;
  }

  async clear(): Promise<void> {
    this.locations.clear();
  }
}

