import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resetEnvCache } from "@/lib/config/env";
import {
  verifyCoordinatorAuth,
  verifyCoordinatorSession,
  extractTrackingToken,
  extractClientIp,
} from "@/lib/security/authorization";
import { validateCrawlerAuthorization } from "../services/auth.service";
import {
  getIncidentRepository,
  setIncidentRepository,
  InMemoryIncidentRepository,
} from "../repositories";
import {
  stripBinaryExif,
  sanitizeIncidentForPublic,
} from "../services/privacy.service";
import { POST as ingestIncident } from "@/app/api/incidents/ingest/route";
import { GET as getIncidentByReference } from "@/app/api/incidents/[publicReference]/route";
import { IncidentDocument } from "../types";
import { getNotificationAdapter } from "@/features/notifications/adapters";
import { GeminiTriageService } from "@/lib/ai/gemini/triage.service";

describe("Phase 2.2 Production Safety & Configuration Boundaries", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    setIncidentRepository(null);
    resetEnvCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setIncidentRepository(null);
    resetEnvCache();
  });

  // ---------------------------------------------------------------------------
  // 1. Environment Security & Credentials
  // ---------------------------------------------------------------------------
  it("production rejects default development coordinator key", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.COORDINATOR_API_KEY = "umeed-coordinator-dev-key";
    resetEnvCache();

    const request = new NextRequest("http://localhost:3000/api/incidents", {
      headers: { "x-coordinator-key": "umeed-coordinator-dev-key" },
    });

    const result = verifyCoordinatorAuth(request);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("Production coordinator secret is not configured or uses insecure defaults");
  });

  it("production permits coordinator when valid strong production secret is supplied", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.COORDINATOR_API_KEY = "strong-prod-coordinator-secret-token-998811";
    resetEnvCache();

    const request = new NextRequest("http://localhost:3000/api/incidents", {
      headers: { "x-coordinator-key": "strong-prod-coordinator-secret-token-998811" },
    });

    const result = verifyCoordinatorAuth(request);
    expect(result.authorized).toBe(true);
  });

  it("production rejects default development crawler key for social discovery", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.CRAWLER_API_KEY = "umeed-crawler-dev-key";
    resetEnvCache();

    const result = validateCrawlerAuthorization({
      "x-crawler-api-key": "umeed-crawler-dev-key",
    });

    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("Production crawler secret is not configured or uses insecure defaults");
  });

  // ---------------------------------------------------------------------------
  // 2. Database Fail-Closed Behavior
  // ---------------------------------------------------------------------------
  it("production refuses in-memory storage fallback and throws fail-closed error", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.MONGODB_URI;
    resetEnvCache();
    setIncidentRepository(null);

    expect(() => getIncidentRepository()).toThrow(
      /Fallback to in-memory repository is strictly prohibited in production/
    );
  });

  it("development safely permits in-memory mode with ephemeral warning", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.MONGODB_URI;
    resetEnvCache();
    setIncidentRepository(null);

    const repo = getIncidentRepository();
    expect(repo).toBeInstanceOf(InMemoryIncidentRepository);
  });

  it("fails closed with 503 and no false success when database persistence is unavailable in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.MONGODB_URI;
    resetEnvCache();
    setIncidentRepository(null);

    const payload = {
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "prod_fail_test_001",
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Injured stray dog requiring rescue",
      evidence: [],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Rohini",
        district: "North West Delhi",
        confidence: 0.9,
      },
    };

    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await ingestIncident(request);
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(body.error.message).toContain("Database service is unavailable. The distress report could not be permanently persisted.");
    // Invariant: No false success or tracking token returned
    expect(body.data).toBeUndefined();
    expect(body.tracking_token).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 3. Image Privacy & Binary EXIF Stripping
  // ---------------------------------------------------------------------------
  it("irreversibly strips EXIF and GPS markers from actual binary JPEG files", () => {
    // Construct synthetic valid JPEG with SOI, APP1 EXIF segment containing GPS tags, SOS, and EOI
    const gpsData = Buffer.from("Exif\0\0GPSLatitude:28.704100N,GPSLongitude:77.102500E,Camera:AlphaX9000");
    const app1Length = gpsData.length + 2; // 2 bytes for length itself

    const app1Header = Buffer.alloc(4);
    app1Header[0] = 0xff;
    app1Header[1] = 0xe1; // APP1 marker
    app1Header.writeUInt16BE(app1Length, 2);

    const rawJpegWithGps = Buffer.concat([
      Buffer.from([0xff, 0xd8]), // SOI
      app1Header,
      gpsData,
      Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]), // SOS
      Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]), // Entropy image data
      Buffer.from([0xff, 0xd9]), // EOI
    ]);

    // Verify raw input buffer contains GPS metadata
    expect(rawJpegWithGps.includes(Buffer.from("GPSLatitude"))).toBe(true);

    // Run binary EXIF stripping
    const { buffer: cleanJpeg, stripped } = stripBinaryExif(rawJpegWithGps, "image/jpeg");

    expect(stripped).toBe(true);
    expect(cleanJpeg.length).toBeLessThan(rawJpegWithGps.length);

    // Verify EXIF string and GPS tags are completely absent from derivative
    expect(cleanJpeg.includes(Buffer.from("GPSLatitude"))).toBe(false);
    expect(cleanJpeg.includes(Buffer.from("AlphaX9000"))).toBe(false);
    expect(cleanJpeg.includes(Buffer.from("Exif"))).toBe(false);

    // Verify JPEG structure remains valid (SOI 0xFFD8, EOI 0xFFD9)
    expect(cleanJpeg[0]).toBe(0xff);
    expect(cleanJpeg[1]).toBe(0xd8);
    expect(cleanJpeg[cleanJpeg.length - 2]).toBe(0xff);
    expect(cleanJpeg[cleanJpeg.length - 1]).toBe(0xd9);
  });

  // ---------------------------------------------------------------------------
  // 4. Exact Location Redaction & PII Masking
  // ---------------------------------------------------------------------------
  it("nullifies exact coordinates and scrubs street-level house numbers in public view", () => {
    const sampleIncident: IncidentDocument = {
      _id: "test-redact-001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "ref-redact-001",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "homeless_person",
      subject_type: "person",
      description: "Call +91 9876543210 or email help@shelter.org for patient near Gali 4",
      evidence: [
        {
          type: "image",
          url: "s3://private-evidence-vault/incidents/raw/photo1.jpg",
          metadata: { GPSLatitude: 28.65, CameraModel: "PhoneX" },
        },
      ],
      location: {
        latitude: 28.654321,
        longitude: 77.234567,
        address: "House 42B, Sector 3, Rohini",
        district: "North West Delhi",
        confidence: 0.95,
      },
      severity: { level: "critical", confidence: 0.9, reasoning: [] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-REDACT-0001",
      tracking_token_hash: "hash001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const publicView = sanitizeIncidentForPublic(sampleIncident);

    // Coordinates strictly nullified
    expect(publicView.location.latitude).toBeNull();
    expect(publicView.location.longitude).toBeNull();
    expect(publicView.location.confidence).toBe(0.95);
    expect(publicView.location.district).toBe("North West Delhi");

    // Address landmark sanitized
    expect(publicView.location.address).toContain("[REDACTED_LOCATION]");
    expect(publicView.location.address).not.toContain("House 42B");

    // PII scrubbed from description
    expect(publicView.description).toContain("[REDACTED_PHONE]");
    expect(publicView.description).toContain("[REDACTED_EMAIL]");
    expect(publicView.description).not.toContain("9876543210");
    expect(publicView.description).not.toContain("help@shelter.org");

    // Private storage URL replaced with proxy derivative endpoint
    expect(publicView.evidence[0].display_url).toBe("/api/evidence/preview/UMD-REDACT-0001/0");
    expect((publicView.evidence[0] as unknown as { url?: string }).url).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 5. Citizen & Reverse-Proxy Rate Limiting / Token Checks
  // ---------------------------------------------------------------------------
  it("rejects tracking tokens passed in query strings and accepts valid header tokens", () => {
    // Query string token should be rejected
    const queryRequest = new NextRequest("http://localhost:3000/api/incidents/UMD-001?token=trk_secret123");
    expect(extractTrackingToken(queryRequest)).toBeNull();

    // Custom header token should be accepted
    const customHeaderRequest = new NextRequest("http://localhost:3000/api/incidents/UMD-001", {
      headers: { "x-tracking-token": "trk_valid_token_123" },
    });
    expect(extractTrackingToken(customHeaderRequest)).toBe("trk_valid_token_123");

    // Authorization Bearer header should be accepted
    const authHeaderRequest = new NextRequest("http://localhost:3000/api/incidents/UMD-001", {
      headers: { authorization: "Bearer trk_bearer_token_456" },
    });
    expect(extractTrackingToken(authHeaderRequest)).toBe("trk_bearer_token_456");
  });

  it("extractClientIp validates IP syntax and prioritizes edge proxy headers", () => {
    // Cloudflare connecting IP takes precedence
    const cfRequest = new NextRequest("http://localhost:3000/api/health", {
      headers: {
        "cf-connecting-ip": "203.0.113.195",
        "x-forwarded-for": "198.51.100.1, 10.0.0.1",
      },
    });
    expect(extractClientIp(cfRequest)).toBe("203.0.113.195");

    // Rejects header injection with non-IP string
    const maliciousRequest = new NextRequest("http://localhost:3000/api/health", {
      headers: {
        "x-forwarded-for": "malicious_script_injection_not_an_ip",
      },
    });
    expect(extractClientIp(maliciousRequest)).toBe("127.0.0.1");
  });

  // ---------------------------------------------------------------------------
  // 6. Phase 10 Production Invariants & Regression Suite
  // ---------------------------------------------------------------------------
  it("Phase 10.1: Production refuses in-memory storage even if ALLOW_INMEMORY_FALLBACK is set", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ALLOW_INMEMORY_FALLBACK = "true";
    delete process.env.MONGODB_URI;
    resetEnvCache();
    setIncidentRepository(null);

    expect(() => getIncidentRepository()).toThrow(
      /Fallback to in-memory repository is strictly prohibited in production/
    );
  });

  it("Phase 10.2: Production requires MongoDB Atlas connection configuration", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.MONGODB_URI;
    resetEnvCache();
    setIncidentRepository(null);

    expect(() => getIncidentRepository()).toThrow(
      /Production environment requires a configured MongoDB Atlas cluster \(MONGODB_URI\)/
    );
  });

  it("Phase 10.3: Database failure returns 503 for writes without issuing receipts", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.MONGODB_URI;
    resetEnvCache();
    setIncidentRepository(null);

    const payload = {
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "db_fail_test_999",
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Severe distress needing rescue",
      evidence: [],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Rohini Sector 10",
        district: "North West Delhi",
        confidence: 0.9,
      },
    };

    const request = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await ingestIncident(request);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(body.data).toBeUndefined();
    expect(body.tracking_token).toBeUndefined();
  });

  it("Phase 10.4: A committed record survives independent repository invocations", async () => {
    const memoryRepo = new InMemoryIncidentRepository();
    setIncidentRepository(memoryRepo);

    const payload = {
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "commit_test_001",
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Injured bird",
      evidence: [],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Rohini",
        district: "North West Delhi",
        confidence: 0.9,
      },
    };

    // First invocation: Ingestion
    const ingestReq = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const ingestRes = await ingestIncident(ingestReq);
    expect(ingestRes.status).toBe(201);
    const ingestBody = await ingestRes.json();
    const publicRef = ingestBody.data.public_reference;
    const token = ingestBody.data.tracking_token;

    // Second invocation: Independent lookup
    const lookupReq = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`, {
      headers: { "x-tracking-token": token },
    });
    const lookupRes = await getIncidentByReference(lookupReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });

    expect(lookupRes.status).toBe(200);
    const lookupBody = await lookupRes.json();
    expect(lookupBody.data.public_reference).toBe(publicRef);
  });

  it("Phase 10.5: Public tracking requires an authorized token", async () => {
    const memoryRepo = new InMemoryIncidentRepository();
    setIncidentRepository(memoryRepo);

    const payload = {
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "token_auth_test_001",
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Injured puppy",
      evidence: [],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Rohini",
        district: "North West Delhi",
        confidence: 0.9,
      },
    };

    const ingestReq = new NextRequest("http://localhost:3000/api/incidents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const ingestRes = await ingestIncident(ingestReq);
    const ingestBody = await ingestRes.json();
    const publicRef = ingestBody.data.public_reference;

    // Unauthorized without token
    const unauthorizedReq = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`);
    const unauthorizedRes = await getIncidentByReference(unauthorizedReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });
    expect(unauthorizedRes.status).toBe(401);

    // Rejects invalid token with 404 (preventing oracle probing)
    const invalidReq = new NextRequest(`http://localhost:3000/api/incidents/${publicRef}`, {
      headers: { "x-tracking-token": "trk_completely_wrong_token" },
    });
    const invalidRes = await getIncidentByReference(invalidReq, {
      params: Promise.resolve({ publicReference: publicRef }),
    });
    expect(invalidRes.status).toBe(404);
  });

  it("Phase 10.6: Coordinator authorization rejects missing or invalid credentials", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.COORDINATOR_API_KEY = "prod-strong-coordinator-secret-key-123456";
    resetEnvCache();

    // 1. Missing header
    const noHeaderReq = new NextRequest("http://localhost:3000/api/incidents");
    const noHeaderRes = verifyCoordinatorAuth(noHeaderReq);
    expect(noHeaderRes.authorized).toBe(false);

    // 2. Invalid secret
    const badKeyReq = new NextRequest("http://localhost:3000/api/incidents", {
      headers: { "x-coordinator-key": "wrong-secret-token" },
    });
    const badKeyRes = verifyCoordinatorAuth(badKeyReq);
    expect(badKeyRes.authorized).toBe(false);

    // 3. Valid secret
    const goodKeyReq = new NextRequest("http://localhost:3000/api/incidents", {
      headers: { "x-coordinator-key": "prod-strong-coordinator-secret-key-123456" },
    });
    const goodKeyRes = verifyCoordinatorAuth(goodKeyReq);
    expect(goodKeyRes.authorized).toBe(true);
    expect(goodKeyRes.actorType).toBe("service_integration");
  });

  it("Phase 10.7: The application never reports fake notification delivery in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.NOTIFICATION_WEBHOOK_URL;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.SENDGRID_API_KEY;
    resetEnvCache();

    const adapter = getNotificationAdapter();
    expect(adapter.isMock()).toBe(false);

    const result = await adapter.send({
      notification_id: "notif_prod_001",
      case_id: "case_prod_001",
      assignment_id: "asgn_prod_001",
      organisation_id: "org_prod_001",
      channel: "sms",
      recipient_address: "+919999999999",
      subject: "Test Alert",
      body: "Test message",
      status: "QUEUED",
      created_at: new Date().toISOString(),
      delivered_at: null,
      error_message: null,
      is_mock: false,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("NOT_CONFIGURED");
    expect(result.delivered_at).toBeUndefined();
  });

  it("Phase 10.8: AI fallback never invents an AI result when Gemini is unconfigured", async () => {
    delete process.env.GEMINI_API_KEY;
    resetEnvCache();

    const triageService = new GeminiTriageService();
    const sampleDoc: IncidentDocument = {
      _id: "test-ai-001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "ai_test_001",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Injured stray cat",
      evidence: [],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Rohini",
        district: "North West Delhi",
        confidence: 0.9,
      },
      severity: { level: "high", confidence: 0.8, reasoning: [] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-AI-0001",
      tracking_token_hash: "hash_ai_001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const analysis = await triageService.triageIncident(sampleDoc);

    // Invariant: Never invents an AI result; flags for manual review with 0 confidence
    expect(analysis.analysis_status).toBe("MANUAL_REVIEW_REQUIRED");
    expect(analysis.triage_classification).toBe("MANUAL_FALLBACK");
    expect(analysis.confidence).toBe(0.0);
    expect(analysis.urgency.requires_human_review).toBe(true);
    expect(analysis.raw_response_summary).toContain("GEMINI_UNCONFIGURED");
  });
});
