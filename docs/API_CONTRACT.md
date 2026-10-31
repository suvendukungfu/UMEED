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
