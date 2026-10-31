import { IncidentType, IncidentSubjectType } from "@umeed/contracts";
import { INGORepository } from "./ngo.repository";
import { NGODocument, NGOFilterOptions } from "../types";

export class InMemoryNGORepository implements INGORepository {
  private ngos: Map<string, NGODocument> = new Map();

  async create(ngo: NGODocument): Promise<NGODocument> {
    // Unique registration number validation
    if (ngo.registration_number) {
      const existingReg = await this.findByRegistrationNumber(ngo.registration_number);
      if (existingReg && existingReg._id !== ngo._id) {
        const err = new Error(
          `E11000 duplicate key error: registration_number ${ngo.registration_number} already exists`
        );
        (err as { code?: number }).code = 11000;
        throw err;
      }
    }

    const doc: NGODocument = JSON.parse(JSON.stringify(ngo));
    this.ngos.set(doc._id, doc);
    return JSON.parse(JSON.stringify(doc));
  }

  async findById(idOrNgoId: string): Promise<NGODocument | null> {
    for (const doc of this.ngos.values()) {
      if (doc._id === idOrNgoId || doc.ngo_id === idOrNgoId) {
        return JSON.parse(JSON.stringify(doc));
      }
    }
    return null;
  }

  async findByRegistrationNumber(regNumber: string): Promise<NGODocument | null> {
    const clean = regNumber.trim().toLowerCase();
    for (const doc of this.ngos.values()) {
      if (doc.registration_number && doc.registration_number.trim().toLowerCase() === clean) {
        return JSON.parse(JSON.stringify(doc));
      }
    }
    return null;
  }

  async findByNameAndDistrict(name: string, district: string): Promise<NGODocument | null> {
    const cleanName = name.trim().toLowerCase();
    const cleanDistrict = district.trim().toLowerCase();

    for (const doc of this.ngos.values()) {
      const nameMatch =
        doc.organisation_name.toLowerCase() === cleanName ||
        doc.alternate_names.some((n) => n.toLowerCase() === cleanName);

      const districtMatch = doc.operational_districts.some(
        (d) => d.toLowerCase() === cleanDistrict
      );

      if (nameMatch && districtMatch) {
        return JSON.parse(JSON.stringify(doc));
      }
    }
    return null;
  }

  async update(idOrNgoId: string, updates: Partial<NGODocument>): Promise<NGODocument | null> {
    let existingId: string | null = null;
    for (const [id, doc] of this.ngos.entries()) {
      if (doc._id === idOrNgoId || doc.ngo_id === idOrNgoId) {
        existingId = id;
        break;
      }
    }

    if (!existingId) return null;

    const current = this.ngos.get(existingId)!;
    const updated: NGODocument = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.ngos.set(existingId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter?: NGOFilterOptions): Promise<{ ngos: NGODocument[]; total: number }> {
    let items = Array.from(this.ngos.values());

    if (filter) {
      if (filter.service_category) {
        items = items.filter((n) =>
          n.service_categories.includes(filter.service_category!)
        );
      }
      if (filter.supported_subject_type) {
        items = items.filter((n) =>
          n.supported_subject_types.includes(filter.supported_subject_type!)
        );
      }
      if (filter.operational_district) {
        const dClean = filter.operational_district.toLowerCase();
        items = items.filter((n) =>
          n.operational_districts.some((d) => d.toLowerCase() === dClean)
        );
      }
      if (filter.verification_status) {
        items = items.filter((n) => n.verification_status === filter.verification_status);
      }
      if (filter.availability_status) {
        items = items.filter((n) => n.availability_status === filter.availability_status);
      }
      if (filter.capacity_status) {
        items = items.filter((n) => n.capacity_status === filter.capacity_status);
      }
      if (filter.accepting_assignments !== undefined) {
        items = items.filter((n) => n.accepting_assignments === filter.accepting_assignments);
      }
      if (filter.is_demo !== undefined) {
        items = items.filter((n) => n.is_demo === filter.is_demo);
      }
      if (filter.search_query) {
        const q = filter.search_query.toLowerCase();
        items = items.filter(
          (n) =>
            n.organisation_name.toLowerCase().includes(q) ||
            n.ngo_id.toLowerCase().includes(q) ||
            (n.registration_number && n.registration_number.toLowerCase().includes(q)) ||
            n.alternate_names.some((an) => an.toLowerCase().includes(q))
        );
      }
    }

    const total = items.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const paged = items.slice(offset, offset + limit);

    return {
      ngos: JSON.parse(JSON.stringify(paged)),
      total,
    };
  }

  async findCandidatesForMatching(criteria: {
    serviceCategory: IncidentType;
    subjectType: IncidentSubjectType;
    district?: string | null;
  }): Promise<NGODocument[]> {
    const results: NGODocument[] = [];

    for (const doc of this.ngos.values()) {
      // Must not be inactive or suspended
      if (doc.verification_status === "INACTIVE" || doc.verification_status === "SUSPENDED") {
        continue;
      }

      // Hard capability check
      const hasCategory = doc.service_categories.includes(criteria.serviceCategory);
      const hasSubject = doc.supported_subject_types.includes(criteria.subjectType);

      if (hasCategory && hasSubject) {
        results.push(JSON.parse(JSON.stringify(doc)));
      }
    }

    return results;
  }

  async findNearby(
    location: { longitude: number; latitude: number },
    maxDistanceMeters: number
  ): Promise<NGODocument[]> {
    const results: NGODocument[] = [];

    for (const doc of this.ngos.values()) {
      const hq = doc.headquarters_location;
      if (hq.latitude !== null && hq.longitude !== null) {
        const distMeters = this.haversineDistanceMeters(
          location.latitude,
          location.longitude,
          hq.latitude,
          hq.longitude
        );
        if (distMeters <= maxDistanceMeters) {
          results.push(JSON.parse(JSON.stringify(doc)));
        }
      }
    }

    return results;
  }

  private haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async initIndexes(): Promise<void> {
    // In-memory simulation does not need external index creation
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async clear(): Promise<void> {
    this.ngos.clear();
  }
}
