import { describe, it, expect } from "vitest";
import { CanonicalIncidentSchema } from "./incident.js";

describe("CanonicalIncidentSchema", () => {
  it("validates a compliant citizen report", () => {
    const payload = {
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "citizen_rep_101",
      source_url: null,
      reported_at: "2026-10-31T12:00:00.000Z",
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Injured stray dog near Rohini Sector 14 market",
      evidence: [
        {
          type: "image",
          url: "https://storage.carelink.org/evidence/dog_101.jpg",
          timestamp: "2026-10-31T11:55:00.000Z",
        },
      ],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Rohini Sector 14, Delhi",
        district: "North West Delhi",
        confidence: 0.95,
      },
      severity: {
        level: "high",
        confidence: 0.85,
        reasoning: ["Animal cannot walk on hind leg", "Bleeding observed"],
      },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: true,
    };

    const parsed = CanonicalIncidentSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.incident_type).toBe("injured_animal");
      expect(parsed.data.requires_human_review).toBe(true);
    }
  });

  it("validates a social media discovery payload", () => {
    const payload = {
      source_type: "social_media_discovery",
      source_reference: "social_post_8829",
      source_url: "https://example.com/posts/8829",
      reported_at: "2026-10-31T12:15:00.000Z",
      incident_type: "abandoned_elderly_person",
      subject_type: "person",
      description: "Disoriented elderly person sitting on pavement in Lajpat Nagar",
    };

    const parsed = CanonicalIncidentSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schema_version).toBe("1.0.0");
      expect(parsed.data.severity.level).toBe("unconfirmed");
      expect(parsed.data.location.confidence).toBe(0.0);
      expect(parsed.data.requires_human_review).toBe(true);
    }
  });

  it("rejects payload with invalid source_type", () => {
    const payload = {
      source_type: "unauthorized_crawler",
      source_reference: "ref_1",
      reported_at: "2026-10-31T12:00:00.000Z",
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "test",
    };

    const parsed = CanonicalIncidentSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects payload missing reported_at ISO format", () => {
    const payload = {
      source_type: "citizen_report",
      source_reference: "ref_1",
      reported_at: "not-a-date",
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "test",
    };

    const parsed = CanonicalIncidentSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("enforces maximum bounds on arrays preventing resource exhaustion (DoS)", () => {
    const oversizedEvidence = Array.from({ length: 30 }, (_, i) => ({
      type: "image" as const,
      url: `https://example.com/img_${i}.jpg`,
    }));

    const payload = {
      source_type: "citizen_report",
      source_reference: "ref_oversized",
      reported_at: "2026-10-31T12:00:00.000Z",
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "test",
      evidence: oversizedEvidence,
    };

    const parsed = CanonicalIncidentSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain("Maximum of 25");
    }
  });

  it("rejects invalid latitude and longitude out of geographic bounds", () => {
    const payload = {
      source_type: "citizen_report",
      source_reference: "ref_geo",
      reported_at: "2026-10-31T12:00:00.000Z",
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "test",
      location: {
        latitude: 195.0, // Invalid > 90
        longitude: 77.1025,
        confidence: 0.8,
      },
    };

    const parsed = CanonicalIncidentSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});
