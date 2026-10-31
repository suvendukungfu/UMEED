import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistanceMeters,
  evaluateDuplicateCandidate,
} from "../services/duplicate.service";
import { IncidentDocument } from "../types";

describe("Duplicate Candidate Detection & Geolocation (Tests 9, 18, 19)", () => {
  it("computes accurate Haversine distance in meters", () => {
    // Madhuban Chowk Pitampura (28.6972, 77.1350) to Rohini Sector 14 (28.7041, 77.1025)
    // Approximately 3.2 km
    const distance = calculateHaversineDistanceMeters(
      28.6972,
      77.135,
      28.7041,
      77.1025
    );
    expect(distance).toBeGreaterThan(3000);
    expect(distance).toBeLessThan(3500);

    // Same point should be 0 meters
    expect(calculateHaversineDistanceMeters(28.7, 77.1, 28.7, 77.1)).toBe(0);
  });

  it("flags nearby incident as duplicate candidate without deleting it (Tests 18, 19)", () => {
    const candidateIncident: IncidentDocument = {
      _id: "candidate-001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "ref-001",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Injured stray dog near divider",
      evidence: [],
      location: {
        latitude: 28.6972,
        longitude: 77.135,
        address: "Pitampura",
        district: "North West Delhi",
        confidence: 0.95,
      },
      severity: { level: "high", confidence: 0.9, reasoning: [] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-AAAA-1111",
      tracking_token_hash: "dummyhash",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Target reported 150 meters away within 1 hour, same subject type
    const target = {
      subject_type: "animal" as const,
      incident_type: "injured_animal" as const,
      reported_at: new Date().toISOString(),
      latitude: 28.698,
      longitude: 77.136,
    };

    const result = evaluateDuplicateCandidate(target, candidateIncident);

    expect(result).not.toBeNull();
    expect(result?.public_reference).toBe("UMD-AAAA-1111");
    expect(result?.distance_meters).toBeLessThan(200);
    expect(result?.reason).toContain("Spatial proximity match");

    // Proves non-destructive invariant: candidate original document remains completely intact
    expect(candidateIncident.status).toBe("REPORTED");
    expect(candidateIncident._id).toBe("candidate-001");
  });

  it("does not flag candidates when subject type differs", () => {
    const candidateIncident: IncidentDocument = {
      _id: "candidate-002",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "ref-002",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "abandoned_elderly_person",
      subject_type: "person", // Person vs Animal
      description: "Elderly person needing shelter",
      evidence: [],
      location: {
        latitude: 28.6972,
        longitude: 77.135,
        address: "Pitampura",
        district: "North West Delhi",
        confidence: 0.95,
      },
      severity: { level: "high", confidence: 0.9, reasoning: [] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-BBBB-2222",
      tracking_token_hash: "dummyhash",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const target = {
      subject_type: "animal" as const, // Animal target
      incident_type: "injured_animal" as const,
      reported_at: new Date().toISOString(),
      latitude: 28.6972,
      longitude: 77.135,
    };

    const result = evaluateDuplicateCandidate(target, candidateIncident);
    expect(result).toBeNull();
  });
});
