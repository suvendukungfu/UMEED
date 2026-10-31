# UMEED Authorization Model, Access Control & Production Boundaries

**Version**: 1.1.0  
**Status**: Production Standard (Phase 2.2 Hardened)  
**Security Level**: High Assurance  

---

## 1. Threat Model & Architectural Principles

UMEED manages sensitive social distress reports involving vulnerable individuals (homeless persons, abandoned elderly, victims of severe abuse or medical emergencies) and animals in distress.

### Core Security Invariants

- **Public Reference is NOT an Access Credential**: A public reference (e.g. `UMD-XXXX-YYYY`) is a non-confidential routing identifier. It never grants read or write access on its own.
- **Fail-Closed Authorization**: In the absence of valid credentials, missing configuration, or unconfigured production secrets, endpoints unconditionally fail closed (`401 Unauthorized` or `503 Service Unavailable`).
- **Constant-Time Verification**: All secret token comparisons utilize `crypto.timingSafeEqual()` to mitigate timing side-channel attacks.
- **Query String Secrets Explicitly Forbidden**: Tracking tokens in URL query strings (`?token=...`) are explicitly rejected to prevent leakage in proxy access logs, browser history, and HTTP Referer headers.
- **Anti-Enumeration Generic Errors**: Missing public references and incorrect tracking tokens return an identical generic `404 Not Found` response with identical payloads to prevent identifier probing.
- **No Predictable Production Credentials**: Static development keys (`umeed-coordinator-dev-key`, `umeed-crawler-dev-key`) are strictly forbidden in production (`NODE_ENV === "production"`).

---

## 2. Authentication Classification (Status & Scope)

To maintain architectural transparency, current authentication capabilities are classified as follows:

| Mechanism | Classification | Production Scope & Guarantees | Limitations & Boundaries |
| --- | --- | --- | --- |
| **Citizen Tracking Tokens** (`trk_...`) | **Implemented** | Cryptographically strong (>192-bit entropy via `crypto.randomBytes(24)`). Stored as SHA-256 digest only. Single-use issuance at `201 Created`. Header-only submission. Constant-time verification. | Token bearer possesses view access to that specific report's public sanitized view. Not tied to identity. |
| **Coordinator API Key** | **Implemented** (Service-Level) | Pre-shared key protecting `/api/incidents` queue. Validated in constant-time. In production, requires strong external secret; development default rejected. | **Service-level shared secret only**. Does **NOT** provide individual user accountability, multi-user RBAC, or session lifecycle. |
| **Crawler Ingestion API Key** | **Implemented** (S2S) | Service-to-service key for `social_media_discovery` intake. Unconditionally enforces human review flag. | Shared service token; does not track individual crawler nodes. |
| **Development Default Keys** | **Development-Only** | Pre-seeded in development templates for zero-friction local developer experience. | Strictly rejected in `NODE_ENV=production`. If set in production, coordinator/crawler operations fail closed. |
| **User Identity & OIDC/OAuth 2.0** | **Planned (Post-Phase 2)** | Individual user authentication for coordinators, dispatchers, and NGO responders (e.g., Clerk, NextAuth, or Firebase Auth). | Not implemented in Phase 2. Static keys must not be conflated with user identity. |
| **Fine-Grained RBAC & Agency Tenancy** | **Planned (Phase 4/5)** | Agency-level scoping (NGO A cannot view NGO B's unassigned cases), jurisdiction filtering, role hierarchy (Dispatcher vs Admin vs Auditor). | Currently, valid coordinator key grants queue access to all `REPORTED` incidents. |

---

## 3. Persona Access Control Matrix

| Endpoint | Method | Citizen Reporter | Coordinator / Staff | Discovery Crawler | Public / Unauthenticated |
| --- | --- | --- | --- | --- | --- |
| `/api/incidents/ingest` | `POST` | Permitted (Rate limited: 30/min) | Permitted | Permitted (Requires Crawler Key) | Permitted (Citizen reports only) |
| `/api/incidents` | `GET` | **Denied (401)** | **Permitted** (Requires Coordinator Auth) | **Denied (401)** | **Denied (401)** |
| `/api/incidents/:publicReference` | `GET` | **Permitted** (Requires matching `trk_...` token in Header) | **Permitted** (Full unredacted view) | **Denied (401/404)** | **Denied (401/404)** |
| `/api/evidence/preview/:publicRef/:idx` | `GET` | **Permitted** (Sanitized derivative with EXIF stripped) | **Permitted** | **Permitted** | **Permitted** (Derived preview only) |
| `/api/health` | `GET` | Permitted | Permitted | Permitted | Permitted |

---

## 4. Rate Limiting Architecture & Production Assumptions

Endpoints enforce sliding-window rate limiting (`apps/web/src/lib/security/rate-limit.ts`):

1. **Ingestion Limiter (`POST /api/incidents/ingest`)**:
   - Window: 60,000 ms (1 minute)
   - Limit: 30 requests per IP
   - Exceeded Response: `429 Too Many Requests` with `Retry-After` header.
2. **Tracking Lookup Limiter (`GET /api/incidents/:publicReference`)**:
   - Window: 60,000 ms (1 minute)
   - Limit: 10 requests per IP
   - Exceeded Response: `429 Too Many Requests` with `Retry-After` header.

### Operational Disclosures & Reverse-Proxy Trust

- **In-Memory Volatility**: The default rate limiter (`MemoryRateLimiter`) stores counters in Node.js process memory. Counters reset upon application restart or worker respawn.
- **Single-Node vs Distributed**: In horizontally autoscaled multi-container clusters, in-memory limiters do not share state across instances. Production deployments must back rate limiters with an external store (e.g. Redis / Upstash) or enforce limits at an edge gateway (Cloudflare Rate Limiting, AWS WAF).
- **IP Extraction & Header Spoofing Protection**:
  - `extractClientIp` validates that extracted strings match strict IPv4 or IPv6 syntax, preventing header injection.
  - Priority order: `cf-connecting-ip` (Cloudflare) $\to$ `x-real-ip` (ALB/Nginx) $\to$ `x-forwarded-for` (proxy chain).
  - **Security Warning**: If the application is exposed directly to the public Internet without a trusted reverse proxy, clients can forge `X-Forwarded-For` headers. Production infrastructure **MUST** be deployed behind an edge proxy configured to strip or overwrite incoming client forwarding headers.
