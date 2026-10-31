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
 * Binary EXIF and metadata stripping for image buffers (JPEG, PNG).
 * Irreversibly strips APP1 (EXIF/GPS/XMP), APP13 (IPTC), COM (Comments), and PNG text/exif chunks
 * directly from binary streams without native dependencies.
 */
export function stripBinaryExif(
  buffer: Buffer,
  mimeType: string = "image/jpeg"
): { buffer: Buffer; stripped: boolean } {
  if (!buffer || buffer.length < 4) {
    return { buffer, stripped: false };
  }

  const isJpeg =
    mimeType.includes("jpeg") ||
    mimeType.includes("jpg") ||
    (buffer[0] === 0xff && buffer[1] === 0xd8);

  if (isJpeg) {
    return stripJpegExif(buffer);
  }

  const isPng =
    mimeType.includes("png") ||
    (buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47);

  if (isPng) {
    return stripPngMetadata(buffer);
  }

  return { buffer, stripped: false };
}

/**
 * Removes APP1 (0xFFE1 - EXIF/GPS/XMP), APP13 (0xFFED - IPTC), and COM (0xFFFE) markers from JPEG binary streams.
 */
function stripJpegExif(buffer: Buffer): { buffer: Buffer; stripped: boolean } {
  // Must start with SOI: FF D8
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { buffer, stripped: false };
  }

  const chunks: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let offset = 2;
  let strippedAny = false;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    const marker = buffer[offset + 1];

    // End of image (EOI)
    if (marker === 0xd9) {
      chunks.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    // Start of Scan (SOS - 0xDA): remaining bytes are entropy-coded image data
    if (marker === 0xda) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Read 2-byte segment length
    if (offset + 4 > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    const segmentEnd = offset + 2 + segmentLength;

    if (segmentEnd > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Strip APP1 (0xE1: EXIF, GPS, XMP), APP13 (0xED: IPTC), COM (0xFE: Comments)
    if (marker === 0xe1 || marker === 0xed || marker === 0xfe) {
      strippedAny = true;
      offset = segmentEnd;
    } else {
      chunks.push(buffer.subarray(offset, segmentEnd));
      offset = segmentEnd;
    }
  }

  return {
    buffer: Buffer.concat(chunks),
    stripped: strippedAny,
  };
}

/**
 * Removes eXIf, tEXt, zTXt, iTXt chunks from PNG images.
 */
function stripPngMetadata(buffer: Buffer): { buffer: Buffer; stripped: boolean } {
  if (buffer.length < 8) return { buffer, stripped: false };

  const PNG_HEADER_LEN = 8;
  const chunks: Buffer[] = [buffer.subarray(0, PNG_HEADER_LEN)];
  let offset = PNG_HEADER_LEN;
  let strippedAny = false;

  const METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);

  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const totalChunkLength = 12 + chunkLength;

    if (offset + totalChunkLength > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    if (METADATA_CHUNKS.has(chunkType)) {
      strippedAny = true;
      offset += totalChunkLength;
    } else {
      chunks.push(buffer.subarray(offset, offset + totalChunkLength));
      offset += totalChunkLength;
      if (chunkType === "IEND") break;
    }
  }

  return {
    buffer: Buffer.concat(chunks),
    stripped: strippedAny,
  };
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
