import { createA1SyntheticIncident, A1_APPROVED_LESSON } from "@/features/context-learning/experiments/synthetic-cases";
import { SYNTHETIC_DELHI_NGOS } from "@/features/ngos/services/seed.service";

/**
 * Isolated HackCBS 9.0 Demonstration Dataset.
 * All records are explicitly tagged as DEMO_ONLY / synthetic.
 */

export const DEMO_INCIDENT_CONTROL = createA1SyntheticIncident("CONTROL_OFF");
export const DEMO_INCIDENT_TREATMENT = createA1SyntheticIncident("TREATMENT_ON");

export const DEMO_MEKO_MEMORY_LESSON = {
  ...A1_APPROVED_LESSON,
  source: "DEMO_FIXTURE_VERIFIED",
  datapack: "umeed-product-context",
  created_at: "2026-10-31T20:00:00.000Z",
};

export const DEMO_ORGANISATIONS = SYNTHETIC_DELHI_NGOS.filter((ngo) =>
  ["DEMO-NGO-001", "DEMO-NGO-002", "DEMO-NGO-003"].includes(ngo.ngo_id)
);

export const DEMO_STORYLINE = {
  title: "Emergency Canine Trauma Rescue & Veterinary Coordination",
  scenario:
    "A citizen reports an injured stray dog hit by a two-wheeler in North West Delhi with a compound fracture.",
  coreProblem:
    "Standard matching only solves physical transport. Meko contextual memory recalls prior lessons proving that trauma rescue must pair field transport with inpatient veterinary surgery.",
};
