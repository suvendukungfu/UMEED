# UMEED Incident Privacy, Evidence Preservation & Redaction Architecture

**Version**: 1.0.0  
**Status**: Production Standard (Phase 2.1)  
**Security Level**: High Assurance  

---

## 1. Executive Summary

Distress reports submitted to UMEED frequently involve vulnerable persons (e.g., homeless individuals, abandoned elderly, victims of neglect) or sensitive locations (e.g., animal distress in residential or private properties). Exposing raw telemetry, unredacted location coordinates, original media metadata, or private internal storage paths presents severe personal safety and privacy risks.

UMEED enforces an asymmetric privacy and evidence preservation model:

1. **Private Original Evidence Retention**: Raw evidence, full GPS coordinates, and investigator notes are retained in restricted, access-controlled storage for authenticated, background-checked coordinators and verified NGO responders.
2. **Sanitized Public Derivatives**: Public tracking endpoints and unauthenticated consumers receive sanitized data structures where exact coordinates are nullified, addresses are generalized, PII is scrubbed, and media URLs are routed through token-mediated preview endpoints with EXIF metadata stripped.

---

## 2. Privacy Boundaries & Data Segregation

```
+-----------------------------------------------------------------------------------+
|                              UNTRUSTED / PUBLIC ZONE                              |
|                                                                                   |
|  Citizen Reporter / Public Observer                                               |
|  - Holds: Public Reference (`UMD-XXXX-YYYY`) + Tracking Token (`trk_...`)          |
|  - Views: Sanitized Public Incident DTO                                           |
|    * Coordinates: `null`                                                          |
|    * Location Address: Generalized (District / City only, e.g. "Rohini, Delhi")   |
|    * Evidence: Proxied sanitized preview URLs (`/api/evidence/preview/...`)       |
|    * Metadata: Striped of device camera, EXIF tags, GPS tags                      |
|    * Internal Fields: Stripped (`tracking_token_hash`, `_id`, `mongo_keys`)       |
+-----------------------------------------+-----------------------------------------+
                                          |
                        Token Authentication & Redaction Boundary
                                          |
+-----------------------------------------v-----------------------------------------+
|                              TRUSTED / INTERNAL ZONE                              |
|                                                                                   |
|  Coordinator / Verified Responder                                                 |
|  - Holds: Authenticated Coordinator Session / Service Token                       |
|  - Views: Operational Incident Document                                            |
|    * Exact GPS Coordinates: `[longitude, latitude]` for responder routing         |
|    * Exact Door / Street Landmark: Full descriptive address                       |
|    * Original Media Evidence: Complete resolution in private cloud storage        |
|    * Duplicate Candidate Graph: Distances, candidate links, review history        |
|    * Cryptographic Hash: `tracking_token_hash` for verification audit             |
+-----------------------------------------------------------------------------------+
```

---

## 3. Location Blurring & Scrubbing Rules

### 3.1 Public Endpoint Nullification

When an incident is queried via `GET /api/incidents/:publicReference`:

- `location.latitude` is set to `null`.
- `location.longitude` is set to `null`.
- `location.confidence` is set to `0.0`.
- Detailed house/plot numbers and landmarks are redacted from `location.address`, leaving only district and broader municipal metadata.

### 3.2 Coordinate Privacy Matrix

| Field | Citizen / Public View | Coordinator / Dispatch View |
| --- | --- | --- |
| `location.latitude` | `null` | Exact (e.g. `28.697200`) |
| `location.longitude` | `null` | Exact (e.g. `77.135000`) |
| `location.address` | District / Area only | Exact Street Address & Landmark |
| `location.district` | Retained (e.g. "North West Delhi") | Retained |
| `description` | PII regex sanitized (phones/emails masked) | Full unredacted narrative |

---

## 4. Media Evidence Preservation & Binary EXIF Stripping

### 4.1 Storage Architecture

1. **Original Evidence Ingestion**:
   - Media uploaded during report intake is stored in private cloud storage buckets (e.g., S3 / GCS with private ACLs).
   - Raw storage keys (e.g., `s3://umeed-private-evidence/incidents/raw/848b61.../photo.jpg`) are **never** returned in API responses.
2. **Binary Buffer EXIF Stripping Pipeline (`stripBinaryExif`)**:
   - EXIF removal is **NOT** merely an API metadata filter; it is executed directly on the image binary bytes before public delivery:
     - **JPEG Files**: The binary stream parser walks markers from SOI (`0xFFD8`), selectively stripping APP1 (`0xFFE1` - EXIF/GPS/XMP), APP13 (`0xFFED` - IPTC), and COM (`0xFFFE` - Comments) markers while retaining image geometry and entropy-coded SOS data.
     - **PNG Files**: Filters out `eXIf`, `tEXt`, `zTXt`, and `iTXt` metadata chunks.
   - All GPS tags, hardware serials, timestamps, and device make/model identifiers are completely purged from the resulting derivative file.
3. **Evidence Preview Derivative Route**:
   - Public responses route media requests through:

     ```
     /api/evidence/preview/:publicReference/:index
     ```

   - Serves the binary derivative with strict privacy headers:
     - `Content-Type: image/jpeg`
     - `Cache-Control: private, no-transform, max-age=86400`
     - `X-Content-Type-Options: nosniff`
     - `X-Privacy-Sanitized: true`

---

## 5. PII Scrubbing in Free-Text Descriptions

Citizens often submit phone numbers, email addresses, or personal identity numbers in report descriptions. The UMEED privacy service automatically redacts common PII patterns in public responses:

- Indian mobile phone numbers (`+91` / `0` followed by 10 digits) are masked as `[REDACTED_PHONE]`.
- Email addresses are masked as `[REDACTED_EMAIL]`.
- Aadhaar / 12-digit national ID patterns are masked as `[REDACTED_ID]`.

Internal coordinator views preserve the original text to allow staff to contact callers or verify claims when appropriate.

---

## 6. Retention and Erasure Policy

1. **Unverified False Reports / Spam**: Incidents rejected during coordinator triage are archived after 30 days and purged after 90 days.
2. **Approved Assistance Cases**: Full case evidence is retained for the duration of the assistance lifecycle plus 180 days for audit and impact reporting, after which high-resolution media is purged and low-resolution thumbnails are archived.
3. **Cryptographic Erasure**: Deleting an incident record also permanently erases its `tracking_token_hash`, rendering any retained citizen tokens permanently invalid.
