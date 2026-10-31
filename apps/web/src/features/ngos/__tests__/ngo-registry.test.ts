import { describe, it, expect, beforeEach } from "vitest";
import { NGOSchema, NGODocument } from "@umeed/contracts";
import { InMemoryNGORepository } from "../repositories/memory-ngo.repository";
import { NGOService } from "../services/ngo.service";
import { detectDuplicateNGO } from "../services/duplicate.service";
import { NGOImportService } from "../services/csv-import.service";
import { sanitizeNGOForPublic } from "../services/privacy.service";
import { SYNTHETIC_DELHI_NGOS, seedDemoNGOs } from "../services/seed.service";

describe("Phase 4: NGO Intelligence Registry & Ingestion", () => {
  let repo: InMemoryNGORepository;
  let service: NGOService;

  const validNgoDoc: NGODocument = {
    _id: "ngo_test_001",
    ngo_id: "NGO-TEST-001",
    organisation_name: "Delhi Animal Welfare Society",
    alternate_names: ["DAWS"],
    registration_number: "DL/2023/5541",
    registration_authority: "NGO-DARPAN",
    registration_date: "2023-04-12",
    organisation_type: "SOCIETY",
    service_categories: ["injured_animal", "abandoned_animal"],
    supported_subject_types: ["animal"],
    assistance_capabilities: ["animal_first_aid", "ambulance"],
    specialised_services: ["surgery"],
    operational_states: ["Delhi"],
    operational_districts: ["North West Delhi", "North Delhi"],
    service_areas: ["Rohini", "Pitampura"],
    headquarters_location: {
      address: "Sector 9, Rohini, Delhi",
      district: "North West Delhi",
      state: "Delhi",
      latitude: 28.7142,
      longitude: 77.1189,
      geo: {
        type: "Point",
        coordinates: [77.1189, 28.7142],
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
    last_verified_at: "2026-10-01T10:00:00.000Z",
    verification_source: "Field Visit",
    verification_evidence: [
      {
        source: "Clinical inspection",
        verified_at: "2026-10-01T10:00:00.000Z",
        verifier_id: "auditor_01",
        verifier_role: "Field Auditor",
        evidence_document_ref: "doc_01",
        verification_notes: "Valid facility inspected",
      },
    ],
    assignment_history: {
      total_assignments: 10,
      accepted_assignments: 10,
      completed_interventions: 9,
      rejected_assignments: 0,
      average_response_minutes: 25,
      sample_size: 10,
    },
    contact: {
      phone: "+91-11-2700-1122",
      email: "help@daws-test.org",
      emergency_phone: "+91-98765-43210",
      coordinator_name: "Ramesh Kumar",
      is_phone_verified: true,
    },
    source_type: "manual_entry",
    source_reference: "manual_001",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    repo = new InMemoryNGORepository();
    await repo.initIndexes();
    service = new NGOService(repo);
  });

  describe("1. NGO Schema Validation", () => {
    it("validates a fully compliant NGO document", () => {
      const parsed = NGOSchema.safeParse(validNgoDoc);
      expect(parsed.success).toBe(true);
    });

    it("rejects NGO document missing service categories or supported subject types", () => {
      const invalid = {
        ...validNgoDoc,
        service_categories: [], // Min 1 required
      };
      const parsed = NGOSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("enforces latitude and longitude geographical bounds strictly", () => {
      const outOfBounds = {
        ...validNgoDoc,
        headquarters_location: {
          ...validNgoDoc.headquarters_location,
          latitude: 105.4, // Exceeds 90
        },
      };
      const parsed = NGOSchema.safeParse(outOfBounds);
      expect(parsed.success).toBe(false);
    });
  });

  describe("2. Duplicate Organisation Detection", () => {
    it("flags duplicate by exact registration number", async () => {
      await repo.create(validNgoDoc);

      const dupResult = await detectDuplicateNGO(
        {
          organisation_name: "Totally Different Name",
          registration_number: "DL/2023/5541", // Matches existing
          operational_districts: ["South Delhi"],
        },
        repo
      );

      expect(dupResult.is_duplicate).toBe(true);
      expect(dupResult.match_type).toBe("REGISTRATION_NUMBER");
      expect(dupResult.existing_ngo_id).toBe(validNgoDoc.ngo_id);
    });

    it("flags duplicate by normalized organisation name and district overlap", async () => {
      await repo.create(validNgoDoc);

      const dupResult = await detectDuplicateNGO(
        {
          organisation_name: "Delhi Animal Welfare Society Trust Regd", // Normalized match
          registration_number: null,
          operational_districts: ["North West Delhi"], // Overlapping district
        },
        repo
      );

      expect(dupResult.is_duplicate).toBe(true);
      expect(dupResult.match_type).toBe("NAME_AND_DISTRICT");
    });

    it("allows non-duplicate organisation with unique name and registration", async () => {
      await repo.create(validNgoDoc);

      const dupResult = await detectDuplicateNGO(
        {
          organisation_name: "Asha Senior Citizen Home",
          registration_number: "DL/2024/9999",
          operational_districts: ["South Delhi"],
        },
        repo
      );

      expect(dupResult.is_duplicate).toBe(false);
    });
  });

  describe("3. CSV Import Validation & Provenance", () => {
    it("successfully parses, validates, and imports CSV rows", async () => {
      const csv = `organisation_name,service_categories,operational_districts,registration_number,latitude,longitude
Karuna Animal Rescue,injured_animal;abandoned_animal,North Delhi;Central Delhi,DL/2024/7701,28.6650,77.2100
Delhi Meals Mission,food_assistance,South Delhi,DL/2024/7702,28.5500,77.2300`;

      const importer = new NGOImportService(repo);
      const report = await importer.importFromCsv(csv, { isDemoOnly: true });

      expect(report.total_rows).toBe(2);
      expect(report.imported_count).toBe(2);
      expect(report.error_count).toBe(0);
      expect(report.created_ngo_ids.length).toBe(2);

      const saved = await repo.findById(report.created_ngo_ids[0]);
      expect(saved?.organisation_name).toBe("Karuna Animal Rescue");
      expect(saved?.is_demo).toBe(true);
      // Invariant: Imported records are never automatically promoted to OPERATIONALLY_VERIFIED
      expect(saved?.verification_status).toBe("REGISTRATION_CHECKED");
    });

    it("catches invalid service categories and reports row-level errors", async () => {
      const csv = `organisation_name,service_categories,operational_districts
Invalid Aid Org,completely_fake_category,North Delhi`;

      const importer = new NGOImportService(repo);
      const report = await importer.importFromCsv(csv);

      expect(report.imported_count).toBe(0);
      expect(report.error_count).toBe(1);
      expect(report.errors[0].field).toBe("service_categories");
    });

    it("detects intra-batch and database duplicates and skips them cleanly", async () => {
      await repo.create(validNgoDoc);

      const csv = `organisation_name,service_categories,operational_districts,registration_number
Duplicate DB NGO,injured_animal,North Delhi,DL/2023/5541
New Unique NGO,homeless_person,West Delhi,DL/2024/8899
New Unique NGO,homeless_person,West Delhi,DL/2024/8899`;

      const importer = new NGOImportService(repo);
      const report = await importer.importFromCsv(csv);

      expect(report.imported_count).toBe(1); // Only the second row
      expect(report.skipped_duplicates_count).toBe(2); // DB duplicate + intra-batch duplicate
    });
  });

  describe("4. Privacy Boundary & Public Redaction", () => {
    it("redacts coordinator contact details and private evidence from public view", () => {
      const sanitized = sanitizeNGOForPublic(validNgoDoc);

      expect((sanitized as unknown as Record<string, unknown>).contact).toBeUndefined();
      expect((sanitized as unknown as Record<string, unknown>).verification_evidence).toBeUndefined();
      expect(sanitized.public_contact_available).toBe(true);
      expect(sanitized.verification_badge).toBe("OPERATIONALLY_VERIFIED");
      expect(sanitized.organisation_name).toBe(validNgoDoc.organisation_name);
    });
  });

  describe("5. Synthetic Seed Registry", () => {
    it("seeds synthetic Delhi organisations clearly tagged as DEMO_ONLY", async () => {
      const count = await seedDemoNGOs(repo);
      expect(count).toBe(SYNTHETIC_DELHI_NGOS.length);
      expect(count).toBeGreaterThanOrEqual(8);

      const { ngos } = await repo.list({ limit: 100 });
      for (const ngo of ngos) {
        expect(ngo.is_demo).toBe(true);
        expect(ngo.organisation_name).toContain("DEMO_ONLY");
      }
    });
  });
});
