import {
  CanonicalIncident,
  IncidentSourceType,
  IncidentSubjectType,
  IncidentType,
  IncidentFreshness,
  IncidentStatus,
  IncidentLocation,
  IncidentSeverity,
  EvidenceItem,
  IncidentTriageAnalysis,
  TriageUrgencyLevel,
} from "@umeed/contracts";

export type { IncidentTriageAnalysis, TriageUrgencyLevel };

/**
 * GeoJSON Point Representation for MongoDB 2dsphere indexing.
 * MongoDB strictly mandates coordinates in [longitude, latitude] order.
 */
export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Operational Incident Document stored in the `incidents` collection.
 */
export interface IncidentDocument {
  _id: string;
  schema_version: "1.0.0";
  source_type: IncidentSourceType;
  source_reference: string;
  source_url: string | null;
  reported_at: string;
  incident_type: IncidentType;
  subject_type: IncidentSubjectType;
  description: string;
  evidence: EvidenceItem[];
  location: IncidentLocation & {
    geo?: GeoJsonPoint | null;
  };
  severity: IncidentSeverity;
  freshness: IncidentFreshness;
  missing_information: string[];
  requires_human_review: boolean;
  status: IncidentStatus;
  is_suspected_duplicate: boolean;
  suspected_duplicate_ids: string[];
  public_reference: string;
  tracking_token_hash: string | null;
  triage_analysis?: IncidentTriageAnalysis | null;
  created_at: string;
  updated_at: string;
}

/**
 * Operational Case Document stored in the `cases` collection.
 * Invariant: An incident NEVER automatically creates a case during ingestion.
 */
export interface CaseDocument {
  _id: string;
  incident_id: string;
  status: "ACTIVE" | "PENDING_ASSIGNMENT" | "RESOLVED" | "CLOSED";
  assigned_organisations: string[];
  assistance_requirements: string[];
  unresolved_requirements: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Operational Evidence Metadata Document stored in the `evidence` collection.
 */
export interface EvidenceDocument {
  evidence_id: string;
  incident_id: string;
  evidence_type: string;
  storage_reference: string;
  source_reference: string;
  captured_at?: string;
  submitted_at: string;
  extracted_by?: string;
  extraction_confidence?: number;
  provenance: Record<string, unknown>;
  created_at: string;
}

export type ReviewDecision =
  | "APPROVE"
  | "REJECT"
  | "MARK_DUPLICATE"
  | "REQUEST_INFO"
  | "CONFIRM"
  | "OVERRIDE"
  | "ESCALATE";

/**
 * Operational Review Action Document stored in the `review_actions` collection.
 */
export interface ReviewActionDocument {
  _id: string;
  incident_id: string;
  reviewer_id: string;
  decision: ReviewDecision;
  reason: string;
  timestamp: string;
  evidence_references?: string[];
  override_category?: IncidentType;
  override_urgency?: TriageUrgencyLevel;
}

/**
 * Suspected Duplicate Candidate descriptor.
 */
export interface DuplicateCandidate {
  incident_id: string;
  public_reference: string;
  incident_type: IncidentType;
  subject_type: IncidentSubjectType;
  distance_meters?: number;
  reported_at: string;
  reason: string;
}

/**
 * Result returned from the Ingestion Service.
 */
export interface IngestionResult {
  incident: IncidentDocument;
  public_reference: string;
  tracking_token?: string; // Plaintext token returned ONLY ONCE at creation
  is_duplicate: boolean; // True if this was an idempotent replay of existing submission
  is_suspected_duplicate: boolean;
  duplicate_candidates: DuplicateCandidate[];
  requires_human_review: boolean;
}

/**
 * Query filter options for incident listing.
 */
export interface IncidentFilterOptions {
  status?: IncidentStatus;
  incident_type?: IncidentType;
  source_type?: IncidentSourceType;
  district?: string;
  is_suspected_duplicate?: boolean;
  requires_human_review?: boolean;
  limit?: number;
  offset?: number;
}
