import { IncidentDocument } from "@/features/incidents/types";

/**
 * Synthetic Animal Rescue Scenario Fixtures for the A1 Controlled Experiment.
 * Both Control (OFF) and Treatment (ON) share 100% identical starting conditions and facts.
 */

export const A1_APPROVED_LESSON = {
  memory_id: "mem_lesson_vet_trauma_001",
  datapack_name: "umeed-product-context",
  category: "injured_animal",
  memory:
    "Approved lesson: When coordinating street animal rescue with serious trauma, separate physical capture/transport from secondary veterinary trauma surgery and hospital admission to avoid post-rescue surgical delays.",
  relevance_score: 0.94,
};

export function createA1SyntheticIncident(variant: "CONTROL_OFF" | "TREATMENT_ON"): IncidentDocument {
  const publicRef = variant === "CONTROL_OFF" ? "UMD-A1-OFF" : "UMD-A1-ON";
  const now = "2026-10-31T20:00:00.000Z";

  return {
    _id: `inc_a1_${variant.toLowerCase()}`,
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: `a1_exp_${variant.toLowerCase()}`,
    source_url: null,
    reported_at: now,
    incident_type: "injured_animal",
    subject_type: "animal",
    description:
      "Large stray dog hit by a two-wheeler. Deep laceration and compound leg fracture. Animal is immobile, bleeding, and in severe distress on the side of the road.",
    evidence: [],
    location: {
      address: "Near Pitampura Metro Station, Outer Ring Road, Delhi",
      district: "North West Delhi",
      latitude: 28.698,
      longitude: 77.138,
      confidence: 0.95,
      geo: {
        type: "Point",
        coordinates: [77.138, 28.698],
      },
    },
    severity: {
      level: "critical",
      confidence: 0.95,
      reasoning: ["Severe bleeding", "Compound limb fracture"],
    },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: false,
    status: "APPROVED",
    is_suspected_duplicate: false,
    suspected_duplicate_ids: [],
    public_reference: publicRef,
    tracking_token_hash: `hash_a1_synthetic_${variant.toLowerCase()}`,
    triage_analysis: {
      analysis_id: `3f7394c8-356b-4e11-807d-9486c2aa260a`,
      incident_id: `inc_a1_${variant.toLowerCase()}`,
      model_id: "gemini-2.0-flash",
      prompt_version: "v1.2",
      category_recommendation: "injured_animal",
      subject_type: "animal",
      observable_evidence: [
        {
          observation: "Severe canine vehicular trauma requiring immediate field transit and fracture stabilization.",
          evidence_reference: "citizen_text_description",
          confidence: 0.95,
        },
      ],
      possible_assistance: ["field_ambulance", "fracture_stabilization"],
      urgency: {
        level: "urgent",
        reasoning: ["Compound fracture, active blood loss"],
        requires_human_review: true,
      },
      location_candidates: ["Pitampura Outer Ring Road"],
      missing_information: [],
      limitations: [],
      confidence: 0.95,
      analysis_status: "SUCCESS",
      created_at: now,
    },
    created_at: now,
    updated_at: now,
  };
}
