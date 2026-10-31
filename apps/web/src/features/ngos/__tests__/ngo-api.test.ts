import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listNgosApi, POST as createNgoApi } from "@/app/api/ngos/route";
import { GET as getNgoByIdApi, PATCH as patchNgoApi } from "@/app/api/ngos/[ngoId]/route";
import { POST as importNgosApi } from "@/app/api/ngos/import/route";
import { GET as matchNgosApi } from "@/app/api/ngos/matches/[incidentReference]/route";
import { setNGORepository } from "../repositories";
import { InMemoryNGORepository } from "../repositories/memory-ngo.repository";
import { setIncidentRepository } from "@/features/incidents/repositories";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories/memory-incident.repository";
import { NGODocument } from "../types";
import { IncidentDocument } from "@/features/incidents/types";

describe("Phase 4: NGO API & Authorization Guardrails", () => {
  let ngoRepo: InMemoryNGORepository;
  let incidentRepo: InMemoryIncidentRepository;

  const sampleNgo: NGODocument = {
    _id: "ngo_sample_01",
    ngo_id: "NGO-SMP-001",
    organisation_name: "Delhi Animal Emergency Ambulance",
    alternate_names: [],
    registration_number: "DL/2024/0981",
    registration_authority: "NGO-DARPAN",
    registration_date: "2024-03-15",
    organisation_type: "TRUST",
    service_categories: ["injured_animal"],
    supported_subject_types: ["animal"],
    assistance_capabilities: ["animal_first_aid", "field_ambulance"],
    specialised_services: [],
    operational_states: ["Delhi"],
    operational_districts: ["North West Delhi"],
    service_areas: ["Rohini"],
    headquarters_location: {
      address: "Rohini, Delhi",
      district: "North West Delhi",
      state: "Delhi",
      latitude: 28.7041,
      longitude: 77.1025,
      geo: {
        type: "Point",
        coordinates: [77.1025, 28.7041],
      },
    },
    service_radius_km: 20,
    availability_status: "AVAILABLE",
    capacity_status: "HIGH",
    accepting_assignments: true,
    operating_hours: "24x7",
    service_constraints: [],
    active_cases: 1,
    max_concurrent_cases: 5,
    registration_status: "REGISTERED",
    verification_status: "OPERATIONALLY_VERIFIED",
    last_verified_at: "2026-10-01T00:00:00.000Z",
    verification_source: "Audit",
    verification_evidence: [],
    assignment_history: {
      total_assignments: 10,
      accepted_assignments: 10,
      completed_interventions: 9,
      rejected_assignments: 0,
      average_response_minutes: 20,
      sample_size: 10,
    },
    contact: {
      phone: "+91-11-5555-0101",
      email: "contact@delhianimal.org",
      emergency_phone: "+91-98765-01101",
      coordinator_name: "Dr. Sharma",
      is_phone_verified: true,
    },
    source_type: "manual_entry",
    source_reference: "manual_01",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleIncident: IncidentDocument = {
    _id: "inc_sample_01",
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: "cit_ref_01",
    source_url: null,
    reported_at: new Date().toISOString(),
    incident_type: "injured_animal",
    subject_type: "animal",
    description: "Injured stray canine with open wound",
    evidence: [],
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "Rohini",
      district: "North West Delhi",
      confidence: 0.95,
      geo: {
        type: "Point",
        coordinates: [77.1025, 28.7041],
      },
    },
    severity: { level: "critical", confidence: 0.9, reasoning: [] },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: true,
    status: "APPROVED",
    is_suspected_duplicate: false,
    suspected_duplicate_ids: [],
    public_reference: "UMD-SAMPLE-001",
    tracking_token_hash: "hash_01",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    ngoRepo = new InMemoryNGORepository();
    incidentRepo = new InMemoryIncidentRepository();
    await ngoRepo.initIndexes();
    await incidentRepo.initIndexes();
    setNGORepository(ngoRepo);
    setIncidentRepository(incidentRepo);
    await ngoRepo.create(sampleNgo);
    await incidentRepo.create(sampleIncident);
  });

  describe("12. Coordinator-Only Authorization Guardrails", () => {
    it("rejects POST /api/ngos when coordinator auth is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/ngos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleNgo),
      });

      const res = await createNgoApi(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("allows POST /api/ngos when coordinator header is present", async () => {
      const newNgo = {
        ...sampleNgo,
        _id: "ngo_new_02",
        ngo_id: "NGO-NEW-002",
        organisation_name: "Unique South Delhi Shelter",
        registration_number: "DL/2024/9988",
        operational_districts: ["South Delhi"],
      };

      const req = new NextRequest("http://localhost:3000/api/ngos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
        body: JSON.stringify(newNgo),
      });

      const res = await createNgoApi(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.ngo_id).toBe("NGO-NEW-002");
    });

    it("rejects PATCH /api/ngos/:ngoId without coordinator auth", async () => {
      const req = new NextRequest("http://localhost:3000/api/ngos/NGO-SMP-001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability_status: "LIMITED" }),
      });

      const res = await patchNgoApi(req, {
        params: Promise.resolve({ ngoId: "NGO-SMP-001" }),
      });
      expect(res.status).toBe(401);
    });

    it("rejects POST /api/ngos/import without coordinator auth", async () => {
      const req = new NextRequest("http://localhost:3000/api/ngos/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: "organisation_name,service_categories,operational_districts\nFake,injured_animal,North Delhi",
      });

      const res = await importNgosApi(req);
      expect(res.status).toBe(401);
    });

    it("rejects GET /api/ngos/matches/:ref without coordinator auth", async () => {
      const req = new NextRequest("http://localhost:3000/api/ngos/matches/UMD-SAMPLE-001", {
        method: "GET",
      });

      const res = await matchNgosApi(req, {
        params: Promise.resolve({ incidentReference: "UMD-SAMPLE-001" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Public vs Coordinator View Differentiation", () => {
    it("public GET /api/ngos redacts coordinator contact and private evidence", async () => {
      const req = new NextRequest("http://localhost:3000/api/ngos", {
        method: "GET",
      });

      const res = await listNgosApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data.is_coordinator_view).toBe(false);
      const first = json.data.ngos[0];
      expect(first.contact).toBeUndefined();
      expect(first.verification_evidence).toBeUndefined();
      expect(first.public_contact_available).toBe(true);
    });

    it("coordinator GET /api/ngos preserves full contact information", async () => {
      const req = new NextRequest("http://localhost:3000/api/ngos", {
        method: "GET",
        headers: {
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
      });

      const res = await listNgosApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data.is_coordinator_view).toBe(true);
      const first = json.data.ngos[0];
      expect(first.contact).toBeDefined();
      expect(first.contact.emergency_phone).toBe("+91-98765-01101");
    });
  });

  describe("13. No Automatic Dispatch Invariant", () => {
    it("matching API returns candidates for human decision without modifying incident status", async () => {
      const req = new NextRequest("http://localhost:3000/api/ngos/matches/UMD-SAMPLE-001", {
        method: "GET",
        headers: {
          "x-coordinator-key": "umeed-coordinator-dev-key",
        },
      });

      const res = await matchNgosApi(req, {
        params: Promise.resolve({ incidentReference: "UMD-SAMPLE-001" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data.candidates.length).toBeGreaterThan(0);

      // Verify incident in database is still in APPROVED status (not auto-dispatched)
      const incAfter = await incidentRepo.findByPublicReference("UMD-SAMPLE-001");
      expect(incAfter?.status).toBe("APPROVED");
    });
  });
});
