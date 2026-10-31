import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/incidents/ingest/route";
import { setIncidentRepository } from "../repositories";
import { InMemoryIncidentRepository } from "../repositories/memory-incident.repository";

describe("POST /api/incidents/ingest API Route", () => {
  let memoryRepo: InMemoryIncidentRepository;

  beforeEach(() => {
    memoryRepo = new InMemoryIncidentRepository();
    setIncidentRepository(memoryRepo);
  });

  const validPayload = {
    schema_version: "1.0.0",
    source_type: "citizen_report",
    source_reference: "api_citizen_001",
    source_url: null,
    reported_at: "2026-10-31T15:00:00.000Z",
    incident_type: "injured_animal",
    subject_type: "animal",
    description: "Injured dog needing medical first aid",
    evidence: [],
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "Rohini Sector 14, Delhi",
      district: "North West Delhi",
      confidence: 0.95,
    },
    severity: { level: "high", confidence: 0.9, reasoning: [] },
    freshness: "current_confirmed_by_source",
    missing_information: [],
    requires_human_review: true,
  };

  it("returns 201 Created with tracking token on new citizen report (Tests 10, 14, 23)", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toMatch(/^\/api\/incidents\/UMD-/);

    const body = await response.json();
    expect(body.status).toBe("success");
    expect(body.data.public_reference).toMatch(/^UMD-/);
    expect(body.data.tracking_token).toMatch(/^trk_/);
    expect(body.data.is_duplicate).toBe(false);
  });

  it("returns 200 OK on idempotent retry without re-issuing tracking token (Test 11)", async () => {
    // First submission
    const req1 = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(201);

    // Duplicate retry
    const req2 = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);

    const body2 = await responseJson(res2);
    expect(body2.status).toBe("success");
    expect(body2.message).toContain("idempotent replay");
    expect(body2.data.is_duplicate).toBe(true);
    expect(body2.data.tracking_token).toBeUndefined(); // Never re-issued
  });

  it("returns 415 Unsupported Media Type if Content-Type is missing or not JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "plain text",
    });

    const response = await POST(request);
    expect(response.status).toBe(415);
  });

  it("returns 400 Bad Request on malformed JSON payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ malformed json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 Bad Request with field details on invalid schema", async () => {
    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_type: "invalid_source" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 401 Unauthorized for unauthenticated crawler submission (Test 22)", async () => {
    const crawlerPayload = {
      ...validPayload,
      source_type: "social_media_discovery",
      source_reference: "social_post_889",
    };

    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(crawlerPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 503 Service Unavailable when database connection fails (Test 13)", async () => {
    vi.spyOn(memoryRepo, "findBySource").mockResolvedValue(null);
    vi.spyOn(memoryRepo, "findNearbyCandidates").mockResolvedValue([]);
    vi.spyOn(memoryRepo, "create").mockRejectedValue(new Error("MongoDB client is unavailable"));

    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
  });
});

async function responseJson(response: Response) {
  return response.json();
}
