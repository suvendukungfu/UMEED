/**
 * Meko Coordination Memory Agent Definitions (Phase 6 Foundation)
 */
export interface CoordinatorPreferenceMemory {
  memory_id: string;
  coordinator_id: string;
  category: "district_policy" | "triage_priority" | "responder_instruction";
  preference_text: string;
  provenance: {
    source_case_id?: string;
    approved_by: string;
    approved_at: string;
  };
}

