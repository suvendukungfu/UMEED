import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getIncidentQueue } from "@/app/api/incidents/route";
import { GET as getIncidentByReference } from "@/app/api/incidents/[publicReference]/route";
import { POST as ingestIncident } from "@/app/api/incidents/ingest/route";
import { setIncidentRepository } from "../repositories";
import { InMemoryIncidentRepository } from "../repositories/memory-incident.repository";
import { trackingRateLimiter, ingestionRateLimiter } from "@/lib/security/rate-limit";
import { stripExifMetadata } from "../services/privacy.service";

describe("Phase 2.1 Security & Authorization Guardrails", () => {
  let memoryRepo: InMemoryIncidentRepository;

  beforeEach(() => {
    memoryRepo = new InMemoryIncidentRepository();
    setIncidentRepository(memoryRepo);
    trackingRateLimiter.reset();
    ingestionRateLimiter.reset();
  });

  const sampleCitizenIncident = {
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: "sec_test_001",
    source_url: null,
    reported_at: "2026-10-31T15:00:00.000Z",
    incident_type: "injured_animal",
    subject_type: "animal",
    description: "Injured dog. Bystander contact: +91 9876543210 or help@bystander.org",
    evidence: [
      {
        type: "image",
        url: "https://private-bucket.s3.aws.com/raw/secret_key_101.jpg",
        timestamp: "2026-10-31T14:55:00.000Z",
        metadata: {
          Camera: "iPhone 15 Pro",
          GPSLatitude: 28.7041,
          GPSLongitude: 77.1025,
          OwnerName: "Reporter John",
          ShutterSpeed: "1/500s",
        },
      },
    ],
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "House #42, Gali 3, Rohini Sector 14, Delhi",
      district: "North West Delhi",
      confidence: 0.95,
    },
    severity: { level: "high", confidence: 0.9, reasoning: ["Bleeding observed"] },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: true,
  };

  it("rejects unauthenticated coordinator requests with 401 Unauthorized", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents");
    const response = await getIncidentQueue(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toContain("Coordinator authorization required");
  });

  it("permits authenticated coordinator requests with valid X-Coordinator-Key", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents", {
      headers: {
        "x-coordinator-key": "umeed-coordinator-dev-key",
      },
    });
    const response = await getIncidentQueue(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("success");
    expect(Array.isArray(body.data.incidents)).toBe(true);
  });

  it("rejects public reference retrieval when confidential tracking token is missing", async () => {
    // 1. Ingest incident to get public reference
    const ingestReq = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCitizenIncident),
    });
    const ingestRes = await ingestIncident(ingestReq);
    const ingestBody = await ingestRes.json();
    const publicRef = ingestBody.data.public_reference;

    // 2. Attempt retrieval without tracking token
    const getReq = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`);
    const getRes = await getIncidentByReference(getReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });

    expect(getRes.status).toBe(401);
    const body = await getRes.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toContain("Confidential tracking credential required");
  });

  it("rejects tracking tokens passed in query strings to prevent URL leakage", async () => {
    // Ingest incident
    const ingestReq = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCitizenIncident),
    });
    const ingestRes = await ingestIncident(ingestReq);
    const ingestBody = await ingestRes.json();
    const publicRef = ingestBody.data.public_reference;
    const token = ingestBody.data.tracking_token;

    // Pass token in URL query string (must be rejected)
    const getReq = new NextRequest(
      `http://localhost:3000/api/incidents/${publicRef}?token=${token}`
    );
    const getRes = await getIncidentByReference(getReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });

    expect(getRes.status).toBe(401);
  });

  it("authenticates citizen with correct tracking token and returns sanitized public view", async () => {
    // Ingest incident
    const ingestReq = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCitizenIncident),
    });
    const ingestRes = await ingestIncident(ingestReq);
    const ingestBody = await ingestRes.json();
    const publicRef = ingestBody.data.public_reference;
    const token = ingestBody.data.tracking_token;

    // Retrieve with valid Bearer token
    const getReq = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const getRes = await getIncidentByReference(getReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });

    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.status).toBe("success");
    expect(body.data.public_reference).toBe(publicRef);

    // Privacy Verification 1: Exact coordinates are completely redacted
    expect(body.data.location.latitude).toBeNull();
    expect(body.data.location.longitude).toBeNull();
    expect(body.data.location.district).toBe("North West Delhi");

    // Privacy Verification 2: Specific house/flat number is redacted
    expect(body.data.location.address).not.toContain("House #42");

    // Privacy Verification 3: Phone number and email are scrubbed from description
    expect(body.data.description).toContain("[REDACTED_PHONE]");
    expect(body.data.description).toContain("[REDACTED_EMAIL]");
    expect(body.data.description).not.toContain("9876543210");

    // Privacy Verification 4: Private storage URL masked to display derivative
    expect(body.data.evidence[0].display_url).toMatch(/^\/api\/evidence\/preview\//);
    expect(body.data.evidence[0].display_url).not.toContain("private-bucket.s3.aws.com");

    // Privacy Verification 5: EXIF metadata stripped
    expect(body.data.evidence[0].metadata.GPSLatitude).toBeUndefined();
    expect(body.data.evidence[0].metadata.OwnerName).toBeUndefined();
    expect(body.data.evidence[0].metadata.sanitized).toBe(true);
  });

  it("returns generic 404 on incorrect tracking token without revealing reference existence", async () => {
    // Ingest incident
    const ingestReq = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCitizenIncident),
    });
    const ingestRes = await ingestIncident(ingestReq);
    const ingestBody = await ingestRes.json();
    const publicRef = ingestBody.data.public_reference;

    // Attempt retrieval with wrong token
    const getReq = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`, {
      headers: {
        "x-tracking-token": "trk_wrong_token_1234567890",
      },
    });
    const getRes = await getIncidentByReference(getReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });

    expect(getRes.status).toBe(404);
    const body = await getRes.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("Incident not found or invalid tracking credential");
  });

  it("enforces rate limiting on excessive tracking verification attempts (Brute-Force Defense)", async () => {
    const publicRef = "UMD-9999-9999";

    // Perform 10 failed requests (allowed threshold is 10)
    for (let i = 0; i < 10; i++) {
      const req = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`, {
        headers: {
          "x-tracking-token": `trk_brute_force_${i}`,
          "x-forwarded-for": "198.51.100.42",
        },
      });
      await getIncidentByReference(req, {
        params: Promise.resolve({ publicReference: publicRef }),
      });
    }

    // 11th request must receive 429 Too Many Requests
    const blockedReq = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`, {
      headers: {
        "x-tracking-token": "trk_brute_force_11",
        "x-forwarded-for": "198.51.100.42",
      },
    });
    const blockedRes = await getIncidentByReference(blockedReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get("Retry-After")).toBeDefined();
    const body = await blockedRes.json();
    expect(body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("strips hardware and GPS EXIF metadata from evidence records", () => {
    const rawMetadata = {
      Make: "Apple",
      Model: "iPhone 15",
      GPSLatitude: 28.7041,
      GPSLongitude: 77.1025,
      OwnerName: "Alice",
      ShutterSpeed: "1/500",
      FilterUsed: "Vivid",
    };

    const clean = stripExifMetadata(rawMetadata);

    expect(clean.Make).toBeUndefined();
    expect(clean.Model).toBeUndefined();
    expect(clean.GPSLatitude).toBeUndefined();
    expect(clean.GPSLongitude).toBeUndefined();
    expect(clean.OwnerName).toBeUndefined();
    expect(clean.FilterUsed).toBe("Vivid");
    expect(clean.sanitized).toBe(true);
  });
});
