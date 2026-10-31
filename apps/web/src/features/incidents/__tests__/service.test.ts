import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "../services/incident.service";
import { InMemoryIncidentRepository } from "../repositories/memory-incident.repository";
import { verifyTrackingToken } from "../services/tracking.service";

describe("Incident Ingestion Service (Canonical Integration)", () => {
  let repo: InMemoryIncidentRepository;
  let service: IncidentService;

  beforeEach(() => {
    repo = new InMemoryIncidentRepository();
    service = new IncidentService(repo);
  });

  const validCitizenPayload = {
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: "citizen_ref_999",
    source_url: null,
    reported_at: "2026-10-31T14:00:00.000Z",
    incident_type: "injured_animal",
    subject_type: "animal",
    description: "Injured stray canine with right hind limb trauma near Madhuban Chowk",
    evidence: [
      {
        type: "image",
        url: "https://storage.umeed.local/evidence/dog_trauma_01.jpg",
        timestamp: "2026-10-31T13:58:00.000Z",
        metadata: { camera: "Mobile 12MP", source: "direct_upload" },
      },
    ],
    location: {
      latitude: 28.6972,
      longitude: 77.135,
      address: "Madhuban Chowk, Pitampura",
      district: "North West Delhi",
      confidence: 0.95,
    },
    severity: {
      level: "critical",
      confidence: 0.92,
      reasoning: ["Bleeding observed", "Immobile near active traffic"],
    },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: true,
  };

  it("successfully ingests a valid citizen incident and issues tracking token (Tests 1, 10)", async () => {
    const result = await service.ingestIncident(validCitizenPayload);

    expect(result.is_duplicate).toBe(false);
    expect(result.public_reference).toMatch(/^UMD-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(result.tracking_token).toMatch(/^trk_[A-Za-z0-9_-]{32,}$/);
    expect(result.incident.status).toBe("REPORTED");

    // Invariant 1: INCIDENT IS NOT A CASE
    expect((result.incident as unknown as { case_id?: string }).case_id).toBeUndefined();

    // Verify evidence provenance is preserved (Test 24)
    expect(result.incident.evidence).toHaveLength(1);
    expect(result.incident.evidence[0].metadata).toEqual({
      camera: "Mobile 12MP",
      source: "direct_upload",
    });

    // Verify token hash is stored in DB, but plaintext token is not in doc (Test 16)
    expect(result.incident.tracking_token_hash).toBeDefined();
    expect(
      verifyTrackingToken(result.tracking_token!, result.incident.tracking_token_hash!)
    ).toBe(true);
  });

  it("ingests authenticated social media discovery and enforces human review (Tests 2, 21, 22)", async () => {
    const crawlerPayload = {
      ...validCitizenPayload,
      source_type: "social_media_discovery",
      source_reference: "social_post_5541",
      source_url: "https://social.example.com/post/5541",
      requires_human_review: false, // Attempt to bypass human review
    };

    const headers = new Headers();
    headers.set("x-crawler-api-key", "umeed-crawler-dev-key");

    const result = await service.ingestIncident(crawlerPayload, headers);

    expect(result.is_duplicate).toBe(false);
    expect(result.incident.source_type).toBe("social_media_discovery");

    // Invariant: Crawler discoveries MUST always require human review (Test 21)
    expect(result.requires_human_review).toBe(true);
    expect(result.incident.requires_human_review).toBe(true);
  });

  it("rejects unauthorized crawler submission (Test 22)", async () => {
    const crawlerPayload = {
      ...validCitizenPayload,
      source_type: "social_media_discovery",
      source_reference: "social_post_unauthorized",
    };

    // Missing headers
    await expect(service.ingestIncident(crawlerPayload)).rejects.toThrow(
      /Authentication required for crawler ingestion/
    );

    // Invalid key
    const headers = new Headers();
    headers.set("x-crawler-api-key", "wrong-key");
    await expect(service.ingestIncident(crawlerPayload, headers)).rejects.toThrow(
      /Invalid crawler authorization credential/
    );
  });

  it("handles repeated submission idempotently without duplicating or re-issuing tracking token (Test 11)", async () => {
    const firstResult = await service.ingestIncident(validCitizenPayload);
    expect(firstResult.is_duplicate).toBe(false);
    expect(firstResult.tracking_token).toBeDefined();

    // Replay with identical { source_type, source_reference }
    const replayResult = await service.ingestIncident(validCitizenPayload);
    expect(replayResult.is_duplicate).toBe(true);
    expect(replayResult.public_reference).toBe(firstResult.public_reference);
    expect(replayResult.incident._id).toBe(firstResult.incident._id);

    // Security Invariant: Plaintext tracking token is NEVER re-issued on replay
    expect(replayResult.tracking_token).toBeUndefined();

    // Verify only 1 incident exists in database
    const list = await repo.list();
    expect(list.total).toBe(1);
  });

  it("resolves concurrent duplicate submissions safely (Test 12)", async () => {
    // Run two identical ingestions concurrently
    const [resA, resB] = await Promise.all([
      service.ingestIncident(validCitizenPayload),
      service.ingestIncident(validCitizenPayload),
    ]);

    // One must be the original creation, the other must be the resolved idempotent replay
    const original = resA.is_duplicate ? resB : resA;
    const replay = resA.is_duplicate ? resA : resB;

    expect(original.is_duplicate).toBe(false);
    expect(replay.is_duplicate).toBe(true);
    expect(original.public_reference).toBe(replay.public_reference);

    const list = await repo.list();
    expect(list.total).toBe(1);
  });

  it("rejects invalid source_type (Test 3)", async () => {
    const invalid = { ...validCitizenPayload, source_type: "satellite_telemetry" };
    await expect(service.ingestIncident(invalid)).rejects.toThrow(/Invalid canonical incident schema/);
  });

  it("rejects invalid reported_at timestamp (Test 4)", async () => {
    const invalid = { ...validCitizenPayload, reported_at: "yesterday afternoon" };
    await expect(service.ingestIncident(invalid)).rejects.toThrow(/reported_at must be an ISO 8601 datetime/);
  });

  it("rejects missing source_reference (Test 5)", async () => {
    const invalid = { ...validCitizenPayload, source_reference: "" };
    await expect(service.ingestIncident(invalid)).rejects.toThrow(/source_reference must not be empty/);
  });

  it("rejects invalid coordinates out of geographic range (Test 6)", async () => {
    const invalid = {
      ...validCitizenPayload,
      location: { ...validCitizenPayload.location, latitude: 125.0 }, // lat > 90
    };
    await expect(service.ingestIncident(invalid)).rejects.toThrow();
  });

  it("rejects oversized evidence array exceeding maximum bounds (Test 7)", async () => {
    const oversizedEvidence = Array.from({ length: 30 }, (_, i) => ({
      type: "image" as const,
      url: `https://storage.umeed.local/photo_${i}.jpg`,
    }));
    const invalid = { ...validCitizenPayload, evidence: oversizedEvidence };
    await expect(service.ingestIncident(invalid)).rejects.toThrow(/Maximum of 25 evidence attachments/);
  });

  it("rejects excessively long description (Test 8)", async () => {
    const invalid = { ...validCitizenPayload, description: "x".repeat(6000) };
    await expect(service.ingestIncident(invalid)).rejects.toThrow(/description exceeds maximum length/);
  });

  it("flags proximity duplicate candidate while preserving both independent incidents (Tests 18, 19)", async () => {
    // 1. Ingest primary incident
    const first = await service.ingestIncident(validCitizenPayload);
    expect(first.is_suspected_duplicate).toBe(false);

    // 2. Ingest second incident from different citizen 150m away within same hour
    const secondPayload = {
      ...validCitizenPayload,
      source_reference: "citizen_ref_1000", // Distinct source reference
      description: "Another bystander reporting same injured canine on Outer Ring Road",
      location: {
        ...validCitizenPayload.location,
        latitude: 28.698,
        longitude: 77.136,
      },
    };

    const second = await service.ingestIncident(secondPayload);

    // Invariant: Flagged as suspected duplicate candidate
    expect(second.is_suspected_duplicate).toBe(true);
    expect(second.duplicate_candidates).toHaveLength(1);
    expect(second.duplicate_candidates[0].public_reference).toBe(first.public_reference);

    // Invariant: Both incidents are preserved in DB; neither was overwritten or deleted (Test 19)
    const list = await repo.list();
    expect(list.total).toBe(2);
    expect(list.incidents[0].status).toBe("REPORTED");
    expect(list.incidents[1].status).toBe("REPORTED");
  });
});
