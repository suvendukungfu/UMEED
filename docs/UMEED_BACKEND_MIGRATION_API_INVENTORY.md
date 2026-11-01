# UMEED — Backend Migration API Inventory & Route Specification

**Document Version:** 1.0.0  
**Migration Target:** Fastify Backend on Fly.io (`bom` region) + Next.js BFF API Proxy on Vercel Hobby  
**Date:** November 1, 2026  
**Status:** Pre-Migration Comprehensive Inventory  

---

## 1. Executive Summary & Inventory Overview

This inventory records all 68 route handlers present in the UMEED Next.js monolithic application (`apps/web/src/app/api`). Each entry documents:
1. Existing frontend proxy route and HTTP method(s).
2. Underlying domain service and repository dependencies.
3. Authentication and RBAC permission requirements.
4. Organization tenancy scope.
5. Inbound request schema and outbound response contract.
6. Target route on the Fastify backend service (`apps/backend`).

### Domain Distribution Summary

| Domain | Total Endpoints | Primary Auth Requirement | Target Backend Prefix |
| :--- | :--- | :--- | :--- |
| **Authentication & Identity** | 4 | Session Cookie / Token / Public | `/v1/auth/*` |
| **Citizen Distress Intake & Ingestion** | 4 | Public (Rate-Limited) / Tracking Token | `/v1/incidents/*` |
| **Coordinator Incident Management** | 3 | `incident:review` / `COORDINATOR` | `/v1/coordinator/incidents/*` |
| **Cases & Case Lifecycle** | 8 | `case:manage` / `COORDINATOR` | `/v1/cases/*` |
| **Assistance Engine & Matching** | 17 | `assistance:dispatch` / Mixed RBAC | `/v1/assistance/*` |
| **Responders & Field Operations** | 8 | `responder:update` / `x-ngo-id` | `/v1/responders/*` |
| **NGO Registry & Facilities** | 8 | Platform Admin / Coordinator / Public | `/v1/ngos/*`, `/v1/facilities` |
| **Discovery & Crawling** | 10 | Coordinator / Public Geo | `/v1/discovery/*` |
| **Context Learning & AI** | 4 | Coordinator / Admin | `/v1/context-learning/*` |
| **Notifications & System Ops** | 2 | Coordinator / Cron / Public | `/v1/notifications/*`, `/health` |

---

## 2. Comprehensive Endpoint Inventory

### 2.1 Authentication & Identity Domain

#### 2.1.1 `POST /api/auth/sign-in`
- **Current Handler:** `apps/web/src/app/api/auth/sign-in/route.ts`
- **Domain Service:** `AuthService.signInWithPassword()`
- **Auth Requirement:** Public (Rate-limited by client IP)
- **Organization Scope:** Global (evaluates user's active membership)
- **Request Contract:** `{ email: string, password: string }`
- **Response Contract:** `{ status: "success", data: AuthContext }` + `Set-Cookie: umeed_session=sess_...; HttpOnly; Secure; SameSite=Lax; Path=/`
- **Error Contract:** 400 Bad Request, 401 Unauthorized (`"Invalid email or password"`)
- **External Dependencies:** MongoDB `users`, `sessions`, `organizations`
- **New Backend Route:** `POST /v1/auth/sign-in`

#### 2.1.2 `POST /api/auth/sign-out`
- **Current Handler:** `apps/web/src/app/api/auth/sign-out/route.ts`
- **Domain Service:** `AuthService.revokeSession()`
- **Auth Requirement:** Authenticated session (`umeed_session` cookie or `Authorization: Bearer sess_...`)
- **Organization Scope:** Session-bound
- **Request Contract:** Empty body
- **Response Contract:** `{ status: "success", message: "Signed out" }` + Clears `umeed_session` cookie
- **Error Contract:** 200 (Idempotent success)
- **External Dependencies:** MongoDB `sessions`
- **New Backend Route:** `POST /v1/auth/sign-out`

#### 2.1.3 `GET /api/auth/session`
- **Current Handler:** `apps/web/src/app/api/auth/session/route.ts`
- **Domain Service:** `AuthService.authenticateToken()`
- **Auth Requirement:** Session cookie / bearer token
- **Organization Scope:** Active organization in session
- **Request Contract:** None (reads cookie/header)
- **Response Contract:** `{ status: "success", data: AuthContext }`
- **Error Contract:** 401 Unauthorized (`"No active session"`)
- **External Dependencies:** MongoDB `sessions`, `users`, `organizations`
- **New Backend Route:** `GET /v1/auth/session`

#### 2.1.4 `POST /api/auth/switch-org`
- **Current Handler:** `apps/web/src/app/api/auth/switch-org/route.ts`
- **Domain Service:** `AuthService.switchActiveOrganization()`
- **Auth Requirement:** Authenticated session
- **Organization Scope:** Target organization must exist in user's memberships
- **Request Contract:** `{ organizationId: string }`
- **Response Contract:** `{ status: "success", data: AuthContext }`
- **Error Contract:** 400 Bad Request, 403 Forbidden
- **External Dependencies:** MongoDB `sessions`, `organization_memberships`
- **New Backend Route:** `POST /v1/auth/switch-org`

---

### 2.2 Citizen Distress Intake & Ingestion

#### 2.2.1 `POST /api/incidents/ingest`
- **Current Handler:** `apps/web/src/app/api/incidents/ingest/route.ts`
- **Domain Service:** `IncidentService.ingestIncident()`
- **Auth Requirement:** Public (Enforces IP rate-limiting + payload size < 1MB). Crawler source requires crawler secret.
- **Organization Scope:** Open / Unassigned
- **Request Contract:** `IngestIncidentInputSchema` (`contracts/src/incident.ts`)
- **Response Contract:** `{ success: true, publicReference: string, trackingToken: string, status: string, estimatedTriageTime: string }`
- **Error Contract:** 400 Bad Request, 429 Rate Limit, 503 Service Unavailable (Fail-closed storage gate)
- **External Dependencies:** MongoDB Atlas `incidents`, `evidence_blobs`, Google Gemini AI (Advisory Triage)
- **New Backend Route:** `POST /v1/incidents/ingest`

#### 2.2.2 `GET /api/incidents/[publicReference]`
- **Current Handler:** `apps/web/src/app/api/incidents/[publicReference]/route.ts`
- **Domain Service:** `IncidentService.getIncidentByPublicReference()`
- **Auth Requirement:** Tracking Token (`x-tracking-token: trk_...`) or Coordinator Session
- **Organization Scope:** Citizen privacy sandbox (scrubbed PII unless coordinator)
- **Request Contract:** Route param `publicReference`, Header `x-tracking-token`
- **Response Contract:** `SanitizedIncidentSchema`
- **Error Contract:** 401 Unauthorized, 404 Not Found
- **External Dependencies:** MongoDB `incidents`
- **New Backend Route:** `GET /v1/incidents/:publicReference`

#### 2.2.3 `GET /api/evidence/preview/[publicReference]/[index]`
- **Current Handler:** `apps/web/src/app/api/evidence/preview/[publicReference]/[index]/route.ts`
- **Domain Service:** `EvidenceService.getSanitizedDerivative()`
- **Auth Requirement:** Public (Privacy-sanitized derivative thumbnail) or Authorized Coordinator
- **Organization Scope:** Open
- **Request Contract:** Route params `publicReference`, `index`
- **Response Contract:** Binary stream (JPEG/PNG) with `Cache-Control: private, max-age=3600`
- **Error Contract:** 404 Not Found
- **External Dependencies:** Private object storage / MongoDB GridFS
- **New Backend Route:** `GET /v1/evidence/preview/:publicReference/:index`

---

### 2.3 Coordinator Operations & Incident Review

#### 2.3.1 `GET /api/incidents`
- **Current Handler:** `apps/web/src/app/api/incidents/route.ts`
- **Domain Service:** `IncidentService.listIncidents()`
- **Auth Requirement:** Coordinator Session (`COORDINATOR` or `PLATFORM_ADMIN`)
- **Organization Scope:** Platform wide
- **Request Contract:** Query params: `status`, `urgency`, `limit`, `offset`, `search`
- **Response Contract:** `{ incidents: Incident[], total: number }`
- **Error Contract:** 401 Unauthorized, 403 Forbidden
- **External Dependencies:** MongoDB `incidents`
- **New Backend Route:** `GET /v1/coordinator/incidents`

#### 2.3.2 `POST /api/incidents/[publicReference]/review`
- **Current Handler:** `apps/web/src/app/api/incidents/[publicReference]/review/route.ts`
- **Domain Service:** `IncidentService.recordReview()`
- **Auth Requirement:** Coordinator Session (`incident:review`)
- **Organization Scope:** Platform wide
- **Request Contract:** `{ action: "APPROVE" | "REJECT" | "REQUEST_INFO", notes: string }`
- **Response Contract:** `{ success: true, incident: Incident }`
- **Error Contract:** 400 Bad Request, 401 Unauthorized, 404 Not Found
- **External Dependencies:** MongoDB `incidents`, `audit_events`
- **New Backend Route:** `POST /v1/coordinator/incidents/:publicReference/review`

#### 2.3.3 `POST /api/incidents/[publicReference]/triage`
- **Current Handler:** `apps/web/src/app/api/incidents/[publicReference]/triage/route.ts`
- **Domain Service:** `GeminiTriageService.triageIncident()`
- **Auth Requirement:** Coordinator Session (`incident:review`)
- **Organization Scope:** Platform wide
- **Request Contract:** `{ forceRerun?: boolean }`
- **Response Contract:** `TriageResultSchema`
- **Error Contract:** 401 Unauthorized, 502 Bad Gateway (AI failure gracefully defaults to manual review)
- **External Dependencies:** Google Gemini AI API, MongoDB `incidents`
- **New Backend Route:** `POST /v1/coordinator/incidents/:publicReference/triage`

---

### 2.4 Case Management & Assistance Engine

#### 2.4.1 `GET /api/cases` & `POST /api/cases`
- **Current Handler:** `apps/web/src/app/api/cases/route.ts`
- **Domain Service:** `CaseService.listCases()`, `CaseLifecycleService.createCase()`
- **Auth Requirement:** Coordinator / Case Manager
- **Organization Scope:** Filterable by NGO assignment or platform
- **Request Contract (POST):** `CreateCaseInputSchema`
- **Response Contract:** `CaseSchema` or `{ cases: Case[], total: number }`
- **Error Contract:** 400 Bad Request, 401 Unauthorized
- **External Dependencies:** MongoDB `cases`, `incidents`, `audit_events`
- **New Backend Route:** `GET /v1/cases`, `POST /v1/cases`

#### 2.4.2 `GET /api/cases/[caseReference]`
- **Current Handler:** `apps/web/src/app/api/cases/[caseReference]/route.ts`
- **Domain Service:** `CaseService.getCaseByReference()`
- **Auth Requirement:** Coordinator or Assigned NGO Member
- **Organization Scope:** Tenant-scoped if NGO actor; Platform if Coordinator
- **Request Contract:** Route param `caseReference`
- **Response Contract:** `DetailedCaseSchema`
- **Error Contract:** 403 Forbidden (cross-tenant rejection), 404 Not Found
- **External Dependencies:** MongoDB `cases`, `assignments`, `requirements`
- **New Backend Route:** `GET /v1/cases/:caseReference`

#### 2.4.3 `POST /api/cases/[caseReference]/match`
- **Current Handler:** `apps/web/src/app/api/cases/[caseReference]/match/route.ts`
- **Domain Service:** `MatchingService.findEligibleNGOs()`
- **Auth Requirement:** Coordinator Session
- **Organization Scope:** Geographic + Capacity matching across all verified NGOs
- **Request Contract:** `{ radiusKm?: number, maxMatches?: number }`
- **Response Contract:** `{ matches: NGOMatchResult[] }`
- **Error Contract:** 401 Unauthorized, 404 Not Found
- **External Dependencies:** MongoDB `ngos`, `facilities`, `cases`
- **New Backend Route:** `POST /v1/cases/:caseReference/match`

#### 2.4.4 `POST /api/cases/[caseReference]/assignments`
- **Current Handler:** `apps/web/src/app/api/cases/[caseReference]/assignments/route.ts`
- **Domain Service:** `CaseLifecycleService.createAssignment()`
- **Auth Requirement:** Coordinator Session
- **Organization Scope:** Assigned NGO
- **Request Contract:** `{ ngoId: string, requirementIds: string[], notes?: string }`
- **Response Contract:** `AssignmentSchema`
- **Error Contract:** 400 Bad Request, 409 Conflict (Concurrent assignment lock)
- **External Dependencies:** MongoDB `cases`, `assignments`, `outbox`
- **New Backend Route:** `POST /v1/cases/:caseReference/assignments`

#### 2.4.5 `POST /api/cases/[caseReference]/resolve` & `POST /api/cases/[caseReference]/reopen`
- **Current Handler:** `apps/web/src/app/api/cases/[caseReference]/resolve/route.ts`, `reopen/route.ts`
- **Domain Service:** `CaseLifecycleService.transitionCase()`
- **Auth Requirement:** Coordinator Session
- **Organization Scope:** Platform wide
- **Request Contract:** `{ resolutionEvidence: string[], outcomeNotes: string }`
- **Response Contract:** `CaseSchema`
- **Error Contract:** 400 Invalid State Transition, 403 Forbidden
- **External Dependencies:** MongoDB `cases`, `audit_events`
- **New Backend Route:** `POST /v1/cases/:caseReference/resolve`, `POST /v1/cases/:caseReference/reopen`

#### 2.4.6 `GET /api/assistance/metrics`
- **Current Handler:** `apps/web/src/app/api/assistance/metrics/route.ts`
- **Domain Service:** `AssistanceEngine.getOperationalMetrics()`
- **Auth Requirement:** Coordinator Session
- **Organization Scope:** Global
- **Request Contract:** None
- **Response Contract:** `AssistanceMetricsSchema`
- **Error Contract:** 401 Unauthorized
- **External Dependencies:** MongoDB aggregation pipelines across `cases`, `assignments`, `outbox`
- **New Backend Route:** `GET /v1/assistance/metrics`

#### 2.4.7 `POST /api/assistance/requirements/[requirementId]/outreach/first-wave`
- **Current Handler:** `apps/web/src/app/api/assistance/requirements/[requirementId]/outreach/first-wave/route.ts`
- **Domain Service:** `AssistanceEngine.dispatchFirstWaveOutreach()`
- **Auth Requirement:** Coordinator Session / Engine Dispatcher
- **Organization Scope:** Multi-tenant dispatch
- **Request Contract:** `{ requirementId: string, maxProviders?: number }`
- **Response Contract:** `{ dispatchedAttempts: OutreachAttempt[] }`
- **Error Contract:** 400 Bad Request, 404 Not Found
- **External Dependencies:** MongoDB `assistance_cases`, `assistance_outreach`, `notifications`
- **New Backend Route:** `POST /v1/assistance/requirements/:requirementId/outreach/first-wave`

---

### 2.5 Responders & Field Operations

#### 2.5.1 `GET /api/assignments`
- **Current Handler:** `apps/web/src/app/api/assignments/route.ts`
- **Domain Service:** `ResponderService.listAssignments()`
- **Auth Requirement:** Authenticated Responder or NGO Manager (`x-ngo-id`, session)
- **Organization Scope:** Tenant-restricted to requester's NGO
- **Request Contract:** Query params: `status`, `responderId`
- **Response Contract:** `{ assignments: Assignment[] }`
- **Error Contract:** 401 Unauthorized, 403 Forbidden (cross-tenant isolation enforced)
- **External Dependencies:** MongoDB `assignments`
- **New Backend Route:** `GET /v1/responders/assignments`

#### 2.5.2 `POST /api/assignments/[assignmentId]/accept` & `reject`
- **Current Handler:** `apps/web/src/app/api/assignments/[assignmentId]/accept/route.ts`, `reject/route.ts`
- **Domain Service:** `ResponderService.respondToAssignment()`
- **Auth Requirement:** Verified NGO Responder persona (`verifyResponderAuth`)
- **Organization Scope:** Strict NGO tenancy
- **Request Contract:** `{ reason?: string }`
- **Response Contract:** `AssignmentSchema`
- **Error Contract:** 403 Cross-NGO denial, 409 Already Claimed
- **External Dependencies:** MongoDB `assignments`, `cases`, `audit_events`
- **New Backend Route:** `POST /v1/responders/assignments/:assignmentId/accept`, `reject`

#### 2.5.3 `POST /api/assignments/[assignmentId]/en-route` & `arrived` & `interventions`
- **Current Handler:** `apps/web/src/app/api/assignments/[assignmentId]/en-route/route.ts`, `arrived/route.ts`, `interventions/route.ts`
- **Domain Service:** `ResponderService.updateProgress()`
- **Auth Requirement:** Assigned Responder
- **Organization Scope:** Single assignment scope
- **Request Contract:** `{ notes?: string, latitude?: number, longitude?: number, interventions?: InterventionItem[] }`
- **Response Contract:** `AssignmentSchema`
- **Error Contract:** 400 Bad Request, 403 Forbidden
- **External Dependencies:** MongoDB `assignments`, `cases`
- **New Backend Route:** `POST /v1/responders/assignments/:assignmentId/progress`

---

### 2.6 NGO Registry, Capacity & Facilities

#### 2.6.1 `GET /api/ngos` & `POST /api/ngos`
- **Current Handler:** `apps/web/src/app/api/ngos/route.ts`
- **Domain Service:** `NGOService.listNGOs()`, `createNGO()`
- **Auth Requirement:** Coordinator / Platform Admin
- **Organization Scope:** Platform wide
- **Request Contract (POST):** `CreateNGOInputSchema`
- **Response Contract:** `{ ngos: NGO[], total: number }`
- **Error Contract:** 401 Unauthorized, 400 Bad Request
- **External Dependencies:** MongoDB `ngos`, `organizations`
- **New Backend Route:** `GET /v1/ngos`, `POST /v1/ngos`

#### 2.6.2 `GET /api/ngos/[ngoId]` & `PATCH /api/ngos/[ngoId]`
- **Current Handler:** `apps/web/src/app/api/ngos/[ngoId]/route.ts`
- **Domain Service:** `NGOService.getNGOById()`, `updateNGO()`
- **Auth Requirement:** Coordinator or NGO Admin for `ngoId`
- **Organization Scope:** Self-tenant or Platform Admin
- **Request Contract (PATCH):** `UpdateNGOInputSchema`
- **Response Contract:** `NGOSchema`
- **Error Contract:** 403 Forbidden, 404 Not Found
- **External Dependencies:** MongoDB `ngos`
- **New Backend Route:** `GET /v1/ngos/:ngoId`, `PATCH /v1/ngos/:ngoId`

#### 2.6.3 `POST /api/admin/organizations/[orgId]/verify`
- **Current Handler:** `apps/web/src/app/api/admin/organizations/[orgId]/verify/route.ts`
- **Domain Service:** `OrganizationService.verifyOrganization()`
- **Auth Requirement:** Platform Admin (`PLATFORM_ADMIN`)
- **Organization Scope:** Platform wide
- **Request Contract:** `{ verificationStatus: "VERIFIED" | "REJECTED", verificationNotes: string }`
- **Response Contract:** `OrganizationSchema`
- **Error Contract:** 401 Unauthorized, 403 Forbidden
- **External Dependencies:** MongoDB `organizations`, `audit_events`
- **New Backend Route:** `POST /v1/admin/organizations/:orgId/verify`

#### 2.6.4 `GET /api/facilities`
- **Current Handler:** `apps/web/src/app/api/facilities/route.ts`
- **Domain Service:** `FacilityService.listFacilities()`
- **Auth Requirement:** Public / Authenticated
- **Organization Scope:** Normalized public & NGO facility registry
- **Request Contract:** Query params: `district`, `type`, `lat`, `lng`, `radiusKm`
- **Response Contract:** `{ facilities: Facility[] }`
- **Error Contract:** 400 Bad Request
- **External Dependencies:** MongoDB `facilities`
- **New Backend Route:** `GET /v1/facilities`

#### 2.6.5 `GET /api/geo/pincode`
- **Current Handler:** `apps/web/src/app/api/geo/pincode/route.ts`
- **Domain Service:** Delhi NCR Pincode Normalizer
- **Auth Requirement:** Public
- **Organization Scope:** Open
- **Request Contract:** Query param: `pincode=1100xx`
- **Response Contract:** `{ pincode: string, district: string, state: string, coordinates: { lat, lng } }`
- **Error Contract:** 404 Not Found
- **External Dependencies:** Static Delhi NCR GeoJSON / Registry
- **New Backend Route:** `GET /v1/geo/pincode`

---

### 2.7 Public Signal Discovery & Crawling

#### 2.7.1 `GET /api/discovery/sources` & `POST /api/discovery/sources`
- **Current Handler:** `apps/web/src/app/api/discovery/sources/route.ts`
- **Domain Service:** `DiscoveryService.listSources()`, `registerSource()`
- **Auth Requirement:** Coordinator Session
- **Organization Scope:** Platform wide
- **Request Contract (POST):** `DiscoverySourceSchema`
- **Response Contract:** `{ sources: DiscoverySource[] }`
- **Error Contract:** 400 Bad Request, 401 Unauthorized
- **External Dependencies:** MongoDB `discovery_sources`
- **New Backend Route:** `GET /v1/discovery/sources`, `POST /v1/discovery/sources`

#### 2.7.2 `POST /api/discovery/crawl/run`
- **Current Handler:** `apps/web/src/app/api/discovery/crawl/run/route.ts`
- **Domain Service:** `DiscoveryCrawlerService.executeCrawl()`
- **Auth Requirement:** Coordinator Session or Crawler Key
- **Organization Scope:** Platform wide
- **Request Contract:** `{ sourceId?: string, dryRun?: boolean }`
- **Response Contract:** `CrawlRunSummarySchema`
- **Error Contract:** 401 Unauthorized, 500 Crawl Error
- **External Dependencies:** External HTTP feeds (RSS/JSON with SSRF guard), MongoDB `discovery_runs`, `discovery_candidates`
- **New Backend Route:** `POST /v1/discovery/crawl/run`

#### 2.7.3 `POST /api/discovery/candidates/[candidateId]/convert-to-incident`
- **Current Handler:** `apps/web/src/app/api/discovery/candidates/[candidateId]/convert-to-incident/route.ts`
- **Domain Service:** `DiscoveryService.convertCandidateToIncident()`
- **Auth Requirement:** Coordinator Session
- **Organization Scope:** Platform wide
- **Request Contract:** `{ incidentOverrides?: Partial<Incident> }`
- **Response Contract:** `{ incidentReference: string, candidate: DiscoveryCandidate }`
- **Error Contract:** 400 Bad Request, 404 Not Found
- **External Dependencies:** MongoDB `discovery_candidates`, `incidents`
- **New Backend Route:** `POST /v1/discovery/candidates/:candidateId/convert-to-incident`

---

### 2.8 Notifications & Outbox Worker

#### 2.8.1 `POST /api/notifications/process`
- **Current Handler:** `apps/web/src/app/api/notifications/process/route.ts`
- **Domain Service:** `NotificationOutboxService.processOutboxBatch()`
- **Auth Requirement:** Coordinator Session or Worker Service Secret
- **Organization Scope:** Global batch
- **Request Contract:** `{ batchSize?: number, channel?: string }`
- **Response Contract:** `{ processed: number, delivered: number, failed: number }`
- **Error Contract:** 401 Unauthorized, 500 Outbox Processing Error
- **External Dependencies:** Live SMS/Email provider adapter, MongoDB `notification_outbox`
- **New Backend Route:** `POST /v1/notifications/process` (and scheduled internally on the Fly worker process)

---

### 2.9 Health & Readiness Probes

#### 2.9.1 `GET /api/health`
- **Current Handler:** `apps/web/src/app/api/health/route.ts`
- **Domain Service:** Liveness Probe
- **Auth Requirement:** Public
- **Organization Scope:** System
- **Response Contract:** `{ status: "healthy" | "unhealthy", application: "UMEED", version: string, database: "connected" | "disconnected", uptime_seconds: number }`
- **Status Code:** 200 (if connected), 503 (if DB down in production)
- **New Backend Route:** `GET /health`

#### 2.9.2 `GET /api/ready`
- **Current Handler:** `apps/web/src/app/api/ready/route.ts`
- **Domain Service:** Readiness Probe
- **Auth Requirement:** Public
- **Organization Scope:** System
- **Response Contract:** `{ status: "READY" | "NOT_READY", storage: "persistent_mongodb", region: "bom", latency_ms?: number }`
- **Status Code:** 200 (Ready), 503 (Not Ready)
- **New Backend Route:** `GET /ready`

#### 2.9.3 `GET /api/admin/diagnostics`
- **Current Handler:** `apps/web/src/app/api/admin/diagnostics/route.ts`
- **Domain Service:** Operational Telemetry
- **Auth Requirement:** Verified Coordinator Session / API Key
- **Organization Scope:** System
- **Response Contract:** Detailed service health (DB, AI, Notifications, Memory)
- **Status Code:** 200 (Authorized), 401 (Unauthorized)
- **New Backend Route:** `GET /v1/admin/diagnostics`

---

## 3. Migration Roadmap & Phasing Plan

1. **Phase 1 — Shared Package Normalization:**
   - Ensure `@umeed/contracts` exports all Zod request/response models.
   - Extract framework-agnostic repositories and services into `apps/backend`.
2. **Phase 2 — Fastify Backend Application (`apps/backend`):**
   - Implement Fastify HTTP server with CORS, Cookie parsing, and HMAC proxy authentication plugin.
   - Register route modules matching the `/v1/*` paths documented above.
3. **Phase 3 — Worker Process Group:**
   - Background outbox processor with atomic MongoDB lease locking and exponential backoff retries.
4. **Phase 4 — Vercel API Catch-All BFF Proxy:**
   - Implement `apps/web/src/app/api/[...path]/route.ts` forwarding requests with HMAC-SHA256 headers (`x-umeed-signature`, `x-umeed-timestamp`, `x-umeed-nonce`).
   - Preserve existing client-side `fetch("/api/...")` semantics without changing frontend code.
5. **Phase 5 — Fly.io Deployment & Static Egress:**
   - Author `fly.toml` with Mumbai (`bom`) region, `api` and `worker` process groups, and health checks.
   - Provide exact CLI steps for app-scoped static egress allocation and Atlas IP allowlisting.

