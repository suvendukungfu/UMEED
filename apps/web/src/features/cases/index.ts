/**
 * Case Lifecycle State Machine Definitions (Phase 5 Foundation)
 */
export type CaseStatus =
  | "REPORTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "MATCHING"
  | "RESPONDERS_CONTACTED"
  | "ACCEPTED"
  | "RESPONDER_ARRIVED"
  | "INTERVENTION_PROVIDED"
  | "FOLLOW_UP_REQUIRED"
  | "RESOLVED"
  | "REJECTED"
  | "DUPLICATE"
  | "UNVERIFIED"
  | "REOPENED";

export interface CaseRecord {
  case_id: string;
  incident_id: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

