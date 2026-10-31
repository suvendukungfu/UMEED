import { describe, it, expect, beforeEach } from "vitest";
import { CaseService } from "../services/case.service";
import { ResponderService } from "../services/responder.service";
import { InMemoryCaseRepository } from "../repositories/memory-case.repository";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories/memory-incident.repository";
import { InMemoryNGORepository } from "@/features/ngos/repositories/memory-ngo.repository";
import { MockNotificationAdapter } from "@/features/notifications/adapters/mock.adapter";
import { canTransitionAssignment } from "../state-machine";

describe("Phase 5: Assignment Coordination & Responder Lifecycle", () => {
  let caseRepo: InMemoryCaseRepository;
  let incidentRepo: InMemoryIncidentRepository;
  let ngoRepo: InMemoryNGORepository;
  let notificationAdapter: MockNotificationAdapter;
  let caseService: CaseService;
  let responderService: ResponderService;
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

    // Seed approved incident
    await incidentRepo.create({
      _id: "inc_asg_001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "cit_test_asg_001",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Severe canine fracture in South Delhi",
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
      public_reference: "UMD-ASG-001",
      tracking_token_hash: "hash_secret_token_123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed NGOs
    await ngoRepo.create({
      _id: "ngo_del_001",
      ngo_id: "ngo_del_001",
      organisation_name: "Delhi Animal Welfare Society Trust Regd",
      alternate_names: ["DAWST"],
      registration_number: "DL/2018/0184920",
      registration_authority: "Registrar of Societies, Delhi",
      registration_date: "2018-04-12",
      organisation_type: "TRUST",
      service_categories: ["injured_animal", "abandoned_animal"],
      supported_subject_types: ["animal"],
      assistance_capabilities: ["animal_ambulance", "veterinary_first_aid"],
      specialised_services: [],
      operational_states: ["Delhi"],
      operational_districts: ["South Delhi", "New Delhi"],
      service_areas: [],
      headquarters_location: {
        address: "Sector 4, R.K. Puram",
        district: "South Delhi",
        state: "Delhi",
        latitude: 28.5623,
        longitude: 77.1812,
        geo: { type: "Point", coordinates: [77.1812, 28.5623] },
      },
      service_radius_km: 20,
      verification_status: "OPERATIONALLY_VERIFIED",
      registration_status: "REGISTERED",
      availability_status: "AVAILABLE",
      operating_hours: "24/7 Emergency Dispatch",
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
      contact: {
        phone: "+91-11-2618-9100",
        email: "emergency@dawst.delhi.ngo.in",
        emergency_phone: "+91-98111-92839",
        coordinator_name: "Dr. Vikram Sethi",
        is_phone_verified: true,
      },
      source_type: "synthetic_fixture",
      source_reference: "test_seed",
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await ngoRepo.create({
      _id: "ngo_del_006",
      ngo_id: "ngo_del_006",
      organisation_name: "Apna Aashray Emergency Shelter Collective",
      alternate_names: [],
      registration_number: "DL/2020/091283",
      registration_authority: "Registrar of Societies, Delhi",
      registration_date: "2020-01-10",
      organisation_type: "SOCIETY",
      service_categories: ["injured_animal", "shelter_assistance"],
      supported_subject_types: ["animal"],
      assistance_capabilities: ["quarantine_ward", "long_term_shelter"],
      specialised_services: [],
      operational_states: ["Delhi"],
      operational_districts: ["South Delhi"],
      service_areas: [],
      headquarters_location: {
        address: "Mehrauli",
        district: "South Delhi",
        state: "Delhi",
        latitude: 28.518,
        longitude: 77.184,
        geo: { type: "Point", coordinates: [77.184, 28.518] },
      },
      service_radius_km: 20,
      verification_status: "OPERATIONALLY_VERIFIED",
      registration_status: "REGISTERED",
      availability_status: "AVAILABLE",
      operating_hours: "09:00 - 18:00",
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
      contact: {
        phone: "+91-11-2651-4000",
        email: "shelter@apnaaashray.ngo.in",
        emergency_phone: null,
        coordinator_name: null,
        is_phone_verified: false,
      },
      source_type: "synthetic_fixture",
      source_reference: "test_seed",
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const created = await caseService.createCaseFromApprovedIncident(
      {
        incident_public_reference: "UMD-ASG-001",
        assistance_requirements: ["animal_ambulance", "long_term_shelter"],
      },
      "coord_sharma"
    );
    testCaseRef = created.case.public_case_reference;
  });

  // Test 11: Multiple organisations can serve distinct needs
  it("assigns multiple organisations to distinct assistance needs on the same case (Test 11)", async () => {
    const updated = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [
          { organisation_id: "ngo_del_001", requirement: "animal_ambulance", response_deadline_hours: 2 },
          { organisation_id: "ngo_del_006", requirement: "long_term_shelter", response_deadline_hours: 4 },
        ],
      },
      "coord_sharma"
    );

    expect(updated.assignments).toHaveLength(2);
    expect(updated.case_status).toBe("RESPONDERS_CONTACTED");

    const ambulanceAsg = updated.assignments.find((a) => a.requirement === "animal_ambulance");
    const shelterAsg = updated.assignments.find((a) => a.requirement === "long_term_shelter");

    expect(ambulanceAsg?.organisation_id).toBe("ngo_del_001");
    expect(shelterAsg?.organisation_id).toBe("ngo_del_006");
  });

  // Test 12: Conflicting duplicate assignments are prevented
  it("prevents assigning conflicting responders for the same active requirement (Test 12)", async () => {
    // Assign first organisation
    const caseWithFirst = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );

    const asgId = caseWithFirst.assignments[0].assignment_id;
    // NGO accepts the assignment
    await responderService.acceptAssignment(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_del_01",
    });

    // Attempting to assign another NGO to the same requirement while an active responder is already assigned should conflict
    await expect(
      caseService.assignOrganisations(
        testCaseRef,
        {
          assignments: [{ organisation_id: "ngo_del_006", requirement: "animal_ambulance" }],
        },
        "coord_sharma"
      )
    ).rejects.toThrow(/already has an active responder/);
  });

  // Test 5, 8, 9, 10: Full flow: Accept -> En Route -> Arrived -> Intervention Recorded
  it("progresses assignment through ACCEPTED, EN_ROUTE, ARRIVED and records intervention (Tests 5, 8, 9, 10)", async () => {
    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );

    const asgId = assignedCase.assignments[0].assignment_id;

    // Test 5: NGO accepts assignment
    const acceptedCase = await responderService.acceptAssignment(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_dr_vikram",
      notes: "Ambulance #3 rolling now",
    });
    const acceptedAsg = acceptedCase.assignments.find((a) => a.assignment_id === asgId);
    expect(acceptedAsg?.status).toBe("ACCEPTED");
    expect(acceptedAsg?.accepted_at).toBeDefined();
    expect(acceptedCase.case_status).toBe("ACCEPTED");

    // Test 8: NGO marks en route
    const enRouteCase = await responderService.markEnRoute(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_dr_vikram",
    });
    const enRouteAsg = enRouteCase.assignments.find((a) => a.assignment_id === asgId);
    expect(enRouteAsg?.status).toBe("EN_ROUTE");
    expect(enRouteAsg?.en_route_at).toBeDefined();

    // Test 9: NGO confirms arrival
    const arrivedCase = await responderService.confirmArrival(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_dr_vikram",
    });
    const arrivedAsg = arrivedCase.assignments.find((a) => a.assignment_id === asgId);
    expect(arrivedAsg?.status).toBe("ARRIVED");
    expect(arrivedAsg?.arrived_at).toBeDefined();
    expect(arrivedCase.case_status).toBe("RESPONDER_ARRIVED");

    // Test 10: Intervention record is stored
    const { case: intCase, intervention } = await responderService.recordIntervention(
      asgId,
      {
        intervention_type: "veterinary_assessment",
        description: "Stabilized canine, administered fluid resuscitation and analgesia.",
        assistance_provided: ["animal_ambulance", "veterinary_first_aid"],
        evidence_references: [
          {
            type: "image",
            url: "https://storage.umeed.internal/evidence/stabilized_limb.jpg",
          },
        ],
        additional_needs: [],
      },
      {
        ngoId: "ngo_del_001",
        responderId: "resp_dr_vikram",
      }
    );

    expect(intervention.intervention_id).toBeDefined();
    expect(intCase.interventions).toHaveLength(1);
    expect(intCase.interventions[0].description).toContain("Stabilized canine");
    // "animal_ambulance" was in unresolved requirements; should now be resolved
    expect(intCase.unresolved_requirements).not.toContain("animal_ambulance");
  });

  // Test 6: NGO rejects assignment
  it("records assignment rejection with structured reason (Test 6)", async () => {
    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );
    const asgId = assignedCase.assignments[0].assignment_id;

    const rejectedCase = await responderService.rejectAssignment(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_operator",
      reason: "All ambulances currently committed on Highway 8 collision.",
    });

    const asg = rejectedCase.assignments.find((a) => a.assignment_id === asgId);
    expect(asg?.status).toBe("REJECTED");
    expect(asg?.rejected_at).toBeDefined();
    expect(asg?.rejection_reason).toContain("Highway 8 collision");
  });

  // Test 7: NGO requests additional information
  it("records responder information requests (Test 7)", async () => {
    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );
    const asgId = assignedCase.assignments[0].assignment_id;

    const infoCase = await responderService.requestInformation(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_driver",
      infoText: "Which flyover pillar is the animal located near?",
    });

    const asg = infoCase.assignments.find((a) => a.assignment_id === asgId);
    expect(asg?.status).toBe("REQUESTED_INFORMATION");
    expect(asg?.info_requested).toContain("flyover pillar");
  });

  // Test 13 & 14: Contact attempts remain auditable & truthful
  it("tracks notification attempts truthfully without fabricating external carrier delivery (Tests 13, 14)", async () => {
    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );

    const asg = assignedCase.assignments[0];
    expect(asg.contact_attempts).toHaveLength(1);
    expect(asg.contact_attempts[0].channel).toBe("in_app");
    // Truthful check: Since mock adapter is in use, status must be SIMULATED_MOCK
    expect(asg.contact_attempts[0].status).toBe("SIMULATED_MOCK");
    expect(asg.contact_attempts[0].details).toContain("is_mock: true");
  });

  // Test 15: Notification failure does not lose case data
  it("handles notification delivery failure without losing case persistence (Test 15)", async () => {
    notificationAdapter.setSimulateFailure(true);

    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );

    const asg = assignedCase.assignments[0];
    expect(asg.status).toBe("CONTACT_FAILED");
    expect(asg.contact_attempts[0].status).toBe("FAILED");
    expect(asg.contact_attempts[0].details).toContain("Carrier connection error");

    // Case is still persisted cleanly in database
    const fetched = await caseRepo.findByReference(testCaseRef);
    expect(fetched).toBeDefined();
    expect(fetched?.assignments).toHaveLength(1);
  });

  // Test 22: Unauthorised NGO cannot access another NGO's private assignment
  it("prevents an organisation from modifying another organisation's assignment (Test 22)", async () => {
    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );
    const asgId = assignedCase.assignments[0].assignment_id;

    // ngo_del_006 attempts to accept ngo_del_001's assignment
    await expect(
      responderService.acceptAssignment(asgId, {
        ngoId: "ngo_del_006", // Unauthorised actor for this assignment
        responderId: "resp_imposter",
      })
    ).rejects.toThrow(/Access denied: Assignment '.*' does not belong to organisation 'ngo_del_006'/);
  });

  // Test 24: Repeated action requests remain idempotent
  it("idempotently handles repeated acceptance without duplicating state (Test 24)", async () => {
    const assignedCase = await caseService.assignOrganisations(
      testCaseRef,
      {
        assignments: [{ organisation_id: "ngo_del_001", requirement: "animal_ambulance" }],
      },
      "coord_sharma"
    );
    const asgId = assignedCase.assignments[0].assignment_id;

    const first = await responderService.acceptAssignment(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_dr_vikram",
    });

    const second = await responderService.acceptAssignment(asgId, {
      ngoId: "ngo_del_001",
      responderId: "resp_dr_vikram",
    });

    expect(first.case_id).toBe(second.case_id);
    const asg = second.assignments.find((a) => a.assignment_id === asgId);
    expect(asg?.status).toBe("ACCEPTED");
  });

  // Test 25: Concurrent NGO acceptance is safe
  it("safely handles sequential/concurrent acceptance attempts for the same requirement (Test 25)", async () => {
    // Both organisations contacted for the same requirement animal_ambulance
    // First organisation accepts
    const caseRecord = await caseRepo.findByReference(testCaseRef);
    caseRecord!.assignments.push({
      assignment_id: "asg_concurrent_1",
      case_id: caseRecord!.case_id,
      organisation_id: "ngo_del_001",
      organisation_name: "DAWST",
      requirement: "specialist_surgery",
      matching_cycle: 1,
      status: "CONTACTED",
      assigned_by: "coord_sharma",
      assigned_at: new Date().toISOString(),
      response_deadline: new Date(Date.now() + 3600000).toISOString(),
      contact_attempts: [],
    });
    caseRecord!.assignments.push({
      assignment_id: "asg_concurrent_2",
      case_id: caseRecord!.case_id,
      organisation_id: "ngo_del_006",
      organisation_name: "Apna Aashray",
      requirement: "specialist_surgery",
      matching_cycle: 1,
      status: "CONTACTED",
      assigned_by: "coord_sharma",
      assigned_at: new Date().toISOString(),
      response_deadline: new Date(Date.now() + 3600000).toISOString(),
      contact_attempts: [],
    });
    await caseRepo.update(caseRecord!.case_id, { assignments: caseRecord!.assignments });

    // Org 1 accepts successfully
    await responderService.acceptAssignment("asg_concurrent_1", {
      ngoId: "ngo_del_001",
      responderId: "resp_dr_vikram",
    });

    // Org 2 attempts to accept the same requirement afterwards
    await expect(
      responderService.acceptAssignment("asg_concurrent_2", {
        ngoId: "ngo_del_006",
        responderId: "resp_shelter_mgr",
      })
    ).rejects.toThrow(/was already accepted by/);
  });
});
