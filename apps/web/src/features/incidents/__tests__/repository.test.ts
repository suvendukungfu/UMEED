import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryIncidentRepository } from "../repositories/memory-incident.repository";
import { IncidentDocument } from "../types";

describe("Incident Repository Architecture (Tests 9, 17, 18, 20)", () => {
  let repo: InMemoryIncidentRepository;

  beforeEach(() => {
    repo = new InMemoryIncidentRepository();
  });

  const sampleIncident: IncidentDocument = {
    _id: "test-id-001",
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: "ref-repo-001",
    source_url: null,
    reported_at: new Date().toISOString(),
    incident_type: "injured_animal",
    subject_type: "animal",
    description: "Injured stray canine with leg trauma",
    evidence: [],
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "Rohini Sector 14",
      district: "North West Delhi",
      confidence: 0.95,
      geo: {
        type: "Point",
        coordinates: [77.1025, 28.7041], // Strictly [longitude, latitude] ordering
      },
    },
    severity: { level: "high", confidence: 0.9, reasoning: [] },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: true,
    status: "REPORTED",
    is_suspected_duplicate: false,
    suspected_duplicate_ids: [],
    public_reference: "UMD-REPO-0001",
    tracking_token_hash: "hash001",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("stores coordinates strictly in [longitude, latitude] GeoJSON Point ordering (Test 9)", async () => {
    const saved = await repo.create(sampleIncident);
    expect(saved.location.geo?.type).toBe("Point");
    expect(saved.location.geo?.coordinates[0]).toBe(77.1025); // Longitude first
    expect(saved.location.geo?.coordinates[1]).toBe(28.7041); // Latitude second
  });

  it("enforces unique compound index on { source_type, source_reference } throwing duplicate key error (Test 17)", async () => {
    await repo.create(sampleIncident);

    // Attempt to insert duplicate record with same compound key
    const duplicateKeyDoc: IncidentDocument = {
      ...sampleIncident,
      _id: "test-id-002",
      public_reference: "UMD-REPO-0002", // Different public ref
    };

    await expect(repo.create(duplicateKeyDoc)).rejects.toThrow(
      /E11000 duplicate key error/
    );
  });

  it("enforces unique index on public_reference (Test 17)", async () => {
    await repo.create(sampleIncident);

    const duplicateRefDoc: IncidentDocument = {
      ...sampleIncident,
      _id: "test-id-003",
      source_reference: "different-source-ref",
    };

    await expect(repo.create(duplicateRefDoc)).rejects.toThrow(
      /E11000 duplicate key error.*public_reference/
    );
  });

  it("finds nearby candidates within geographic distance and temporal window (Test 18)", async () => {
    await repo.create(sampleIncident);

    // Query 200m away
    const candidates = await repo.findNearbyCandidates(
      { latitude: 28.705, longitude: 77.103 },
      500, // 500 meters
      24, // 24 hours
      "animal"
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].public_reference).toBe("UMD-REPO-0001");
  });

  it("proves an Incident is never automatically a Case (Test 20)", async () => {
    const saved = await repo.create(sampleIncident);
    expect(saved.status).toBe("REPORTED");

    // Invariant 20: No case document exists or was created
    const hasCaseProperty = "case_id" in saved || "assigned_organisations" in saved;
    expect(hasCaseProperty).toBe(false);
  });
});
