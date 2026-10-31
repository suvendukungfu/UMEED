import {
  IncidentSourceType,
  IncidentSubjectType,
} from "@umeed/contracts";
import {
  IncidentDocument,
  IncidentFilterOptions,
} from "../types";

/**
 * Interface for the Incident Data Repository.
 * Supports dual implementations:
 * - MongoIncidentRepository: Production MongoDB Atlas with compound indexes & 2dsphere
 * - InMemoryIncidentRepository: Deterministic in-memory simulation for unit/contract tests
 */
export interface IIncidentRepository {
  /**
   * Persist a new incident document atomically.
   * Throws an error (e.g. duplicate key) if an incident with the same
   * { source_type, source_reference } or public_reference already exists.
   */
  create(incident: IncidentDocument): Promise<IncidentDocument>;

  /**
   * Find an existing incident by unique source type and source reference (for idempotency checks).
   */
  findBySource(
    sourceType: IncidentSourceType,
    sourceReference: string
  ): Promise<IncidentDocument | null>;

  /**
   * Find an existing incident by its unique human-readable public reference.
   */
  findByPublicReference(publicReference: string): Promise<IncidentDocument | null>;

  /**
   * Find an existing incident by the SHA-256 hash of its tracking token.
   */
  findByTrackingHash(tokenHash: string): Promise<IncidentDocument | null>;

  /**
   * Find candidate incidents within a geographical distance and temporal window.
   */
  findNearbyCandidates(
    location: { longitude: number; latitude: number },
    maxDistanceMeters: number,
    maxAgeHours: number,
    subjectType?: IncidentSubjectType
  ): Promise<IncidentDocument[]>;

  /**
   * Query incidents with filtering, sorting, and pagination.
   */
  list(filter?: IncidentFilterOptions): Promise<{ incidents: IncidentDocument[]; total: number }>;

  /**
   * Update an incident by its ID or public reference.
   */
  update(idOrRef: string, updates: Partial<IncidentDocument>): Promise<IncidentDocument | null>;

  /**
   * Record a human review decision and audit trail.
   */
  recordReviewAction(action: import("../types").ReviewActionDocument): Promise<import("../types").ReviewActionDocument>;

  /**
   * Initialize required database indexes idempotently.
   */
  initIndexes(): Promise<void>;

  /**
   * Check whether the underlying repository storage is healthy and ready.
   */
  isHealthy(): Promise<boolean>;

  /**
   * Clear repository state (for test isolation).
   */
  clear(): Promise<void>;
}
