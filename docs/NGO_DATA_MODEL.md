# UMEED NGO Intelligence Registry Data Model & Index Specification (Phase 4)

**Database**: MongoDB Atlas (`umeed_db`)  
**Collection**: `ngos`  
**Schema Strategy**: Canonical Zod Validation (`@umeed/contracts`) + Strict MongoDB Indexes  
**Engine**: Node.js Driver (`mongodb@6.13.0`)  

---

## 1. Overview

The NGO Intelligence Registry provides a vetted, structured repository of humanitarian and animal welfare organizations across Delhi NCR. It serves as the single source of truth for the Explainable Matching Engine, maintaining strict privacy boundaries between public directory viewers and credentialed coordinators.

---

## 2. Collection Schema: `ngos`

```typescript
interface NGODocument {
  _id: string;                               // MongoDB ObjectId string
  ngo_id: string;                            // Unique business identifier (e.g. "ngo_del_001")
  organisation_name: string;                 // Official registered name (1-200 chars)
  alternate_names: string[];                 // Common abbreviations or aliases (e.g. ["DAWST"])
  registration_number: string | null;        // Legal registration ID (e.g. Society/Trust/DARPAN ID)
  registration_authority: string | null;     // Issuing authority (e.g. "Registrar of Societies, Delhi")
  registration_date: string | null;          // ISO 8601 registration date
  organisation_type: OrganisationType;       // "trust" | "society" | "section_8_company" | "unregistered_collective" | "government_nodal_agency" | "volunteer_group" | "other"

  // Service taxonomy & subject specialisation
  service_categories: IncidentType[];        // Array of matching IncidentType enums
  supported_subject_types: Array<"person" | "animal">;
  assistance_capabilities: string[];         // Granular capabilities (e.g. ["animal_ambulance", "surgical_ward"])

  // Operational coverage & geospatial anchor
  operational_districts: string[];           // Districts where organisation operates
  headquarters_location: {
    address: string;                         // Street address
    district: string;                        // Administrative district (e.g. "South Delhi")
    state: string;                           // State/UT (e.g. "Delhi")
    pincode: string | null;                  // Postal pincode
    latitude: number;                        // Geo latitude (-90 to 90)
    longitude: number;                       // Geo longitude (-180 to 180)
    geo: {                                   // GeoJSON Point for 2dsphere indexing
      type: "Point";
      coordinates: [number, number];         // [LONGITUDE, LATITUDE] strictly ordered
    };
  };

  // Operational state & tiers
  verification_status: VerificationStatus;   // "PUBLICLY_LISTED" | "REGISTRATION_CHECKED" | "OPERATIONALLY_VERIFIED" | "UNVERIFIED" | "SUSPENDED" | "INACTIVE"
  registration_status: RegistrationStatus;   // "VERIFIED_DARPAN" | "VERIFIED_REGISTRAR" | "SELF_REPORTED" | "UNVERIFIED" | "EXPIRED"
  availability_status: AvailabilityStatus;   // "AVAILABLE_24_7" | "OPERATIONAL_HOURS" | "ON_CALL" | "TEMPORARILY_UNAVAILABLE" | "UNKNOWN"
  operating_hours: string | null;            // e.g. "09:00 - 18:00 Mon-Sat"
  capacity_status: CapacityStatus;           // "HIGH" | "MEDIUM" | "LOW" | "AT_CAPACITY" | "UNKNOWN"

  // Public contact information (Safe for directory display)
  public_contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
    helpline: string | null;
  };

  // Coordinator-only confidential contact details (Restricted from public API)
  coordinator_contact?: {
    contact_person_name: string;
    designation: string | null;
    direct_phone: string;
    direct_email: string | null;
    emergency_phone: string | null;
    preferred_contact_method: "phone" | "email" | "whatsapp" | "in_person";
    notes: string | null;
  };

  // Audit and verification provenance
  verification_evidence?: {
    verified_by: string;                     // Coordinator ID or system identifier
    verified_at: string;                     // ISO 8601 timestamp
    darpan_id: string | null;
    documentation_urls: string[];
    verification_notes: string | null;
  };

  // Historical response metrics
  response_history?: {
    dispatches_received: number;
    dispatches_accepted: number;
    dispatches_completed: number;
    average_response_minutes: number | null;
    last_active_at: string | null;
    sample_size: number;
  };

  is_demo?: boolean;                         // True if synthetic seed data
  created_at: string;                        // ISO 8601 insertion timestamp
  updated_at: string;                        // ISO 8601 update timestamp
}
```

---

## 3. MongoDB Index Specifications

The `ngos` collection enforces strict index definitions in `MongoNGORepository`:

```typescript
const NGO_COLLECTION_INDEXES: IndexDescription[] = [
  // 1. Unique business identifier
  { key: { ngo_id: 1 }, unique: true, name: "idx_ngo_id_unique" },

  // 2. Sparse unique registration check (ignoring nulls)
  {
    key: { registration_number: 1 },
    unique: true,
    sparse: true,
    name: "idx_ngo_registration_unique",
  },

  // 3. Multikey index for service filtering
  { key: { service_categories: 1 }, name: "idx_ngo_service_categories" },

  // 4. Multikey index for district coverage filtering
  { key: { operational_districts: 1 }, name: "idx_ngo_operational_districts" },

  // 5. Verification status lookup
  { key: { verification_status: 1 }, name: "idx_ngo_verification_status" },

  // 6. Geospatial 2dsphere index for proximity calculation
  { key: { "headquarters_location.geo": "2dsphere" }, name: "idx_ngo_geo_2dsphere" },
];
```

> [!IMPORTANT]
> **GeoJSON Coordinate Ordering**: MongoDB `2dsphere` indexes require coordinates in `[longitude, latitude]` format. Inverting this format corrupts geospatial queries. Coordinates are validated strictly: Longitude $\in [-180, 180]$, Latitude $\in [-90, 90]$.

---

## 4. Privacy Boundaries: Public Directory vs. Coordinator View

UMEED implements privacy by design. Public visitors can view active, legitimate organizations to seek direct assistance, while internal coordinator contact details are strictly gated behind authenticated role checks.

### 4.1 Field Visibility Matrix

| Field | Public Directory (`SanitizedPublicNGO`) | Coordinator Workspace (`NGO`) |
|---|:---:|:---:|
| `ngo_id`, `organisation_name`, `alternate_names` | Visible | Visible |
| `organisation_type` | Visible | Visible |
| `service_categories`, `supported_subject_types` | Visible | Visible |
| `assistance_capabilities` | Visible | Visible |
| `operational_districts` | Visible | Visible |
| `headquarters_location` (`address`, `district`, `state`) | Visible | Visible |
| `headquarters_location.latitude` / `longitude` | Visible (HQ anchor) | Visible |
| `verification_status` | Visible | Visible |
| `availability_status`, `operating_hours` | Visible | Visible |
| `capacity_status` | Visible | Visible |
| `public_contact` (general email, helpline, website) | Visible | Visible |
| **`coordinator_contact`** (direct phone, private names) | **REDACTED** | **Visible** |
| **`verification_evidence`** (internal notes, auditor IDs) | **REDACTED** | **Visible** |
| **`response_history`** (internal completion metrics) | **REDACTED** | **Visible** |

---

## 5. Verification Tiers & Governance

UMEED rejects the assumption that registration on government portals (e.g. NGO-DARPAN) is equivalent to verified operational capacity. The registry establishes six clear tiers:

1. **`OPERATIONALLY_VERIFIED`**: Organisation's physical address, live capacity, response team, and contact numbers have been verified by a UMEED coordinator within the last 90 days. Top matching priority.
2. **`REGISTRATION_CHECKED`**: Government registration or DARPAN number confirmed against statutory records, but field deployment capabilities have not been independently tested. Eligible for matching with disclaimer.
3. **`PUBLICLY_LISTED`**: Aggregated from verified public directories, hospital partner networks, or statutory registries. Eligible for directory display; requires manual coordinator check prior to dispatch.
4. **`UNVERIFIED`**: Newly ingested via self-registration or raw CSV imports. Hidden from public recommendations until basic checks complete.
5. **`SUSPENDED`**: Flagged due to repeated non-responsiveness, fraudulent reporting, or complaints. Disqualified from all matching recommendations (`eligible: false`).
6. **`INACTIVE`**: Organisation has ceased operations or surrendered its charter. Excluded from active queries.
