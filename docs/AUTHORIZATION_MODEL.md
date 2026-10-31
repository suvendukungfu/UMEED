# UMEED Authorization Model & Access Control Architecture

**Version**: 1.0.0  
**Status**: Production Standard (Phase 2.1)  
**Security Level**: High Assurance  

---

## 1. Threat Model & Architectural Principles

UMEED serves four distinct personas across public, administrative, and automated contexts:
1. **Citizens**: Anonymous or pseudonymous community reporters submitting distress observations and tracking status.
2. **Coordinators**: Vetted human operators responsible for triaging incoming distress reports, verifying evidence, and approving cases.
3. **Automated Crawlers**: Background AI discovery agents ingesting social media observations.
4. **NGO Responders**: Field workers and dispatch units executing on approved cases.

### Core Security Invariants
- **Public Reference is NOT an Access Credential**: A public reference (e.g. `UMD-XXXX-YYYY`) is a routing identifier, not a secret. Possessing a public reference does not authorize reading incident details.
- **Constant-Time Verification**: All secret token and API key comparisons use constant-time algorithms (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Fail-Closed Authorization**: In the absence of valid credentials or proper configuration, endpoints fail closed (`401 Unauthorized` or `403 Forbidden`).
- **Query String Secrets Explicitly Forbidden**: Tracking tokens passed in query parameters (`?token=...`) are explicitly rejected and ignored to prevent leakage into HTTP referrer headers, web server access logs, and browser histories.
- **Anti-Enumeration Generic Errors**: Requesting a non-existent public reference or providing an invalid tracking token returns an identical generic `404 Not Found` response with a standard message (`"Incident not found or invalid tracking token"`).

---

## 2. Persona Access Control Matrix

| Endpoint | Method | Citizen | Coordinator | Social Media Crawler | Public / Unauthenticated |
|---|---|---|---|---|---|
| `/api/incidents/ingest` | `POST` | Permitted (Rate limited: 30/min) | Permitted | Permitted (Requires Crawler API Key) | Permitted (Citizen report only) |
| `/api/incidents` | `GET` | **Denied (401)** | **Permitted** (Requires Coordinator Auth) | **Denied (401)** | **Denied (401)** |
| `/api/incidents/:publicReference` | `GET` | **Permitted** (Requires matching `trk_...` token in Header) | **Permitted** (Full unredacted view) | **Denied (401/404)** | **Denied (401/404)** |
| `/api/health` | `GET` | Permitted | Permitted | Permitted | Permitted |

---

## 3. Credential & Token Implementation

### 3.1 Citizen Tracking Token
- **Entropy**: Cryptographically secure 24-byte pseudorandom buffer generated via `crypto.randomBytes(24)`, base64url encoded with `trk_` prefix (`>192 bits` of computational entropy).
- **Storage**: Plaintext is never stored in any database or log. Only the SHA-256 digest (`crypto.createHash("sha256").update(token).digest("hex")`) is saved to `tracking_token_hash`.
- **Issuance**: Returned in plaintext exactly once in the `201 Created` ingestion response.
- **Transmission**: Must be supplied in the `Authorization: Bearer <trk_...>` header or `x-tracking-token` header. Query parameter transmission is rejected.
- **Verification**: The incoming token is hashed with SHA-256 and compared against the stored hash using `crypto.timingSafeEqual()`.

### 3.2 Coordinator Privileges
- **Header**: Supplied via `x-coordinator-key` or `Authorization: Bearer <COORDINATOR_API_KEY>`.
- **Environment Configuration**: Loaded from `COORDINATOR_API_KEY` in `apps/web/src/lib/config/env.ts`.
- **Verification**: Evaluated with `crypto.timingSafeEqual` against configured coordinator secret.

### 3.3 Social Media Crawler Authentication
- **Header**: Supplied via `X-Crawler-API-Key` or `Authorization: Bearer <CRAWLER_API_KEY>`.
- **Invariant**: Any payload where `source_type === "social_media_discovery"` requires valid crawler authorization.
- **Safety Enforcement**: Crawled incidents unconditionally enforce `requires_human_review = true` and `status = "REPORTED"`.

---

## 4. Rate Limiting Protection

To protect against credential enumeration, denial of service, and resource exhaustion, endpoints employ sliding-window rate limiters (`apps/web/src/lib/security/rate-limit.ts`):

1. **Ingestion Limiter (`POST /api/incidents/ingest`)**:
   - Window: 60,000 ms (1 minute)
   - Limit: 30 requests per IP
   - Exceeded Response: `429 Too Many Requests`
2. **Tracking Lookup Limiter (`GET /api/incidents/:publicReference`)**:
   - Window: 60,000 ms (1 minute)
   - Limit: 10 requests per IP
   - Exceeded Response: `429 Too Many Requests`

### Architectural Disclosure: Distributed Rate Limiting
The current implementation utilizes an in-memory sliding-window counter (`MemoryRateLimiter`). While highly performant and self-contained for single-node deployments and tests, multi-instance production deployments behind horizontal autoscaling must configure a distributed Redis or Cloudflare edge rate-limiter.
