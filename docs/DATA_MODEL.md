# UMEED Operational Data Model & Index Specification (Phase 2)

**Database**: MongoDB Atlas (v6.x / v7.x)  
**Schema Strategy**: Canonical Zod Validation + Strict MongoDB Indexes  
**Engine**: Node.js Driver (`mongodb@6.13.0`)  

---

## 1. Collections Architecture Overview

```
UMEED MongoDB Database (`umeed_db`)
├── incidents           # Intake collection for citizen reports and crawler discoveries
├── cases               # Active assistance coordination workflows (Post-Human Approval)
├── evidence            # Media provenance and metadata storage records
├── review_actions      # Immutable coordinator triage and review decisions
├── case_events         # Lifecycle state machine transition audit trail
└── ngo_matches         # Scored organization recommendations
```

---

## 2. Collection Schemas

### 2.1 `incidents` Collection

Stores raw submitted distress observations and automated crawler discoveries.

```typescript
interface IncidentDocument {
  _id: string;                                // UUID or MongoDB ObjectId string
  schema_version: "1.0.0";                    // Canonical contract version
  source_type: "citizen_report" | "social_media_discovery";
  source_reference: string;                   // Client idempotency key or social post ID
  source_url: string | null;                  // External link if discovered via social media
  reported_at: string;                        // ISO 8601 timestamp of observation
  incident_type: IncidentType;                // injured_animal, homeless_person, etc.
  subject_type: "person" | "animal";
  description: string;                        // Raw description (max 5000 chars)
  evidence: Array<{
    type: "image" | "video" | "audio" | "text";
    url: string;                              // Private object store or submitted URI
    timestamp?: string;
    metadata?: Record<string, unknown>;
  }>;
  location: {
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    district: string | null;
    confidence: number;                       // 0.0 to 1.0
    geo?: {                                   // GeoJSON Point for 2dsphere indexing
      type: "Point";
      coordinates: [number, number];          // [LONGITUDE, LATITUDE] strictly ordered
    } | null;
  };
  severity: {
    level: "low" | "medium" | "high" | "critical" | "unconfirmed";
    confidence: number;
    reasoning: string[];                      // Max 20 items
  };
  freshness: "current_confirmed_by_source" | "potentially_recent" | "old_or_reshared" | "unclear" | "unconfirmed";
  missing_information: string[];              // Max 20 items
  requires_human_review: boolean;             // True by default
  status: "REPORTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "DUPLICATE" | "UNVERIFIED";
  is_suspected_duplicate: boolean;            // Flagged non-destructively
  suspected_duplicate_ids: string[];          // Array of candidate public_reference IDs
  public_reference: string;                   // e.g. "UMD-7B29-4K12" (Indexed, unique)
  tracking_token_hash: string | null;         // SHA-256 hex digest of secret token
  created_at: string;                         // ISO 8601 insertion timestamp
  updated_at: string;                         // ISO 8601 update timestamp
}
```

---

### 2.2 `cases` Collection

Stores approved operational assistance workflows.  
> [!IMPORTANT]
> **Architectural Invariant**: A record in `cases` is **NEVER** created automatically upon ingestion. A Case exists only after an authorized coordinator verifies an incident and transitions it to `APPROVED`.

```typescript
interface CaseDocument {
  _id: string;                                // Case UUID
  incident_id: string;                        // Reference to parent Incident._id
  status: "ACTIVE" | "PENDING_ASSIGNMENT" | "RESOLVED" | "CLOSED";
  assigned_organisations: string[];           // Array of verified NGO IDs
  assistance_requirements: string[];          // e.g. ["animal_first_aid", "ambulance"]
  unresolved_requirements: string[];          // Items remaining for recursive cycles
  created_by: string;                         // Coordinator User ID
  created_at: string;
  updated_at: string;
}
```

---

### 2.3 `evidence` Collection

Stores media provenance and extraction metadata.

```typescript
interface EvidenceDocument {
  evidence_id: string;
  incident_id: string;                        // Reference to Incident._id
  evidence_type: "image" | "video" | "audio" | "text";
  storage_reference: string;                  // Protected object storage URI
  source_reference: string;
  captured_at?: string;
  submitted_at: string;
  extracted_by?: "citizen_upload" | "discovery_crawler" | "gemini_multimodal";
  extraction_confidence?: number;
  provenance: Record<string, unknown>;        // EXIF data, client device info, model metadata
  created_at: string;
}
```

---

### 2.4 `review_actions` Collection

Stores human coordinator triage decisions.

```typescript
interface ReviewActionDocument {
  _id: string;
  incident_id: string;
  reviewer_id: string;                        // Staff ID
  decision: "APPROVE" | "REJECT" | "MARK_DUPLICATE" | "REQUEST_INFO";
  reason: string;                             // Justification text
  timestamp: string;
  evidence_references?: string[];
}
```

---

## 3. Index Design & Specifications

All indexes are created idempotently via `MongoIncidentRepository.initIndexes()`:

| Collection | Index Name | Key Definition | Type | Invariant & Operational Purpose |
| --- | --- | --- | --- | --- |
| `incidents` | `idx_source_idempotency` | `{ source_type: 1, source_reference: 1 }` | **Unique** | Prevents duplicate ingestions across network retries and webhook resends. |
| `incidents` | `idx_location_geo_2dsphere` | `{ "location.geo": "2dsphere" }` | **2dsphere (Sparse)** | Geospatial proximity queries ($near, $geoWithin) for duplicate candidate detection. |
| `incidents` | `idx_status_created` | `{ status: 1, created_at: -1 }` | Compound | Fast filtering of new `REPORTED` incidents in coordinator queue sorted by arrival. |
| `incidents` | `idx_type_reported` | `{ incident_type: 1, reported_at: -1 }` | Compound | Filtering by assistance category. |
| `incidents` | `idx_public_reference_unique` | `{ public_reference: 1 }` | **Unique** | O(1) lookup for public tracking codes (`UMD-XXXX-YYYY`). |
| `incidents` | `idx_tracking_token_hash` | `{ tracking_token_hash: 1 }` | Sparse | Secure credential verification using SHA-256 hash. |

### GeoJSON [Longitude, Latitude] Coordinate Rule

MongoDB strictly mandates that 2dsphere coordinates be stored in **[longitude, latitude]** order:

```json
{
  "location": {
    "geo": {
      "type": "Point",
      "coordinates": [77.1350, 28.6972] // [Longitude, Latitude]
    }
  }
}
```

*Valid bounds*: Longitude between `-180` and `180`; Latitude between `-90` and `90`.

---

## 4. Privacy Boundaries & Public Redacted DTO

The raw operational MongoDB document (`IncidentDocument`) contains high-privilege information that must never be exposed publicly.

### Redacted Public View (`SanitizedPublicIncident`)

```typescript
interface SanitizedPublicIncident {
  public_reference: string;                   // UMD-XXXX-YYYY
  reported_at: string;                        // ISO 8601
  incident_type: IncidentType;
  subject_type: "person" | "animal";
  description: string;                        // PII patterns masked ([REDACTED_PHONE], etc.)
  status: IncidentStatus;
  location: {
    latitude: null;                           // Nullified for public privacy
    longitude: null;                          // Nullified for public privacy
    address: string | null;                   // District/City only
    district: string | null;
    confidence: 0;
  };
  evidence: Array<{
    type: string;
    url: string;                              // Proxied preview URL (/api/evidence/preview/...)
    metadata: Record<string, unknown>;        // EXIF & hardware tags stripped
  }>;
  is_suspected_duplicate: boolean;
  created_at: string;
  // OMITTED: _id, tracking_token_hash, internal notes, coordinator review history
}
```
