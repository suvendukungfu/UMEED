import { describe, it, expect, beforeEach } from "vitest";
import {
  GeminiTriageOutputSchema,
  GeminiTriageOutput,
} from "../../../lib/ai/gemini/schemas";
import { GeminiTriageService } from "../../../lib/ai/gemini/triage.service";
import { runTriageEvaluation } from "../../../lib/ai/gemini/evaluation";
import { InMemoryIncidentRepository } from "../repositories/memory-incident.repository";
import { IncidentService } from "../services/incident.service";
import { IncidentDocument } from "../types";
import { CanonicalIncident } from "@umeed/contracts";

describe("Phase 3: Gemini Multimodal Incident Triage Engine", () => {
  let repo: InMemoryIncidentRepository;
  let service: IncidentService;

  const sampleCitizenPayload: CanonicalIncident = {
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: "cit_gemini_test_001",
    source_url: null,
    reported_at: new Date().toISOString(),
    incident_type: "homeless_person",
    subject_type: "person",
    description:
      "Elderly gentleman shivering on the footpath near Lajpat Nagar metro station gate 2. Has torn blanket.",
    evidence: [
      {
        type: "image",
        url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        timestamp: new Date().toISOString(),
      },
    ],
    location: {
      latitude: 28.5708,
      longitude: 77.2373,
      address: "Near Gate 2, Lajpat Nagar Metro Station, New Delhi",
      district: "South Delhi",
      confidence: 0.95,
    },
    severity: {
      level: "high",
      confidence: 0.8,
      reasoning: ["Elderly subject exposed to cold weather without adequate shelter."],
    },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: true,
  };

  beforeEach(async () => {
    repo = new InMemoryIncidentRepository();
    await repo.initIndexes();
    service = new IncidentService(repo);
  });

  describe("Structured Schema Validation (GeminiTriageOutputSchema)", () => {
    it("validates compliant structured triage output from Gemini", () => {
      const validOutput: GeminiTriageOutput = {
        incident_category: "homeless_person",
        subject_type: "person",
        observable_evidence: [
          {
            observation: "Elderly person sitting on concrete pavement wrapped in worn blanket",
            evidence_reference: "photo_0",
            confidence: 0.92,
          },
        ],
        possible_assistance: ["night_shelter_placement", "winter_clothing_kit"],
        urgency_recommendation: {
          level: "elevated",
          reasoning: [
            "Severe weather exposure vulnerability for elderly individual.",
            "Immediate shelter outreach recommended before temperature drops.",
          ],
          requires_human_review: true,
        },
        location_candidates: ["Lajpat Nagar Metro Station Gate 2"],
        missing_information: ["Immediate contact number of reporting citizen"],
        limitations: [
          "No medical diagnosis performed.",
          "Visual analysis based solely on single low-resolution photo.",
        ],
      };

      const result = GeminiTriageOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it("rejects non-compliant output with invalid urgency or prohibited fields", () => {
      const invalidOutput = {
        incident_category: "invalid_category_name",
        subject_type: "person",
        observable_evidence: [],
        possible_assistance: [],
        urgency_recommendation: {
          level: "super_critical_rush_now", // Invalid enum
          reasoning: [],
        },
        location_candidates: [],
        missing_information: [],
        limitations: [],
      };

      const result = GeminiTriageOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it("clamps or validates confidence bounds strictly between 0.0 and 1.0", () => {
      const outOfBoundsOutput = {
        incident_category: "injured_animal",
        subject_type: "animal",
        observable_evidence: [
          {
            observation: "Dog lying down",
            evidence_reference: "photo_0",
            confidence: 1.5, // Exceeds 1.0
          },
        ],
        possible_assistance: [],
        urgency_recommendation: {
          level: "routine",
          reasoning: ["Appears calm."],
        },
        location_candidates: [],
        missing_information: [],
        limitations: [],
      };

      const result = GeminiTriageOutputSchema.safeParse(outOfBoundsOutput);
      expect(result.success).toBe(false);
    });
  });

  describe("Fail-Soft Fallback Architecture", () => {
    it("generates MANUAL_REVIEW_REQUIRED fallback when GEMINI_API_KEY is not configured", async () => {
      const triageService = new GeminiTriageService();
      const ingestion = await service.ingestIncident(sampleCitizenPayload);
      const incident = ingestion.incident;

      // Executing triage without API key should succeed gracefully without throwing
      const analysis = await triageService.triageIncident(incident, { apiKey: "" });

      expect(analysis).toBeDefined();
      expect(analysis.analysis_status).toBe("MANUAL_REVIEW_REQUIRED");
      expect(analysis.urgency.requires_human_review).toBe(true);
      expect(analysis.limitations.length).toBeGreaterThan(0);
      expect(analysis.human_review_status).toBe("PENDING");
      expect(analysis.category_recommendation).toBe(incident.incident_type);
    });

    it("preserves original citizen report intact when AI triage encounters an error", async () => {
      // Mock a failing Gemini client
      const mockFailingClient = {
        models: {
          generateContent: async () => {
            throw new Error("Quota exceeded / 429 Too Many Requests");
          },
        },
      } as unknown as import("@google/genai").GoogleGenAI;

      const triageService = new GeminiTriageService(mockFailingClient);
      const ingestion = await service.ingestIncident(sampleCitizenPayload);

      const analysis = await triageService.triageIncident(ingestion.incident, {
        apiKey: "fake-key",
      });

      expect(analysis.analysis_status).toBe("MANUAL_REVIEW_REQUIRED");
      expect(analysis.raw_response_summary).toContain("QUOTA_EXCEEDED");
      // Original description is untouched
      expect(ingestion.incident.description).toContain("Lajpat Nagar");
    });
  });

  describe("End-to-End Incident Service AI Triage Integration", () => {
    it("runs triage and updates incident document in repository", async () => {
      const ingestion = await service.ingestIncident(sampleCitizenPayload);
      expect(ingestion.incident.triage_analysis).toBeUndefined();

      // Trigger triage via service
      const analysis = await service.triageIncident(ingestion.public_reference, {
        apiKey: "", // triggers safe fallback
      });

      expect(analysis).toBeDefined();
      expect(analysis.incident_id).toBe(ingestion.incident._id);

      // Verify repository was updated with triage analysis
      const updated = await service.getByPublicReference(ingestion.public_reference);
      expect(updated?.triage_analysis).toBeDefined();
      expect(updated?.triage_analysis?.analysis_status).toBe("MANUAL_REVIEW_REQUIRED");
    });
  });

  describe("Human Coordinator Review & Authority Enforcement", () => {
    it("records coordinator CONFIRM review decision and updates incident to APPROVED", async () => {
      const ingestion = await service.ingestIncident(sampleCitizenPayload);
      await service.triageIncident(ingestion.public_reference, { apiKey: "" });

      const reviewedDoc = await service.recordReviewDecision(
        ingestion.public_reference,
        "coord_john_doe",
        {
          decision: "CONFIRM",
          reason: "Verified report with field volunteer; elderly citizen confirmed at location.",
        }
      );

      expect(reviewedDoc.status).toBe("APPROVED");
      expect(reviewedDoc.triage_analysis?.human_review_status).toBe("CONFIRMED");
      expect(reviewedDoc.triage_analysis?.human_reviewer_id).toBe("coord_john_doe");
      expect(reviewedDoc.triage_analysis?.human_reviewer_notes).toContain("Verified report");
    });

    it("records coordinator OVERRIDE decision and updates category", async () => {
      const ingestion = await service.ingestIncident(sampleCitizenPayload);
      await service.triageIncident(ingestion.public_reference, { apiKey: "" });

      const reviewedDoc = await service.recordReviewDecision(
        ingestion.public_reference,
        "coord_senior",
        {
          decision: "OVERRIDE",
          reason: "Subject also exhibits severe untreated hypothermia; requires emergency medical assistance.",
          override_category: "medical_assistance",
          override_urgency: "urgent",
        }
      );

      expect(reviewedDoc.status).toBe("APPROVED");
      expect(reviewedDoc.incident_type).toBe("medical_assistance");
      expect(reviewedDoc.triage_analysis?.human_review_status).toBe("OVERRIDDEN");
    });

    it("records coordinator REJECT decision and updates incident to REJECTED", async () => {
      const ingestion = await service.ingestIncident(sampleCitizenPayload);

      const reviewedDoc = await service.recordReviewDecision(
        ingestion.public_reference,
        "coord_audit",
        {
          decision: "REJECT",
          reason: "Spam advertisement disguised as distress report.",
        }
      );

      expect(reviewedDoc.status).toBe("REJECTED");
    });

    it("records coordinator ESCALATE decision and updates incident to UNDER_REVIEW", async () => {
      const ingestion = await service.ingestIncident(sampleCitizenPayload);

      const reviewedDoc = await service.recordReviewDecision(
        ingestion.public_reference,
        "coord_crisis",
        {
          decision: "ESCALATE",
          reason: "Extreme distress reported; escalates for multi-agency emergency rescue team.",
        }
      );

      expect(reviewedDoc.status).toBe("UNDER_REVIEW");
    });
  });

  describe("AI Evaluation Suite & Benchmark Runner", () => {
    it("evaluates 9 synthetic benchmark scenarios with 100% schema validity and zero unhandled errors", async () => {
      const triageService = new GeminiTriageService();
      // Runs against the 9 synthetic scenarios in fallback/mock mode
      const evalReport = await runTriageEvaluation(triageService);

      expect(evalReport).toBeDefined();
      expect(evalReport.total_scenarios).toBe(9);
      expect(evalReport.schema_valid_rate).toBe(1.0); // 100% compliant schemas
      expect(evalReport.failure_handling_rate).toBe(1.0); // 100% graceful failure handling
      expect(evalReport.false_emergency_escalation_rate).toBe(0.0);
      expect(evalReport.scenario_results.length).toBe(9);
    });
  });
});
