import { describe, it, expect, beforeEach } from "vitest";
import { CaseService } from "../services/case.service";
import { ResponderService } from "../services/responder.service";
import { RecursiveAssistanceEngine } from "../services/recursive-engine.service";
import { InMemoryCaseRepository } from "../repositories/memory-case.repository";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories/memory-incident.repository";
import { InMemoryNGORepository } from "@/features/ngos/repositories/memory-ngo.repository";
import { MockNotificationAdapter } from "@/features/notifications/adapters/mock.adapter";

describe("Phase 5: Recursive Assistance Engine & Follow-Up Cycles", () => {
  let caseRepo: InMemoryCaseRepository;
  let incidentRepo: InMemoryIncidentRepository;
  let ngoRepo: InMemoryNGORepository;
  let notificationAdapter: MockNotificationAdapter;
  let caseService: CaseService;
  let responderService: ResponderService;
  let recursiveEngine: RecursiveAssistanceEngine;
  let testCaseRef: string;

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

    responderService = new ResponderService({
      caseRepo,
      incidentRepo,
    });

    recursiveEngine = new RecursiveAssistanceEngine({
      caseRepo,
      incidentRepo,
      ngoRepo,
    });

    // Seed approved incident
    await incidentRepo.create({
      _id: "inc_recursive_001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "cit_recursive_001",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Severe canine fracture requiring field ambulance and subsequent orthopedic surgery",
      evidence: [],
      location: {
        latitude: 28.5245,
        longitude: 77.1855,
        address: "Ring Road, South Delhi",
        district: "South Delhi",
        confidence: 0.9,
      },
      severity: { level: "high", confidence: 0.9, reasoning: [] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
      status: "APPROVED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-REC-001",
      tracking_token_hash: "hash_secret_token_123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed NGO 1: Ambulance only
    await ngoRepo.create({
      _id: "ngo_del_001",
      ngo_id: "ngo_del_001",
      organisation_name: "Delhi Animal Welfare Society Trust Regd",
      alternate_names: [],
      registration_number: "DL/2018/0184920",
      registration_authority: "Registrar of Societies, Delhi",
      registration_date: "2018-04-12",
      organisation_type: "TRUST",
      service_categories: ["injured_animal"],
      supported_subject_types: ["animal"],
      assistance_capabilities: ["animal_ambulance", "field_first_aid"],
      specialised_services: [],
      operational_states: ["Delhi"],
      operational_districts: ["South Delhi"],
      service_areas: [],
      headquarters_location: {
        address: "R.K. Puram",
        district: "South Delhi",
        state: "Delhi",
        latitude: 28.56,
        longitude: 77.18,
        geo: { type: "Point", coordinates: [77.18, 28.56] },
      },
      service_radius_km: 20,
      verification_status: "OPERATIONALLY_VERIFIED",
      registration_status: "REGISTERED",
      availability_status: "AVAILABLE",
      operating_hours: "24/7",
      capacity_status: "HIGH",
      accepting_assignments: true,
      service_constraints: [],
      active_cases: 0,
      max_concurrent_cases: 5,
      last_verified_at: null,
      verification_source: null,
      verification_evidence: [],
      assignment_history: {
        total_assignments: 0,
        accepted_assignments: 0,
        completed_interventions: 0,
        rejected_assignments: 0,
        average_response_minutes: null,
        sample_size: 0,
      },
      contact: { phone: null, email: null, emergency_phone: null, coordinator_name: null, is_phone_verified: false },
      source_type: "synthetic_fixture",
      source_reference: "test_seed",
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed NGO 2: Hospital / Surgery Ward
    await ngoRepo.create({
      _id: "ngo_del_007",
      ngo_id: "ngo_del_007",
      organisation_name: "Friendicoes SECA Emergency Hospital",
      alternate_names: [],
      registration_number: "DL/1979/001234",
      registration_authority: "Registrar of Societies, Delhi",
      registration_date: "1979-05-15",
      organisation_type: "SOCIETY",
      service_categories: ["injured_animal"],
      supported_subject_types: ["animal"],
      assistance_capabilities: ["orthopedic_surgery", "inpatient_ward"],
      specialised_services: [],
      operational_states: ["Delhi"],
      operational_districts: ["South Delhi", "Central Delhi"],
      service_areas: [],
      headquarters_location: {
        address: "Jangpura",
        district: "South Delhi",
        state: "Delhi",
        latitude: 28.58,
        longitude: 77.24,
        geo: { type: "Point", coordinates: [77.24, 28.58] },
      },
      service_radius_km: 20,
      verification_status: "OPERATIONALLY_VERIFIED",
      registration_status: "REGISTERED",
      availability_status: "AVAILABLE",
      operating_hours: "24/7",
      capacity_status: "MODERATE",
      accepting_assignments: true,
      service_constraints: [],
      active_cases: 0,
      max_concurrent_cases: 5,
      last_verified_at: null,
      verification_source: null,
      verification_evidence: [],
      assignment_history: {
        total_assignments: 0,
        accepted_assignments: 0,
        completed_interventions: 0,
        rejected_assignments: 0,
        average_response_minutes: null,
        sample_size: 0,
      },
      contact: { phone: null, email: null, emergency_phone: null, coordinator_name: null, is_phone_verified: false },
      source_type: "synthetic_fixture",
      source_reference: "test_seed",
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const created = await caseService.createCaseFromApprovedIncident(
      {
        incident_public_reference: "UMD-REC-001",
        assistance_requirements: ["animal_ambulance"],
        max_matching_cycles: 3,
      },
      "coord_sharma"
    );
    testCaseRef = created.case.public_case_reference;
  });

  // Test 16 & 17: Follow-up creates a new matching cycle while preserving previous interventions
  it("creates a new matching cycle when intervention discovers additional needs, preserving all prior interventions (Tests 16, 17)", async () => {
    // 1. Assign first NGO
    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );
    const asgId = assignedCase.assignments[0].assignment_id;

    // 2. NGO accepts, marks en route, arrives
    await responderService.acceptAssignment(asgId, { ngoId: "ngo_del_001", responderId: "resp_01" });
    await responderService.markEnRoute(asgId, { ngoId: "ngo_del_001", responderId: "resp_01" });
    await responderService.confirmArrival(asgId, { ngoId: "ngo_del_001", responderId: "resp_01" });

    // 3. NGO records intervention providing ambulance transport, but flags additional need "orthopedic_surgery"
    const { case: intCase } = await responderService.recordIntervention(
      asgId,
      {
        intervention_type: "veterinary_assessment",
        description: "Stabilized and transported canine to triage holding. Complex compound fracture requires immediate orthopedic surgery.",
        assistance_provided: ["animal_ambulance"],
        additional_needs: ["orthopedic_surgery"],
      },
      { ngoId: "ngo_del_001", responderId: "resp_01" }
    );

    // Initial need "animal_ambulance" is resolved; newly added need "orthopedic_surgery" remains unresolved
    expect(intCase.unresolved_requirements).toEqual(["orthopedic_surgery"]);
    expect(intCase.case_status).toBe("FOLLOW_UP_REQUIRED");
    expect(intCase.interventions).toHaveLength(1);

    // 4. Trigger Recursive Follow-Up Cycle
    const cycleResult = await recursiveEngine.triggerFollowUpCycle(testCaseRef, "coord_sharma");

    expect(cycleResult.escalated).toBe(false);
    expect(cycleResult.case.current_matching_cycle).toBe(2);
    expect(cycleResult.case.case_status).toBe("MATCHING");

    // Test 17: Prior interventions remain intact!
    expect(cycleResult.case.interventions).toHaveLength(1);
    expect(cycleResult.case.interventions[0].description).toContain("Complex compound fracture");

    // Match candidate in new cycle should identify the hospital capable of orthopedic surgery
    expect(cycleResult.nextMatching).toBeDefined();
    const topCandidate = cycleResult.nextMatching?.candidates.find((c) => c.eligible);
    expect(topCandidate?.ngo_id).toBe("ngo_del_007"); // Friendicoes SECA Emergency Hospital
  });

  // Test 19: Matching cycle limits prevent infinite retries
  it("automatically escalates when maximum matching cycles are reached to prevent infinite loops (Test 19)", async () => {
    // Force current_matching_cycle to max (3)
    const initialCase = await caseRepo.findByReference(testCaseRef);
    await caseRepo.update(initialCase!.case_id, {
      current_matching_cycle: 3,
      max_matching_cycles: 3,
      case_status: "FOLLOW_UP_REQUIRED",
      unresolved_requirements: ["unmet_critical_need"],
    });

    const cycleResult = await recursiveEngine.triggerFollowUpCycle(testCaseRef, "coord_sharma");

    expect(cycleResult.escalated).toBe(true);
    expect(cycleResult.case.case_status).toBe("ESCALATED");
    expect(cycleResult.reason).toContain("Maximum matching cycles (3) reached");

    const events = await caseRepo.getEvents(initialCase!.case_id);
    const escEvent = events.find((e) => e.event_type === "RECURSIVE_CYCLE_ESCALATED");
    expect(escEvent).toBeDefined();
  });

  // Test 18: No suitable NGO causes coordinator escalation
  it("escalates to human coordinator when zero suitable organisations remain in the registry (Test 18)", async () => {
    // Set an exotic requirement that no Delhi NGO in the registry can service
    const initialCase = await caseRepo.findByReference(testCaseRef);
    await caseRepo.update(initialCase!.case_id, {
      current_matching_cycle: 1,
      max_matching_cycles: 3,
      case_status: "FOLLOW_UP_REQUIRED",
      unresolved_requirements: ["hyperbaric_marine_chamber_therapy"],
    });

    // Suspend or mark all animal NGOs as having rejected earlier cycles
    initialCase!.assignments.push({
      assignment_id: "asg_prior_reject",
      case_id: initialCase!.case_id,
      organisation_id: "ngo_del_001",
      organisation_name: "DAWST",
      requirement: "hyperbaric_marine_chamber_therapy",
      matching_cycle: 1,
      status: "REJECTED",
      assigned_by: "coord_sharma",
      assigned_at: new Date().toISOString(),
      response_deadline: new Date().toISOString(),
      contact_attempts: [],
    });
    initialCase!.assignments.push({
      assignment_id: "asg_prior_reject_2",
      case_id: initialCase!.case_id,
      organisation_id: "ngo_del_007",
      organisation_name: "Friendicoes",
      requirement: "hyperbaric_marine_chamber_therapy",
      matching_cycle: 1,
      status: "REJECTED",
      assigned_by: "coord_sharma",
      assigned_at: new Date().toISOString(),
      response_deadline: new Date().toISOString(),
      contact_attempts: [],
    });
    await caseRepo.update(initialCase!.case_id, { assignments: initialCase!.assignments });

    const cycleResult = await recursiveEngine.triggerFollowUpCycle(testCaseRef, "coord_sharma");

    expect(cycleResult.escalated).toBe(true);
    expect(cycleResult.case.case_status).toBe("ESCALATED");
    expect(cycleResult.reason).toContain("Zero eligible organisations available in registry");
  });

  // Test 23: Citizen tracking tokens are never exposed to NGOs
  it("guarantees citizen secret tracking tokens are never exposed in case or assignment records (Test 23)", async () => {
    const fetchedCase = await caseRepo.findByReference(testCaseRef);

    // Case schema inspection: tracking_token and tracking_token_hash must not exist on Case
    expect((fetchedCase as any).tracking_token).toBeUndefined();
    expect((fetchedCase as any).tracking_token_hash).toBeUndefined();

    // Assignments inspection: none of the assignments contain tracking tokens
    for (const asg of fetchedCase!.assignments) {
      expect((asg as any).tracking_token).toBeUndefined();
    }
  });
});
