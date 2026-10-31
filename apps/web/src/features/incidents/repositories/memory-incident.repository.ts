import {
  IncidentSourceType,
  IncidentSubjectType,
} from "@umeed/contracts";
import {
  IncidentDocument,
  IncidentFilterOptions,
  ReviewActionDocument,
} from "../types";
import { IIncidentRepository } from "./incident.repository";
import { calculateHaversineDistanceMeters } from "../services/duplicate.service";

/**
 * In-Memory Incident Repository
 *
 * Provides a high-fidelity, deterministic implementation of IIncidentRepository
 * for testing and local development when MongoDB Atlas is unconfigured.
 * Enforces the exact same uniqueness and index invariants as MongoDB.
 */
export class InMemoryIncidentRepository implements IIncidentRepository {
  private incidents: Map<string, IncidentDocument> = new Map();
  private sourceIndex: Map<string, string> = new Map(); // `${source_type}:::${source_reference}` -> _id
  private publicReferenceIndex: Map<string, string> = new Map(); // public_reference -> _id
  private trackingHashIndex: Map<string, string> = new Map(); // tracking_token_hash -> _id
  private reviewActions: Map<string, ReviewActionDocument> = new Map();

  async create(incident: IncidentDocument): Promise<IncidentDocument> {
    const sourceKey = `${incident.source_type}:::${incident.source_reference}`;

    // Enforce unique compound index on { source_type: 1, source_reference: 1 }
    if (this.sourceIndex.has(sourceKey)) {
      const err = new Error(
        `E11000 duplicate key error collection: incidents index: source_type_1_source_reference_1 dup key: { source_type: "${incident.source_type}", source_reference: "${incident.source_reference}" }`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    // Enforce unique index on public_reference
    if (this.publicReferenceIndex.has(incident.public_reference)) {
      const err = new Error(
        `E11000 duplicate key error collection: incidents index: public_reference_1 dup key: { public_reference: "${incident.public_reference}" }`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    // Deep clone to prevent external mutation
    const record: IncidentDocument = JSON.parse(JSON.stringify(incident));
    if (!record._id) {
      record._id = (incident as unknown as { id?: string }).id || `inc_${Math.random().toString(36).substring(2, 9)}`;
    }
    this.incidents.set(record._id, record);
    this.sourceIndex.set(sourceKey, record._id);
    this.publicReferenceIndex.set(record.public_reference, record._id);

    if (record.tracking_token_hash) {
      this.trackingHashIndex.set(record.tracking_token_hash, record._id);
    }

    return JSON.parse(JSON.stringify(record));
  }

  async findBySource(
    sourceType: IncidentSourceType,
    sourceReference: string
  ): Promise<IncidentDocument | null> {
    const sourceKey = `${sourceType}:::${sourceReference}`;
    const id = this.sourceIndex.get(sourceKey);
    if (!id) return null;
    const doc = this.incidents.get(id);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  async findByPublicReference(publicReference: string): Promise<IncidentDocument | null> {
    const id = this.publicReferenceIndex.get(publicReference);
    if (!id) return null;
    const doc = this.incidents.get(id);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  async findByTrackingHash(tokenHash: string): Promise<IncidentDocument | null> {
    const id = this.trackingHashIndex.get(tokenHash);
    if (!id) return null;
    const doc = this.incidents.get(id);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  async findNearbyCandidates(
    location: { longitude: number; latitude: number },
    maxDistanceMeters: number,
    maxAgeHours: number,
    subjectType?: IncidentSubjectType
  ): Promise<IncidentDocument[]> {
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const candidates: IncidentDocument[] = [];

    for (const incident of this.incidents.values()) {
      if (subjectType && incident.subject_type !== subjectType) {
        continue;
      }

      const reportTime = new Date(incident.reported_at).getTime();
      if (now - reportTime > maxAgeMs) {
        continue;
      }

      if (
        incident.location.latitude !== null &&
        incident.location.longitude !== null
      ) {
        const distance = calculateHaversineDistanceMeters(
          location.latitude,
          location.longitude,
          incident.location.latitude,
          incident.location.longitude
        );

        if (distance <= maxDistanceMeters) {
          candidates.push(JSON.parse(JSON.stringify(incident)));
        }
      }
    }

    return candidates;
  }

  async list(
    filter: IncidentFilterOptions = {}
  ): Promise<{ incidents: IncidentDocument[]; total: number }> {
    let result = Array.from(this.incidents.values());

    if (filter.status) {
      result = result.filter((i) => i.status === filter.status);
    }
    if (filter.incident_type) {
      result = result.filter((i) => i.incident_type === filter.incident_type);
    }
    if (filter.source_type) {
      result = result.filter((i) => i.source_type === filter.source_type);
    }
    if (filter.is_suspected_duplicate !== undefined) {
      result = result.filter(
        (i) => i.is_suspected_duplicate === filter.is_suspected_duplicate
      );
    }
    if (filter.requires_human_review !== undefined) {
      result = result.filter(
        (i) => i.requires_human_review === filter.requires_human_review
      );
    }

    // Sort by created_at descending
    result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = result.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paginated = result.slice(offset, offset + limit);

    return {
      incidents: paginated.map((i) => JSON.parse(JSON.stringify(i))),
      total,
    };
  }

  async update(idOrRef: string, updates: Partial<IncidentDocument>): Promise<IncidentDocument | null> {
    let targetId = idOrRef;
    if (this.publicReferenceIndex.has(idOrRef)) {
      targetId = this.publicReferenceIndex.get(idOrRef)!;
    }

    const existing = this.incidents.get(targetId);
    if (!existing) {
      return null;
    }

    const updated: IncidentDocument = {
      ...existing,
      ...updates,
      _id: existing._id,
      public_reference: existing.public_reference,
      updated_at: new Date().toISOString(),
    };

    this.incidents.set(targetId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async recordReviewAction(action: ReviewActionDocument): Promise<ReviewActionDocument> {
    const record: ReviewActionDocument = JSON.parse(JSON.stringify(action));
    this.reviewActions.set(record._id, record);
    return JSON.parse(JSON.stringify(record));
  }

  async initIndexes(): Promise<void> {
    // In-memory indices are initialized synchronously in memory structures
    return Promise.resolve();
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async clear(): Promise<void> {
    this.incidents.clear();
    this.sourceIndex.clear();
    this.publicReferenceIndex.clear();
    this.trackingHashIndex.clear();
    this.reviewActions.clear();
  }
}
