import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createCaseHandler, GET as listCasesHandler } from "@/app/api/cases/route";
import { GET as getCaseHandler } from "@/app/api/cases/[caseReference]/route";
import { POST as assignNGOsHandler } from "@/app/api/cases/[caseReference]/assignments/route";
import { POST as acceptAssignmentHandler } from "@/app/api/assignments/[assignmentId]/accept/route";
import { POST as recordInterventionHandler } from "@/app/api/assignments/[assignmentId]/interventions/route";
import { POST as resolveCaseHandler } from "@/app/api/cases/[caseReference]/resolve/route";
import { setCaseRepository, InMemoryCaseRepository } from "../repositories";
import { setIncidentRepository, InMemoryIncidentRepository } from "@/features/incidents/repositories";
import { setNGORepository, InMemoryNGORepository } from "@/features/ngos/repositories";

describe("Phase 5: Case API Endpoints & Actor Authorization Guardrails", () => {
  let caseRepo: InMemoryCaseRepository;
  let incidentRepo: InMemoryIncidentRepository;
  let ngoRepo: InMemoryNGORepository;

  beforeEach(async () => {
    caseRepo = new InMemoryCaseRepository();
    incidentRepo = new InMemoryIncidentRepository();
    ngoRepo = new InMemoryNGORepository();

    setCaseRepository(caseRepo);
    setIncidentRepository(incidentRepo);
    setNGORepository(ngoRepo);

    // Seed approved incident
    await incidentRepo.create({
      _id: "inc_api_001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "cit_api_001",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Canine trauma case",
      evidence: [],
      location: { latitude: 28.5, longitude: 77.2, address: "Delhi", district: "South Delhi", confidence: 0.9 },
      severity: { level: "high", confidence: 0.9, reasoning: [] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
      status: "APPROVED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-API-001",
      tracking_token_hash: "hash_001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed NGO
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
      assistance_capabilities: ["animal_ambulance"],
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
  });

  it("fails closed with 401 when POST /api/cases lacks coordinator credentials", async () => {
    const req = new NextRequest("http://localhost:3000/api/cases", {
      method: "POST",
      body: JSON.stringify({ incident_public_reference: "UMD-API-001" }),
    });

    const res = await createCaseHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("creates a case with 201 Created when coordinator key is present", async () => {
    const req = new NextRequest("http://localhost:3000/api/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-coordinator-key": "umeed-coordinator-dev-key",
      },
      body: JSON.stringify({ incident_public_reference: "UMD-API-001" }),
    });

    const res = await createCaseHandler(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(json.data.public_case_reference).toBe("CASE-API-001");
  });

  it("assigns organisation via POST /api/cases/:caseReference/assignments", async () => {
    // First create case
    const createReq = new NextRequest("http://localhost:3000/api/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-coordinator-key": "umeed-coordinator-dev-key",
      },
      body: JSON.stringify({ incident_public_reference: "UMD-API-001" }),
    });
    await createCaseHandler(createReq);

    // Now assign organisation
    const assignReq = new NextRequest(
      "http://localhost:3000/api/cases/CASE-API-001/assignments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          assignments: [
            { organisation_id: "ngo_del_001", requirement: "injured_animal" },
          ],
        }),
      }
    );

    const res = await assignNGOsHandler(assignReq, {
      params: Promise.resolve({ caseReference: "CASE-API-001" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.assignments).toHaveLength(1);
    expect(json.data.assignments[0].organisation_id).toBe("ngo_del_001");
  });

  it("enforces responder actor identity on POST /api/assignments/:id/accept", async () => {
    // 1. Create case and assignment
    await caseRepo.create({
      case_id: "case_test_001",
      incident_id: "inc_001",
      incident_reference: "UMD-API-001",
      public_case_reference: "CASE-API-001",
      case_status: "RESPONDERS_CONTACTED",
      assistance_requirements: ["injured_animal"],
      unresolved_requirements: ["injured_animal"],
      assignments: [
        {
          assignment_id: "asg_target_001",
          case_id: "case_test_001",
          organisation_id: "ngo_del_001",
          organisation_name: "DAWST",
          requirement: "injured_animal",
          matching_cycle: 1,
          status: "CONTACTED",
          assigned_by: "coord_primary",
          assigned_at: new Date().toISOString(),
          response_deadline: new Date().toISOString(),
          contact_attempts: [],
        },
      ],
      interventions: [],
      current_matching_cycle: 1,
      max_matching_cycles: 3,
      created_by: "coord_primary",
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      resolution_evidence: [],
      resolution_decision: null,
    });

    // Attempt without x-ngo-id fails closed with 401
    const unauthReq = new NextRequest(
      "http://localhost:3000/api/assignments/asg_target_001/accept",
      {
        method: "POST",
      }
    );
    const unauthRes = await acceptAssignmentHandler(unauthReq, {
      params: Promise.resolve({ assignmentId: "asg_target_001" }),
    });
    expect(unauthRes.status).toBe(401);

    // Attempt with matching x-ngo-id succeeds
    const authReq = new NextRequest(
      "http://localhost:3000/api/assignments/asg_target_001/accept",
      {
        method: "POST",
        headers: {
          "x-ngo-id": "ngo_del_001",
          "x-responder-id": "resp_delhi_vet",
        },
      }
    );
    const authRes = await acceptAssignmentHandler(authReq, {
      params: Promise.resolve({ assignmentId: "asg_target_001" }),
    });
    expect(authRes.status).toBe(200);
    const json = await authRes.json();
    const asg = json.data.assignments.find((a: any) => a.assignment_id === "asg_target_001");
    expect(asg.status).toBe("ACCEPTED");
  });

  it("records field intervention and resolves case via API", async () => {
    // Seed accepted case
    await caseRepo.create({
      case_id: "case_test_002",
      incident_id: "inc_002",
      incident_reference: "UMD-API-002",
      public_case_reference: "CASE-API-002",
      case_status: "RESPONDER_ARRIVED",
      assistance_requirements: ["injured_animal"],
      unresolved_requirements: ["injured_animal"],
      assignments: [
        {
          assignment_id: "asg_arrived_002",
          case_id: "case_test_002",
          organisation_id: "ngo_del_001",
          organisation_name: "DAWST",
          requirement: "injured_animal",
          matching_cycle: 1,
          status: "ARRIVED",
          assigned_by: "coord_primary",
          assigned_at: new Date().toISOString(),
          response_deadline: new Date().toISOString(),
          contact_attempts: [],
        },
      ],
      interventions: [],
      current_matching_cycle: 1,
      max_matching_cycles: 3,
      created_by: "coord_primary",
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      resolution_evidence: [],
      resolution_decision: null,
    });

    // Post intervention
    const intvReq = new NextRequest(
      "http://localhost:3000/api/assignments/asg_arrived_002/interventions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ngo-id": "ngo_del_001",
          "x-responder-id": "resp_field",
        },
        body: JSON.stringify({
          intervention_type: "veterinary_assessment",
          description: "Administered wound care and transported to clinic",
          assistance_provided: ["injured_animal"],
          evidence_references: [],
          additional_needs: [],
        }),
      }
    );

    const intvRes = await recordInterventionHandler(intvReq, {
      params: Promise.resolve({ assignmentId: "asg_arrived_002" }),
    });
    expect(intvRes.status).toBe(201);

    // Resolve case as coordinator
    const resolveReq = new NextRequest(
      "http://localhost:3000/api/cases/CASE-API-002/resolve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify({
          decision: "RESOLVED",
          rationale: "Animal treated and released in safe shelter care.",
          evidence_urls: ["https://storage.umeed.internal/evidence/report.pdf"],
        }),
      }
    );

    const resolveRes = await resolveCaseHandler(resolveReq, {
      params: Promise.resolve({ caseReference: "CASE-API-002" }),
    });
    expect(resolveRes.status).toBe(200);
    const json = await resolveRes.json();
    expect(json.data.case_status).toBe("RESOLVED");
  });
});
