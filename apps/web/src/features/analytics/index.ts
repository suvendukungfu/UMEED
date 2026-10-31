/**
 * Historical Impact Analytics Event Model (Phase 7 Foundation)
 */
export interface AnalyticsEvent {
  event_id: string;
  event_name:
    | "incident_created"
    | "ai_triage_completed"
    | "human_review_completed"
    | "ngo_match_created"
    | "ngo_accepted"
    | "responder_arrived"
    | "intervention_recorded"
    | "follow_up_required"
    | "case_resolved";
  timestamp: string;
  payload: Record<string, unknown>;
}

