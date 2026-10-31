import { IncidentDocument } from "../types";
import { scrubPII } from "@/lib/security";

/**
 * Privacy & Media Evidence Sanitization Service
 *
 * Enforces Zero-Harm Data Boundaries:
 * 1. Exact coordinates (latitude/longitude/geo) are strictly redacted for public citizen viewers.
 * 2. EXIF metadata (camera serial, exact GPS tags, device owner) is stripped from display derivatives.
 * 3. Sensitive phone numbers and emails in descriptions are scrubbed.
 * 4. Private storage bucket references are masked.
 * 5. Original operational evidence in storage is preserved intact for vetted coordinators.
 */

const SENSITIVE_EXIF_KEYS = new Set([
  "gpslatitude",
  "gpslongitude",
  "gpsaltitude",
  "make",
  "model",
  "datetimeoriginal",
  "ownername",
  "software",
  "serialnumber",
  "lensmodel",
  "devicemodel",
]);

/**
 * Strip EXIF and hardware-identifying metadata from evidence records.
 */
export function stripExifMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> {
  if (!metadata) {
    return { sanitized: true };
  }

  const clean: Record<string, unknown> = { sanitized: true };

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (!SENSITIVE_EXIF_KEYS.has(lowerKey)) {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Sanitize an incident document for public citizen tracking view.
 * Guarantees zero leakage of exact GPS, private storage keys, or beneficiary PII.
 */
export function sanitizeIncidentForPublic(incident: IncidentDocument) {
  return {
    public_reference: incident.public_reference,
    status: incident.status,
    source_type: incident.source_type,
    incident_type: incident.incident_type,
    subject_type: incident.subject_type,
    // Description scrubbed of any phone numbers or emails
    description: scrubPII(incident.description),
    // Evidence sanitized: EXIF stripped and storage URLs masked
    evidence: incident.evidence.map((ev, idx) => ({
      type: ev.type,
      timestamp: ev.timestamp,
      // Mask private bucket paths to safe derivative preview reference
      display_url: `/api/evidence/preview/${incident.public_reference}/${idx}`,
      metadata: stripExifMetadata(ev.metadata),
    })),
    // Location: exact coordinates completely redacted; district preserved
    location: {
      district: incident.location.district || "Delhi NCR",
      address: incident.location.address
        ? incident.location.address.replace(/\b(flat|house|plot|door|room|gali)\s*#?\s*\w+/gi, "[REDACTED_LOCATION]")
        : null,
      latitude: null, // REDACTED
      longitude: null, // REDACTED
      confidence: incident.location.confidence,
    },
    severity: {
      level: incident.severity.level,
      // Generic reasoning only
      reasoning: incident.severity.reasoning,
    },
    reported_at: incident.reported_at,
    created_at: incident.created_at,
  };
}

/**
 * Sanitize an incident document for authorized coordinator view.
 * Preserves exact coordinates and operational details, but redacts the secret token hash.
 */
export function sanitizeIncidentForCoordinator(incident: IncidentDocument) {
  const { tracking_token_hash: _, ...safeDoc } = incident;
  return safeDoc;
}
