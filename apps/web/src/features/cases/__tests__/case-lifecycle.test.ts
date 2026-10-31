import { describe, it, expect, beforeEach } from "vitest";
import { CaseService } from "../services/case.service";
import { InMemoryCaseRepository } from "../repositories/memory-case.repository";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories/memory-incident.repository";
import { InMemoryNGORepository } from "@/features/ngos/repositories/memory-ngo.repository";
import { MockNotificationAdapter } from "@/features/notifications/adapters/mock.adapter";
import { canTransitionCase, assertValidCaseTransition } from "../state-machine";

describe("Phase 5: Case Lifecycle & Operational State Machine", () => {
  let caseRepo: InMemoryCaseRepository;
  let incidentRepo: InMemoryIncidentRepository;
  let ngoRepo: InMemoryNGORepository;
  let notificationAdapter: MockNotificationAdapter;
  let caseService: CaseService;

  beforeEach(async () => {
    caseRepo = new InMemoryCaseRepository();
    incidentRepo = new InMemoryIncidentRepository();
    ngoRepo = new InMemoryNGORepository();
    notificationAdapter = new MockNotificationAdapter();

    caseService = new CaseService({
      caseRepo,
      incidentRepo,
      ngoRepo,
      notificationAdapter,
    });

    // Seed an approved incident
    await incidentRepo.create({
      _id: "inc_approved_001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "cit_test_approved_001",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Injured stray canine with fractured limb on Ring Road",
      evidence: [],
      location: {
        latitude: 28.5245,
        longitude: 77.1855,
        address: "Ring Road, South Delhi",
        district: "South Delhi",
        confidence: 0.9,
      },
      severity: { level: "high", confidence: 0.85, reasoning: ["Visible limb trauma"] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
      status: "APPROVED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-APP-001",
      tracking_token_hash: "hash_test_123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      triage_analysis: {
        analysis_id: "triage_001",
        incident_id: "inc_001",
        model_id: "gemini-2.5-flash",
        prompt_version: "v1.0.0",
        category_recommendation: "injured_animal",
        subject_type: "animal",
        observable_evidence: [],
        possible_assistance: ["animal_ambulance", "veterinary_first_aid"],
        urgency: { level: "urgent", reasoning: ["Limb fracture"], requires_human_review: true },
        location_candidates: [],
        missing_information: [],
        limitations: [],
        confidence: 0.9,
        analysis_status: "SUCCESS",
        created_at: new Date().toISOString(),
        human_review_status: "CONFIRMED",
      },
    });

    // Seed unapproved incidents (REPORTED, REJECTED, DUPLICATE)
    await incidentRepo.create({
      _id: "inc_reported_002",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "cit_test_reported_002",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "homeless_person",
      subject_type: "person",
      description: "Person sleeping on bench",
      evidence: [],
      location: { latitude: 28.5, longitude: 77.2, address: null, district: "Central Delhi", confidence: 0.5 },
      severity: { level: "low", confidence: 0.5, reasoning: [] },
      freshness: "unclear",
      missing_information: [],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-REP-002",
      tracking_token_hash: "hash_test_456",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await incidentRepo.create({
      _id: "inc_rejected_003",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "cit_test_rejected_003",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "other",
      subject_type: "person",
      description: "Prank spam report",
      evidence: [],
      location: { latitude: null, longitude: null, address: null, district: null, confidence: 0.0 },
      severity: { level: "unconfirmed", confidence: 0.1, reasoning: [] },
      freshness: "unclear",
      missing_information: [],
      requires_human_review: true,
      status: "REJECTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-REJ-003",
      tracking_token_hash: "hash_test_789",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // Test 1: Approved incident creates one case
  it("creates an operational assistance case from an APPROVED incident (Test 1)", async () => {
    const result = await caseService.createCaseFromApprovedIncident(
      { incident_public_reference: "UMD-APP-001" },
      "coord_sharma"
    );

    expect(result.is_new).toBe(true);
    expect(result.case.case_id).toBeDefined();
    expect(result.case.public_case_reference).toBe("CASE-APP-001");
    expect(result.case.case_status).toBe("APPROVED");
    expect(result.case.assistance_requirements).toEqual(["animal_ambulance", "veterinary_first_aid"]);
    expect(result.case.unresolved_requirements).toEqual(["animal_ambulance", "veterinary_first_aid"]);
    expect(result.case.current_matching_cycle).toBe(1);

    const events = await caseRepo.getEvents(result.case.case_id);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("CASE_CREATED");
  });

  // Test 2: Unapproved incident cannot create a case
  it("rejects case creation for incidents in REPORTED or REJECTED status (Test 2)", async () => {
    await expect(
      caseService.createCaseFromApprovedIncident(
        { incident_public_reference: "UMD-REP-002" },
        "coord_sharma"
      )
    ).rejects.toThrow(/Cannot create assistance case from incident with status 'REPORTED'/);

    await expect(
      caseService.createCaseFromApprovedIncident(
        { incident_public_reference: "UMD-REJ-003" },
        "coord_sharma"
      )
    ).rejects.toThrow(/Cannot create assistance case from incident with status 'REJECTED'/);
  });

  // Test 3: Repeated case creation is idempotent
  it("idempotently returns the existing case without duplicate creation (Test 3)", async () => {
    const first = await caseService.createCaseFromApprovedIncident(
      { incident_public_reference: "UMD-APP-001" },
      "coord_sharma"
    );
    expect(first.is_new).toBe(true);

    const second = await caseService.createCaseFromApprovedIncident(
      { incident_public_reference: "UMD-APP-001" },
      "coord_sharma"
    );
    expect(second.is_new).toBe(false);
    expect(second.case.case_id).toBe(first.case.case_id);
    expect(second.case.public_case_reference).toBe(first.case.public_case_reference);

    const { total } = await caseRepo.findMany();
    expect(total).toBe(1);
  });

  // Test 4: Invalid lifecycle transition is rejected
  it("rejects invalid case lifecycle transitions (Test 4)", () => {
    expect(canTransitionCase("APPROVED", "MATCHING")).toBe(true);
    expect(canTransitionCase("APPROVED", "CANCELLED")).toBe(true);
    expect(canTransitionCase("APPROVED", "RESOLVED")).toBe(false); // Cannot jump directly to RESOLVED
    expect(canTransitionCase("MATCHING", "RESPONDERS_CONTACTED")).toBe(true);
    expect(canTransitionCase("MATCHING", "RESPONDER_ARRIVED")).toBe(false); // Must be accepted first

    expect(() => assertValidCaseTransition("APPROVED", "RESOLVED")).toThrow(
      /Invalid case lifecycle transition/
    );
  });

  // Test 20: Resolution requires evidence and authorised human review
  it("enforces evidence and remaining-needs assessment for case resolution (Test 20)", async () => {
    const { case: openCase } = await caseService.createCaseFromApprovedIncident(
      { incident_public_reference: "UMD-APP-001" },
      "coord_sharma"
    );

    // Attempting to resolve with unresolved needs without explicit override should fail
    await expect(
      caseService.resolveCase(
        openCase.public_case_reference,
        {
          decision: "RESOLVED",
          rationale: "Closed without addressing needs",
          override_unresolved: false,
        },
        "coord_sharma"
      )
    ).rejects.toThrow(/Cannot resolve case with unresolved assistance needs/);

    // Attempting to resolve without evidence or intervention records should fail
    await expect(
      caseService.resolveCase(
        openCase.public_case_reference,
        {
          decision: "RESOLVED",
          rationale: "Coordinator override closing case",
          override_unresolved: true,
          evidence_urls: [], // No evidence provided
        },
        "coord_sharma"
      )
    ).rejects.toThrow(/Cannot resolve case without recorded intervention evidence/);

    // Successful resolution with override and evidence documentation
    const resolved = await caseService.resolveCase(
      openCase.public_case_reference,
      {
        decision: "RESOLVED",
        rationale: "Animal was rescued by independent municipal patrol and admitted to Delhi Veterinary Hospital.",
        evidence_urls: ["https://storage.umeed.internal/evidence/admission_slip.pdf"],
        override_unresolved: true,
      },
      "coord_sharma"
    );

    expect(resolved.case_status).toBe("RESOLVED");
    expect(resolved.resolved_at).toBeDefined();
    expect(resolved.resolution_decision?.decision).toBe("RESOLVED");
    expect(resolved.resolution_decision?.resolved_by).toBe("coord_sharma");

    const events = await caseRepo.getEvents(openCase.case_id);
    const resolveEvent = events.find((e) => e.event_type === "CASE_RESOLVED");
    expect(resolveEvent).toBeDefined();
    expect(resolveEvent?.new_state).toBe("RESOLVED");
  });

  // Test 21: Reopened cases restore an active workflow
  it("reopens a resolved case when distress recurs or follow-up fails (Test 21)", async () => {
    const { case: openCase } = await caseService.createCaseFromApprovedIncident(
      { incident_public_reference: "UMD-APP-001" },
      "coord_sharma"
    );

    await caseService.resolveCase(
      openCase.public_case_reference,
      {
        decision: "RESOLVED",
        rationale: "Resolved initially with hospital proof",
        evidence_urls: ["https://storage.umeed.internal/evidence/doc.pdf"],
        override_unresolved: true,
      },
      "coord_sharma"
    );

    const reopened = await caseService.reopenCase(
      openCase.public_case_reference,
      "Citizen reported animal still in distress at location; hospital admission was incorrect.",
      "coord_sharma"
    );

    expect(reopened.case_status).toBe("REOPENED");
    expect(reopened.resolved_at).toBeNull();
    expect(reopened.resolution_decision).toBeNull();

    const events = await caseRepo.getEvents(openCase.case_id);
    const reopenEvent = events.find((e) => e.event_type === "CASE_REOPENED");
    expect(reopenEvent).toBeDefined();
  });
});
