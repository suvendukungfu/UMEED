# UMEED — Workstream F: Security, Privacy & Data Integrity Release Audit

**Security Lead**: Application Security & Infrastructure Architect  
**Evaluation Scope**: Authentication, RBAC, Responder Tenancy, Tracking Token Cryptography, PII Redaction, Rate Limiting, Threat Model  
**Audit Standard**: OWASP ASVS v4.0 / HackCBS 9.0 Production Readiness  
**Status**: AUDITED & HARDENED  

---

## 1. Executive Summary & Verification Gates

Emergency social coordination systems handle vulnerable human beneficiaries and sensitive location data. A data leak can lead to harassment, predatory exploitation, or security breaches.

Workstream F conducted a rigorous, hostile-perspective audit across UMEED's codebase. All critical and high-severity issues have been addressed with fail-closed security controls, cryptographic isolation, and zero-trust credential handling.

---

## 2. Authentication & Authorization Analysis

### 2.1 Coordinator Authentication
- **Implementation**: `apps/web/src/lib/security/authorization.ts` (`verifyCoordinatorAuth`).
- **Timing-Attack Resistance**: Compares incoming keys using `crypto.timingSafeEqual` after length validation.
- **Fail-Closed Behavior**: If `COORDINATOR_API_KEY` is undefined or set to insecure defaults in production (`NODE_ENV === "production"`), administrative routes fail closed immediately with HTTP 401 Unauthorized.

### 2.2 Responder Identity & Tenancy Verification
- **Investigation of User-Controlled Headers**:
  - *Vulnerability Analyzed*: Relying solely on user-controlled headers like `x-ngo-id` or `x-responder-id` allows malicious actors to forge responder identity or tamper with competing assignments.
  - *Hardened Architecture*:
    - In **Production Mode (`NODE_ENV === "production"`)**, requests must present an authenticated Bearer token. Requests presenting bare user-controlled headers without verified tenancy credentials are unconditionally rejected.
    - In **Development / Demo Mode**, `x-ngo-id` is explicitly designated as a *Simulation Header* to permit interactive multi-persona demonstration in local environments, logged with audit context.
  - *Tenancy Isolation*: In `ResponderService.getCaseAndAssignment`, assignments are strictly queried by `{ assignment_id, organisation_id }`. Even if a responder manipulates their ID, they cannot view or mutate an assignment belonging to another organisation.

### 2.3 Citizen Tracking Token Cryptography
- **Zero Token Storage**: Cleartext tracking tokens (`trk_...`) are NEVER written to the database.
- **Cryptographic Hashing**: Tokens are hashed using SHA-256 with a salt before persisting to `tracking_token_hash`.
- **Query Parameter Ban**: Tracking tokens passed in URL query strings (e.g. `?token=trk_123`) are explicitly ignored by `extractTrackingToken` to prevent leakage into browser navigation histories, proxy caches, or access logs. Tokens must be submitted via the `x-tracking-token` or `Authorization: Bearer` headers.

---

## 3. Privacy & PII Scrubbing

### 3.1 Beneficiary Data Protection
- **Phone Number Redaction**: Citizen phone numbers are masked in all coordinator listings and responder feeds (`+91-98765-XXXXX`).
- **Street-Level Jittering & House Number Scrubbing**:
  - House/flat numbers and apartment names are scrubbed using regular expressions before public indexing.
  - GPS coordinates undergo precision truncation to 3 decimal places ($\approx 110\text{ m}$ radius) in public tracking views. Exact raw coordinates are restricted to verified assigned responders.
- **EXIF Metadata Cleansing**: Uploaded photos are stripped of EXIF metadata (camera serials, embedded GPS tags, device identifiers) during ingestion.

### 3.2 Meko Context Memory Privacy
- **Pre-Storage PII Audit**: Before any operational memory is submitted to Meko via `memory_add`, `memory_update`, or `memory_promote`, `validateOperationalMemoryText` verifies that:
  - No 10-digit phone numbers are present.
  - No email addresses are present.
  - No Aadhaar or government ID formats are present.
  - Text contains only generalized operational precedents.

---

## 4. Rate Limiting & Resilience

### 4.1 In-Memory Sliding Window Rate Limiter
- **Configuration**: Implemented in `apps/web/src/lib/security/rate-limit.ts`.
  - Public Ingestion (`/api/incidents/ingest`): 5 requests per minute per IP.
  - Tracking Status (`/api/incidents/[ref]`): 30 requests per minute per IP.
  - AI Evaluation: 10 requests per minute per IP.
- **Multi-Instance Limitation (Honest Disclosure)**:
  - The current rate limiter uses an in-memory sliding window Map.
  - In a multi-replica clustered deployment (e.g. multiple Kubernetes pods or serverless instances), memory state is not shared across nodes.
  - *Production Recommendation*: For multi-region enterprise scaling, attach Redis or Upstash as the distributed backing store for rate limit tokens.

---

## 5. Security Checklist & Release Gates

| Security Requirement | Status | Verification Detail |
|---|---|---|
| No secrets committed to Git | **VERIFIED** | `.env.local` is Git-ignored; pre-commit verification passed |
| No credentials in client JS bundles | **VERIFIED** | All API keys accessed exclusively via server-side runtime |
| Timing-safe authentication | **VERIFIED** | `crypto.timingSafeEqual` applied to coordinator authentication |
| No cleartext citizen tracking tokens | **VERIFIED** | Only SHA-256 hashes stored in database |
| Tenancy enforcement on responder actions | **VERIFIED** | Strict validation of `assignment.organisation_id` |
| Memory governance server-side checks | **VERIFIED** | Coordinator privileges required for all Context Inspector mutations |
| PII scanning prior to Meko memory write | **VERIFIED** | Phone, email, and ID patterns rejected with 400 Bad Request |
| Error messages sanitized | **VERIFIED** | Stack traces hidden in production; sensitive URIs masked in logs |

