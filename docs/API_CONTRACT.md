# UMEED API Contract & Ingestion Specification (v1.0.0)

**Protocol**: REST / JSON  
**Base URL**: `/api`  
**Security Standard**: Strict Schema Validation (Zod 4.6.7), Constant-time Credential Checks, Server-Side Secret Isolation  

---

## 1. Endpoints Overview

| Endpoint | Method | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `/api/incidents/ingest` | `POST` | Public (Citizen) / Bearer (Crawler) | Ingests distress reports with idempotency, rate limiting, and tracking token generation | `201`, `200`, `400`, `401`, `413`, `415`, `429`, `503` |
| `/api/incidents` | `GET` | Coordinator / Staff | Query, filter, and paginate ingested incidents (Requires Coordinator Auth) | `200`, `401`, `500` |
| `/api/incidents/:publicReference` | `GET` | Citizen (with token) / Coordinator | Retrieve single incident by public reference (redacted for citizen; unredacted for coordinator) | `200`, `401`, `404`, `429`, `500` |
| `/api/incidents/:publicReference/triage` | `POST` | Coordinator / Staff | Trigger or re-run multimodal Gemini AI distress triage for an incident | `200`, `401`, `404`, `500` |
| `/api/incidents/:publicReference/review` | `POST` | Coordinator / Staff | Record human coordinator review decision (`CONFIRM`, `OVERRIDE`, `REJECT`, `REQUEST_INFO`, `ESCALATE`) | `200`, `400`, `401`, `404`, `500` |
| `/api/ai/evaluation` | `GET` | Coordinator / Staff | Execute 9-scenario synthetic AI triage benchmark suite and return metrics | `200`, `401`, `500` |
| `/api/ngos` | `GET` | Public / Coordinator | Query NGO directory (Public: redacted; Coordinator: full contact & evidence) | `200`, `500` |
| `/api/ngos` | `POST` | Coordinator / Staff | Register new NGO manually into the intelligence registry | `201`, `400`, `401`, `409`, `500` |
| `/api/ngos/:ngoId` | `GET` | Public / Coordinator | Retrieve single NGO details by business identifier | `200`, `404`, `500` |
| `/api/ngos/:ngoId` | `PATCH` | Coordinator / Staff | Update operational status, capacity, or details of an existing NGO | `200`, `400`, `401`, `404`, `500` |
| `/api/ngos/import` | `POST` | Coordinator / Staff | Bulk import NGOs from RFC 4180 CSV with duplicate detection & validation report | `200`, `400`, `401`, `500` |
| `/api/ngos/matches/:incidentReference` | `GET` | Coordinator / Staff | Generate explainable, multi-factor scored candidate recommendations for an incident | `200`, `401`, `404`, `500` |
| `/api/health` | `GET` | Public | System readiness and database connectivity check | `200` |

---

## 2. Ingestion Endpoint: `POST /api/incidents/ingest`

### Request Headers
- `Content-Type`: `application/json` (Required)
- `X-Crawler-API-Key` or `Authorization: Bearer <key>`: Required **only** if `source_type === "social_media_discovery"`.

### Request Body Schema (`CanonicalIncidentSchema v1.0.0`)
```json
{
  "schema_version": "1.0.0",
  "source_type": "citizen_report | social_media_discovery",
  "source_reference": "string (1-256 chars, unique per source_type)",
  "source_url": "string (URL, max 2048 chars) | null",
  "reported_at": "ISO 8601 Datetime string",
  "incident_type": "injured_animal | abandoned_animal | homeless_person | abandoned_elderly_person | medical_assistance | food_assistance | shelter_assistance | other",
  "subject_type": "person | animal",
  "description": "string (1-5000 chars)",
  "evidence": [
    {
      "type": "image | video | audio | text",
      "url": "string (max 2048 chars)",
      "timestamp": "ISO 8601 Datetime string (optional)",
      "metadata": { "key": "value" }
    }
  ],
  "location": {
    "latitude": "number (-90 to 90) | null",
    "longitude": "number (-180 to 180) | null",
    "address": "string (max 500 chars) | null",
    "district": "string (max 100 chars) | null",
    "confidence": "number (0.0 to 1.0)"
  },
  "severity": {
    "level": "low | medium | high | critical | unconfirmed",
    "confidence": "number (0.0 to 1.0)",
    "reasoning": ["string (max 500 chars)"]
  },
  "freshness": "current_confirmed_by_source | potentially_recent | old_or_reshared | unclear | unconfirmed",
  "missing_information": ["string (max 200 chars)"],
  "requires_human_review": "boolean (default: true)"
}
```

---

### Response 1: New Incident Ingested (`201 Created`)
Returned when an incident is newly created and persisted.
```json
{
  "status": "success",
  "message": "Incident reported successfully",
  "data": {
    "public_reference": "UMD-7B29-4K12",
    "tracking_token": "trk_eU9N8fK... (High-Entropy Token, RETURNED ONLY ONCE)",
    "status": "REPORTED",
    "source_type": "citizen_report",
    "source_reference": "citizen_1730391200_a81f",
    "incident_type": "injured_animal",
    "subject_type": "animal",
    "is_duplicate": false,
    "is_suspected_duplicate": false,
    "suspected_duplicate_candidates": [],
    "requires_human_review": true,
    "reported_at": "2026-10-31T14:00:00.000Z",
    "created_at": "2026-10-31T14:00:02.115Z"
  }
}
```
**Headers**:
- `Location`: `/api/incidents/UMD-7B29-4K12`

---

### Response 2: Idempotent Replay (`200 OK`)
Returned when a submission with an identical `{ source_type, source_reference }` pair has already been stored.
```json
{
  "status": "success",
  "message": "Incident already recorded (idempotent replay)",
  "data": {
    "public_reference": "UMD-7B29-4K12",
    "status": "REPORTED",
    "source_type": "citizen_report",
    "source_reference": "citizen_1730391200_a81f",
    "incident_type": "injured_animal",
    "subject_type": "animal",
    "is_duplicate": true,
    "is_suspected_duplicate": false,
    "suspected_duplicate_candidates": [],
    "requires_human_review": true,
    "created_at": "2026-10-31T14:00:02.115Z"
  }
}
```
> [!IMPORTANT]
> **Security Invariant**: Notice that `tracking_token` is **omitted** from idempotent replay responses because only the SHA-256 hash is persisted in the database.

---

### Response 3: Suspected Proximity Duplicate Flagged (`201 Created`)
Returned when a new incident is within 500 meters and 24 hours of an existing incident of the same subject type.
```json
{
  "status": "success",
  "message": "Incident reported successfully",
  "data": {
    "public_reference": "UMD-3C91-912A",
    "tracking_token": "trk_w8N12...",
    "status": "REPORTED",
    "is_duplicate": false,
    "is_suspected_duplicate": true,
    "suspected_duplicate_candidates": [
      {
        "incident_id": "848b61c7-...",
        "public_reference": "UMD-7B29-4K12",
        "incident_type": "injured_animal",
        "subject_type": "animal",
        "distance_meters": 142,
        "reported_at": "2026-10-31T13:45:00.000Z",
        "reason": "Spatial proximity match (142m) within 0.3 hours of candidate UMD-7B29-4K12"
      }
    ],
    "requires_human_review": true
  }
}
```

---

## 3. Incident Triage Queue: `GET /api/incidents`

### Authentication & Authorization
- **Role Required**: Coordinator / Staff
- **Accepted Headers**:
  - `x-coordinator-key: <COORDINATOR_API_KEY>` OR
  - `Authorization: Bearer <COORDINATOR_API_KEY>`
- Unauthenticated requests fail closed with `401 Unauthorized`.

### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | string | - | Filter by status (`REPORTED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `CONVERTED_TO_CASE`) |
| `source_type` | string | - | Filter by source (`citizen_report`, `social_media_discovery`) |
| `is_suspected_duplicate` | boolean | - | Filter suspected duplicates (`true` / `false`) |
| `limit` | integer | `50` | Maximum results to return (max 100) |
| `offset` | integer | `0` | Offset for pagination |

### Success Response (`200 OK`)
Returns full operational incident records with unredacted coordinates and triage metadata for review.

---

## 4. Citizen Tracking Retrieval: `GET /api/incidents/:publicReference`

### Authentication & Authorization
- **Role**: Citizen Reporter OR Coordinator
- **Accepted Headers**:
  - Citizen: `x-tracking-token: trk_...` OR `Authorization: Bearer trk_...`
  - Coordinator: `x-coordinator-key: ...` OR `Authorization: Bearer <COORDINATOR_KEY>`
- **Security Invariant**: Tokens in query parameters (`?token=...`) are explicitly **rejected** and ignored.
- **Anti-Enumeration Defense**: If the public reference is not found OR the tracking token is invalid/missing, the endpoint returns an identical generic `404 Not Found` response (`"Incident not found or invalid tracking token"`).

### Redaction Behavior
- **Citizen View**:
  - `location.latitude`: `null`
  - `location.longitude`: `null`
  - `location.address`: Generalized (District/City only)
  - `evidence[].url`: Proxied through sanitized preview route
  - Description: PII patterns (phone numbers, email addresses) redacted
  - Internal metadata (`tracking_token_hash`, `_id`) omitted
- **Coordinator View**:
  - Full unredacted operational record including exact GPS, full description, and raw evidence.

---

## 5. Error Responses

All error responses strictly follow the RFC 7807 problem details structure:

```json
{
  "error": {
    "code": "BAD_REQUEST | UNAUTHORIZED | NOT_FOUND | PAYLOAD_TOO_LARGE | UNSUPPORTED_MEDIA_TYPE | TOO_MANY_REQUESTS | SERVICE_UNAVAILABLE | INTERNAL_SERVER_ERROR",
    "message": "Human-readable description of error",
    "status": 400,
    "details": [
      { "field": "reported_at", "message": "reported_at must be an ISO 8601 datetime string" }
    ],
    "timestamp": "2026-10-31T14:00:00.000Z"
  }
}
```

| HTTP Status | Error Code | Condition |
|---|---|---|
| **400** | `BAD_REQUEST` | Validation error against `CanonicalIncidentSchema` or malformed JSON |
| **401** | `UNAUTHORIZED` | Missing or invalid authentication (Crawler API key, Coordinator key, or Tracking token) |
| **404** | `NOT_FOUND` | Incident not found or invalid tracking token (anti-enumeration response) |
| **413** | `PAYLOAD_TOO_LARGE` | Request payload exceeds 1MB |
| **415** | `UNSUPPORTED_MEDIA_TYPE` | Content-Type is not `application/json` |
| **429** | `TOO_MANY_REQUESTS` | Rate limit exceeded (30 req/min on ingest, 10 req/min on tracking) |
| **503** | `SERVICE_UNAVAILABLE` | Database connection unavailable or timeout |
| **500** | `INTERNAL_SERVER_ERROR` | Unhandled internal server exception |

---

## 6. AI Triage Trigger: `POST /api/incidents/:publicReference/triage`

Coordinator-authenticated trigger to run multimodal Gemini triage on demand.

### Request Headers
- `x-coordinator-key: <key>` or `Authorization: Bearer <key>` (Required)
- `Content-Type: application/json`

### Request Body (Optional)
```json
{
  "modelId": "gemini-2.5-flash"
}
```

### Response (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "public_reference": "UMD-4DB9-473D",
    "triage_analysis": {
      "analysis_id": "439ea036-7c01-4475-b467-3382c4fbe59c",
      "incident_id": "9618bf75-47d0-4bf6-9051-7f0ad08b6d37",
      "model_id": "gemini-2.5-flash",
      "prompt_version": "v1.0.0",
      "category_recommendation": "injured_animal",
      "subject_type": "animal",
      "observable_evidence": [
        {
          "observation": "Canine lying on side with laceration on right hind leg",
          "evidence_reference": "photo_0",
          "confidence": 0.92
        }
      ],
      "possible_assistance": ["veterinary_first_aid", "animal_ambulance_dispatch"],
      "urgency": {
        "level": "urgent",
        "reasoning": [
          "Visible physical trauma with active bleeding.",
          "High risk of wound infection or vehicle collision if left on roadway."
        ],
        "requires_human_review": true
      },
      "location_candidates": ["Madhuban Chowk flyover"],
      "missing_information": ["Current animal disposition (conscious/unconscious)"],
      "limitations": [
        "AI non-veterinary assessment based solely on photographic evidence.",
        "Human review mandatory."
      ],
      "confidence": 0.92,
      "analysis_status": "SUCCESS",
      "created_at": "2026-10-31T14:10:00.000Z",
      "human_review_status": "PENDING"
    }
  }
}
```

---

## 7. Human Review Decision: `POST /api/incidents/:publicReference/review`

Coordinator-authenticated human verification action recording.

### Request Headers
- `x-coordinator-key: <key>` or `Authorization: Bearer <key>` (Required)
- `Content-Type: application/json`

### Request Body
```json
{
  "decision": "CONFIRM", // "CONFIRM" | "OVERRIDE" | "REJECT" | "REQUEST_INFO" | "ESCALATE"
  "reason": "Verified photo shows legitimate limb trauma. Dispatching animal rescue team.",
  "reviewer_id": "coord_delhi_04",
  "override_category": "medical_assistance", // Optional: used when decision is OVERRIDE
  "override_urgency": "urgent" // Optional: used when decision is OVERRIDE
}
```

### Response (`200 OK`)
Returns the updated operational incident document for coordinator inspection with updated status (`APPROVED`, `REJECTED`, or `UNDER_REVIEW`).

---

## 8. AI Evaluation Benchmark: `GET /api/ai/evaluation`

Coordinator-authenticated trigger to run the 9-scenario synthetic evaluation benchmark.

### Request Headers
- `x-coordinator-key: <key>` or `Authorization: Bearer <key>` (Required)

### Response (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "total_scenarios": 9,
    "schema_valid_rate": 1.0,
    "category_accuracy": 0.89,
    "false_emergency_escalation_rate": 0.0,
    "missing_information_extraction_rate": 1.0,
    "grounding_in_evidence_rate": 1.0,
    "failure_handling_rate": 1.0,
    "timestamp": "2026-10-31T14:15:00.000Z",
    "scenario_results": [ ... ]
  }
}
```

---

## 9. NGO Intelligence Registry: `GET /api/ngos`

Lists and filters NGOs. Public callers receive sanitized profiles (private coordinator contact, direct emergency numbers, and internal audit evidence stripped). Authenticated coordinators receive full operational profiles.

### Query Parameters
- `service_category`: Filter by `IncidentType` (e.g. `injured_animal`, `homeless_person`)
- `district`: Filter by operational district (e.g. `South Delhi`)
- `verification_status`: Filter by status (`OPERATIONALLY_VERIFIED`, `REGISTRATION_CHECKED`, etc.)
- `search`: Case-insensitive text search across name, alternate names, and capabilities

### Headers
- `x-coordinator-key` or `Authorization: Bearer <key>`: Optional. Enables coordinator-privileged view.

### Response (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "ngos": [ ... ],
    "total": 8,
    "view_mode": "public | coordinator"
  }
}
```

---

## 10. Manual NGO Registration: `POST /api/ngos`

Allows coordinators to manually register an NGO.

### Request Headers
- `x-coordinator-key: <key>` or `Authorization: Bearer <key>` (Required)
- `Content-Type: application/json`

### Request Body (`NGOSchema`)
Requires valid `organisation_name`, `organisation_type`, `service_categories`, `supported_subject_types`, `operational_districts`, and `headquarters_location` with coordinates.

### Response (`201 Created` or `409 Conflict`)
Returns the created NGO document. Returns `409 Conflict` if the registration number or business ID already exists.

---

## 11. Single NGO Operations: `GET /api/ngos/:ngoId` & `PATCH /api/ngos/:ngoId`

### `GET /api/ngos/:ngoId`
Returns a single organisation's profile. Sanitized if public caller; complete if authenticated coordinator.

### `PATCH /api/ngos/:ngoId`
Coordinator-only endpoint to update availability, capacity, verification tier, or contact details.

#### Request Headers
- `x-coordinator-key: <key>` or `Authorization: Bearer <key>` (Required)

---

## 12. NGO Bulk CSV Import: `POST /api/ngos/import`

Imports NGO rosters from RFC 4180 CSV with automatic duplicate detection and row validation.

### Request Headers
- `x-coordinator-key: <key>` or `Authorization: Bearer <key>` (Required)
- `Content-Type: text/csv` or `application/json` with `{ "csv_content": "..." }`

### Response (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "total_rows": 12,
    "imported_count": 10,
    "skipped_count": 2,
    "duplicate_count": 1,
    "error_count": 1,
    "errors": [
      {
        "row_number": 4,
        "organisation_name": "Animal Care Delhi",
        "reason": "Duplicate organization: Registration number DL/2018/0184920 already exists"
      }
    ]
  }
}
```

---

## 13. Explainable Matching Engine: `GET /api/ngos/matches/:incidentReference`

Computes ranked, explainable organization recommendations for an incident using multi-criteria weighted scoring.

### Request Headers
- `x-coordinator-key: <key>` or `Authorization: Bearer <key>` (Required)

### Response (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "incident_reference": "UMD-7B29-4K12",
    "evaluated_candidates_count": 8,
    "eligible_candidates_count": 3,
    "matched_candidates": [
      {
        "ngo_id": "ngo_del_001",
        "organisation_name": "Delhi Animal Welfare Society Trust Regd",
        "eligible": true,
        "composite_score": 0.892,
        "component_scores": {
          "capability_score": 0.95,
          "coverage_score": 1.0,
          "distance_score": 0.8,
          "availability_score": 1.0,
          "capacity_score": 0.8,
          "history_score": null
        },
        "distance_km": 8.4,
        "ineligibility_reasons": [],
        "explanation": "High capability alignment with 24/7 emergency response in South Delhi (8.4 km away).",
        "missing_information": []
      }
    ],
    "weights_applied": {
      "capability": 0.40,
      "coverage": 0.25,
      "distance": 0.15,
      "availability": 0.10,
      "capacity": 0.10
    },
    "explanation_summary": "Top recommendation: Delhi Animal Welfare Society Trust Regd (Score: 89%). 3 eligible organisations identified.",
    "generated_at": "2026-10-31T14:30:00.000Z"
  }
}
```


