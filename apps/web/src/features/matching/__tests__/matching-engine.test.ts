import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryNGORepository } from "@/features/ngos/repositories/memory-ngo.repository";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories/memory-incident.repository";
import { ExplainableMatchingService } from "../services/matching.service";
import { IncidentDocument } from "@/features/incidents/types";
import { NGODocument } from "@/features/ngos/types";
import { SYNTHETIC_DELHI_NGOS, seedDemoNGOs } from "@/features/ngos/services/seed.service";

describe("Phase 4: Explainable NGO Matching Engine", () => {
  let ngoRepo: InMemoryNGORepository;
  let incidentRepo: InMemoryIncidentRepository;
  let matchingService: ExplainableMatchingService;

  const sampleApprovedIncident: IncidentDocument = {
    _id: "inc_001_dog_trauma",
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: "cit_ref_001",
    source_url: null,
    reported_at: new Date().toISOString(),
    incident_type: "injured_animal",
    subject_type: "animal",
    description: "Injured stray canine with right hind leg fracture near Netaji Subhash Place",
    evidence: [],
    location: {
      latitude: 28.6970,
      longitude: 77.1355, // Very close to Jan Seva Animal Ambulance (28.6972, 77.1350)
      address: "Near NSP Metro Gate 2, Pitampura",
      district: "North West Delhi",
      confidence: 0.95,
      geo: {
        type: "Point",
        coordinates: [77.1355, 28.6970],
      },
    },
    severity: {
      level: "critical",
      confidence: 0.9,
      reasoning: ["Active bleeding and fracture"],
    },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: true,
    status: "APPROVED",
    is_suspected_duplicate: false,
    suspected_duplicate_ids: [],
    public_reference: "UMD-DOG-0001",
    tracking_token_hash: "hash_001",
    triage_analysis: {
      analysis_id: "triage_001",
      incident_id: "inc_001_dog_trauma",
      model_id: "gemini-2.5-flash",
      prompt_version: "v1.0.0",
      category_recommendation: "injured_animal",
      subject_type: "animal",
      observable_evidence: [
        {
          observation: "Canine with visible fracture on right hind leg",
          evidence_reference: "photo_0",
          confidence: 0.92,
        },
      ],
      possible_assistance: ["animal_first_aid", "field_ambulance"],
      urgency: {
        level: "urgent",
        reasoning: ["Severe limb trauma requiring urgent transport."],
        requires_human_review: true,
      },
      location_candidates: ["Netaji Subhash Place"],
      missing_information: [],
      limitations: ["Non-veterinary assessment"],
      confidence: 0.92,
      analysis_status: "SUCCESS",
      created_at: new Date().toISOString(),
      human_review_status: "CONFIRMED",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    ngoRepo = new InMemoryNGORepository();
    incidentRepo = new InMemoryIncidentRepository();
    await ngoRepo.initIndexes();
    await incidentRepo.initIndexes();
    await seedDemoNGOs(ngoRepo);
    await incidentRepo.create(sampleApprovedIncident);
    matchingService = new ExplainableMatchingService(ngoRepo, incidentRepo);
  });

  describe("4. Service Capability Hard Matching Filter", () => {
    it("disqualifies organisations that do not handle the required incident category", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);

      // Animal incident should disqualify elderly care and food relief organisations
      const ashaElderly = result.candidates.find((c) => c.ngo_id === "DEMO-NGO-003");
      expect(ashaElderly).toBeDefined();
      expect(ashaElderly?.eligible).toBe(false);
      expect(ashaElderly?.total_score).toBe(0.0);
      expect(ashaElderly?.ineligibility_reason).toContain("Capability mismatch");

      const foodRelief = result.candidates.find((c) => c.ngo_id === "DEMO-NGO-004");
      expect(foodRelief).toBeDefined();
      expect(foodRelief?.eligible).toBe(false);
      expect(foodRelief?.total_score).toBe(0.0);
    });

    it("ranks the capable animal ambulance organisation as top recommendation", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);

      expect(result.eligible_candidates_count).toBeGreaterThanOrEqual(1);
      const top = result.candidates[0];
      expect(top.eligible).toBe(true);
      expect(top.ngo_id).toBe("DEMO-NGO-001"); // Jan Seva Animal Emergency Ambulance
      expect(top.total_score).toBeGreaterThan(0.85); // High score due to capability, district, proximity, availability
      expect(top.matched_capabilities).toContain("animal_first_aid");
    });
  });

  describe("5. District Coverage & Geodesic Distance Scoring", () => {
    it("calculates accurate distance within service radius and rewards direct district coverage", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      const top = result.candidates.find((c) => c.ngo_id === "DEMO-NGO-001")!;

      expect(top.distance_km).toBeLessThan(1.0); // NSP is < 1km from Pitampura HQ
      expect(top.component_scores.distance_score).toBeGreaterThan(0.9);
      expect(top.component_scores.coverage_score).toBe(1.0); // Direct district match in North West Delhi
    });

    it("penalizes distance for organisations located further away but still eligible", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      const eastAnimalAid = result.candidates.find((c) => c.ngo_id === "DEMO-NGO-006")!;

      expect(eastAnimalAid.eligible).toBe(true);
      // East Delhi (Vikas Marg) is > 10km away from Pitampura
      expect(eastAnimalAid.distance_km).toBeGreaterThan(10);
      expect(eastAnimalAid.component_scores.distance_score).toBeLessThan(
        result.candidates[0].component_scores.distance_score
      );
    });
  });

  describe("7. Unknown Incident Location Fallback Handling", () => {
    it("handles missing incident GPS gracefully using district coverage without distance penalty", async () => {
      // Create incident with no coordinates but known district
      const noGpsIncident: IncidentDocument = {
        ...sampleApprovedIncident,
        _id: "inc_002_no_gps",
        source_reference: "cit_ref_no_gps_002",
        public_reference: "UMD-NOGPS-0001",
        location: {
          latitude: null,
          longitude: null,
          address: "Somewhere in North West Delhi",
          district: "North West Delhi",
          confidence: 0.2, // Low confidence
        },
      };
      await incidentRepo.create(noGpsIncident);

      const result = await matchingService.matchIncident(noGpsIncident.public_reference);
      const top = result.candidates[0];

      expect(top.eligible).toBe(true);
      expect(top.distance_km).toBeNull();
      // Should flag missing information warning without crashing
      expect(top.missing_information).toContain(
        "Reliable incident GPS coordinates unavailable; matching based on district coverage without distance penalty"
      );
      expect(top.total_score).toBeGreaterThan(0.6); // Still scores well on capability and district
    });
  });

  describe("8. Unknown Availability & Capacity Handling", () => {
    it("assigns conservative baseline score (0.3) for UNKNOWN availability and flags warning", async () => {
      // Add custom NGO with UNKNOWN availability
      const unkAvailNgo: NGODocument = {
        ...SYNTHETIC_DELHI_NGOS[0],
        _id: "ngo_unk_avail",
        ngo_id: "NGO-UNK-AVAIL",
        organisation_name: "Mystery Animal Shelter",
        registration_number: "DL/2024/9911",
        availability_status: "UNKNOWN",
        capacity_status: "UNKNOWN",
      };
      await ngoRepo.create(unkAvailNgo);

      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      const cand = result.candidates.find((c) => c.ngo_id === "NGO-UNK-AVAIL")!;

      expect(cand).toBeDefined();
      expect(cand.component_scores.availability_score).toBe(0.3);
      expect(cand.missing_information).toContain("Current live availability status is UNKNOWN");
    });
  });

  describe("9. Unverified & Suspended Organisation Safeguards", () => {
    it("disqualifies suspended organisations completely regardless of capabilities", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      const suspendedNgo = result.candidates.find((c) => c.ngo_id === "DEMO-NGO-008");

      expect(suspendedNgo).toBeDefined();
      expect(suspendedNgo?.eligible).toBe(false);
      expect(suspendedNgo?.ineligibility_reason).toContain("regulatory suspension");
    });

    it("surfaces unverified status and DEMO_ONLY tag clearly in results", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      for (const cand of result.candidates) {
        expect(cand.verification_status).toBeDefined();
        expect(typeof cand.is_demo).toBe("boolean");
      }
    });
  });

  describe("10. Response History Sample-Size Safeguard", () => {
    it("excludes history from score calculation when sample size is under 5", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      const cand = result.candidates.find((c) => c.ngo_id === "DEMO-NGO-006")!; // sample_size is 4

      expect(cand.component_scores.history_score).toBeNull();
      expect(cand.missing_information).toContain(
        "Insufficient response history sample (< 5 cases); excluded from score calculation to avoid small-sample bias"
      );
    });

    it("computes history score when sample size is 5 or greater", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      const cand = result.candidates.find((c) => c.ngo_id === "DEMO-NGO-001")!; // sample_size is 38

      expect(cand.component_scores.history_score).toBeGreaterThan(0.5);
    });
  });

  describe("11. Match Ranking Explanations & Transparency", () => {
    it("provides human-readable explanations and full component score breakdowns", async () => {
      const result = await matchingService.matchIncident(sampleApprovedIncident.public_reference);
      const top = result.candidates[0];

      expect(top.explanation).toContain("match");
      expect(top.explanation).toContain("Verified for");
      expect(result.explanation_summary).toContain("Top recommendation");
      expect(result.explanation_summary).toBeDefined();
    });
  });
});
