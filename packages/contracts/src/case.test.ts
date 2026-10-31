import { describe, it, expect } from "vitest";
import {
  CaseSchema,
  CaseStatusSchema,
  AssignmentStatusSchema,
  InterventionRecordSchema,
  CreateCaseInputSchema,
  CaseResolutionInputSchema,
} from "./case";

describe("Case & Coordination Canonical Contracts (Phase 5)", () => {
  const validCasePayload = {
    case_id: "case_01j8m0k",
    incident_id: "inc_01j8m0a",
    incident_reference: "UMD-7B29-4K12",
    public_case_reference: "CASE-7B29-4K12",
    case_status: "APPROVED" as const,
    assistance_requirements: ["veterinary_first_aid", "animal_ambulance"],
    unresolved_requirements: ["veterinary_first_aid", "animal_ambulance"],
    assignments: [],
    interventions: [],
    current_matching_cycle: 1,
    max_matching_cycles: 3,
    created_by: "coord_delhi_01",
    approved_at: "2026-10-31T14:00:00.000Z",
    created_at: "2026-10-31T14:00:00.000Z",
    updated_at: "2026-10-31T14:00:00.000Z",
    resolved_at: null,
    resolution_evidence: [],
    resolution_decision: null,
  };

  it("validates a compliant case record", () => {
    const parsed = CaseSchema.parse(validCasePayload);
    expect(parsed.case_id).toBe("case_01j8m0k");
    expect(parsed.public_case_reference).toBe("CASE-7B29-4K12");
    expect(parsed.case_status).toBe("APPROVED");
    expect(parsed.current_matching_cycle).toBe(1);
  });

  it("enforces valid case lifecycle statuses", () => {
    expect(() => CaseStatusSchema.parse("APPROVED")).not.toThrow();
    expect(() => CaseStatusSchema.parse("MATCHING")).not.toThrow();
    expect(() => CaseStatusSchema.parse("FOLLOW_UP_REQUIRED")).not.toThrow();
    expect(() => CaseStatusSchema.parse("RESOLVED")).not.toThrow();
    expect(() => CaseStatusSchema.parse("INVALID_STATUS")).toThrow();
  });

  it("enforces all 15 discrete assignment statuses", () => {
    const statuses = [
      "PROPOSED",
      "CONTACT_READY",
      "CONTACT_QUEUED",
      "CONTACTED",
      "ACKNOWLEDGED",
      "ACCEPTED",
      "REJECTED",
      "REQUESTED_INFORMATION",
      "EN_ROUTE",
      "ARRIVED",
      "INTERVENTION_RECORDED",
      "COMPLETED",
      "CANCELLED",
      "EXPIRED",
      "CONTACT_FAILED",
    ];
    for (const status of statuses) {
      expect(() => AssignmentStatusSchema.parse(status)).not.toThrow();
    }
    expect(() => AssignmentStatusSchema.parse("UNKNOWN_STATUS")).toThrow();
  });

  it("validates an intervention record with evidence and additional needs", () => {
    const intervention = {
      intervention_id: "int_01",
      case_id: "case_01j8m0k",
      assignment_id: "asg_01",
      organisation_id: "ngo_del_001",
      intervention_type: "veterinary_assessment" as const,
      description: "Administered emergency analgesia and splinted right rear fracture.",
      assistance_provided: ["splint_application", "pain_management"],
      evidence_references: [
        {
          type: "image" as const,
          url: "https://storage.umeed.internal/evidence/fracture_splint.jpg",
          notes: "Post-splinting photo showing stabilization",
        },
      ],
      additional_needs: ["orthopedic_surgical_intervention", "inpatient_quarantine"],
      performed_at: "2026-10-31T14:30:00.000Z",
      submitted_by: "Dr. Sharma, Head Vet",
      verification_status: "SUBMITTED" as const,
    };

    const parsed = InterventionRecordSchema.parse(intervention);
    expect(parsed.intervention_type).toBe("veterinary_assessment");
    expect(parsed.additional_needs).toHaveLength(2);
    expect(parsed.evidence_references).toHaveLength(1);
  });

  it("validates case creation input", () => {
    const input = {
      incident_public_reference: "UMD-7B29-4K12",
      assistance_requirements: ["animal_ambulance"],
      max_matching_cycles: 4,
    };
    const parsed = CreateCaseInputSchema.parse(input);
    expect(parsed.incident_public_reference).toBe("UMD-7B29-4K12");
    expect(parsed.max_matching_cycles).toBe(4);
  });

  it("validates case resolution input with minimum rationale requirements", () => {
    const input = {
      decision: "RESOLVED" as const,
      rationale: "Animal successfully admitted to inpatient hospital, trauma stabilized.",
      evidence_urls: ["https://storage.umeed.internal/evidence/admission_slip.pdf"],
    };
    const parsed = CaseResolutionInputSchema.parse(input);
    expect(parsed.decision).toBe("RESOLVED");
    expect(parsed.override_unresolved).toBe(false);

    expect(() =>
      CaseResolutionInputSchema.parse({
        decision: "RESOLVED",
        rationale: "No", // Less than 5 chars
      })
    ).toThrow();
  });
});
