# UMEED — Current State and Comprehensive Gap Analysis
**Generated**: 2026-11-01  
**Classification**: Engineering Baseline Audit (Milestone 0)  
**Author**: Principal Software Architect & QA Lead  

---

## 1. Executive Summary

This document establishes the verified baseline of the UMEED Humanitarian Assistance Platform following comprehensive codebase inspection, automated typechecks, lint audits, test suite executions (267 passing tests: 248 web + 19 contracts), and live production deployment evaluations on Vercel.

UMEED has established solid domain contracts, zero-key PIN resolution, canonical incident schemas, and an explainable NGO matching engine. However, transforming it into a real-world, enterprise-grade, deployable humanitarian platform requires addressing key operational, data isolation, and integration gaps.

---

## 2. Baseline Status Matrix

| Component / Layer | Current Status | Baseline Evidence |
| :--- | :--- | :--- |
| **Contracts Workspace (`@umeed/contracts`)** | PASS | 19/19 Vitest tests passing; zero TypeScript errors. |
| **Web Workspace (`@umeed/web`)** | PASS | 248/248 Vitest tests passing; 53 static/dynamic routes compiling cleanly. |
| **Linter (`npm run lint:umeed`)** | PASS | 0 warnings, 0 errors. |
| **Vercel Production Deployment** | PASS | `https://umeed-platform-nu.vercel.app` responding 200 OK across all primary routes. |
| **Meko MCP Integration** | BLOCKED | Meko MCP server (`https://mcp.mekodata.ai/mcp`) is not registered in the local MCP runtime environment. Repository documentation serves as local engineering memory. |

---

## 3. Comprehensive Gap Analysis

### Gap 1: Persistent Auth & Entity Storage in MongoDB Atlas
- **Existing Behavior**: `InMemoryAuthRepository` handles users, sessions, and memberships. When `MONGODB_URI` is absent or when fallback is allowed, state resides in memory singletons.
- **Evidence**: `apps/web/src/features/auth/repositories/memory-auth.repository.ts` exists without a matching `mongo-auth.repository.ts`.
- **Root Cause**: Initial implementation prioritized in-memory auth for fast test suite execution.
- **Affected Modules**: `apps/web/src/features/auth/repositories/`, `apps/web/src/lib/db/mongodb.ts`.
- **Severity**: HIGH.
- **Proposed Correction**: Implement `MongoAuthRepository` with strict schemas, unique email/session indices, and a unified repository factory that binds to MongoDB Atlas in production.
- **Regression Risk**: Low; in-memory repository preserved for isolated Vitest unit runs.
- **Validation Method**: Integration tests connecting to mock/in-memory or Atlas cluster verifying user/session persistence across instances.

---

### Gap 2: Formal Partner Onboarding & Verification Workflow
- **Existing Behavior**: Organizations can be seeded via `seed-real`, but a self-service onboarding flow for legal NGO representatives (submitting registration, 12A/80G/FCRA, facilities, and contact details) followed by an administrative review queue is partially wired.
- **Evidence**: `/app/ngo/onboarding` page exists but needs end-to-end API persistence (`POST /api/ngos/onboard` or `/api/auth/onboard-organization`) and administrator approval endpoint (`POST /api/admin/organizations/[orgId]/verify`).
- **Root Cause**: Real-seed normalization separated entities in Phase 1, but administrative verification lifecycle needs direct API backing.
- **Affected Modules**: `apps/web/src/features/ngos/`, `apps/web/src/app/api/ngos/`, `apps/web/src/app/app/admin/`.
- **Severity**: HIGH.
- **Proposed Correction**: Implement complete organization onboarding workflow with document metadata, contact verification, and explicit `OperationalVerificationState` transitions (`DISCOVERED` -> `PARTNER_APPLIED` -> `UNDER_REVIEW` -> `PARTNER_ONBOARDED` -> `CAPACITY_CONFIRMED`).
- **Regression Risk**: Low; additive API endpoints.
- **Validation Method**: Multi-step onboarding and approval integration test.

---

### Gap 3: Concurrency-Safe Exclusive Assignment & Outreach Supersession
- **Existing Behavior**: Outreach attempts are created, but atomic concurrency locking during NGO acceptance (`POST /api/assistance/outreach/[attemptId]/accept`) must guarantee that exactly one primary assignment is awarded, with all competing outreach attempts transitioning to `SUPERSEDED`.
- **Evidence**: `apps/web/src/features/assistance-engine/services/case-lifecycle.service.ts` contains state transitions, but needs explicit optimistic locking or transactional constraints for competing acceptances.
- **Root Cause**: Concurrency edge cases were tested sequentially rather than under racing conditions.
- **Affected Modules**: `apps/web/src/features/assistance-engine/`, `apps/web/src/features/cases/`.
- **Severity**: HIGH.
- **Proposed Correction**: Implement atomic conditional update on requirement/case state: `UPDATE requirement SET status = 'ACCEPTED_ACTIVE', assigned_to = orgId WHERE status = 'OUTREACH_ACTIVE' AND assigned_to IS NULL`. If modified count is 0, reject competing acceptance as conflict.
- **Regression Risk**: Medium; requires state machine consistency.
- **Validation Method**: Concurrent acceptance simulation test.

---

### Gap 4: Notification Outbox Architecture & Real Provider Transparency
- **Existing Behavior**: In tests, `MockNotificationAdapter` simulates dispatch. In production, unconfigured channels must report `NOT_CONFIGURED` without claiming false delivery.
- **Evidence**: `apps/web/src/features/assistance-engine/services/notification-outbox.service.ts` tracks outbox states, but provider adapter resolution must enforce strict provider contracts (Twilio/SendGrid/Webhook) with delivery status reconciliation.
- **Root Cause**: Development environments lack live telecom/email gateways.
- **Affected Modules**: `apps/web/src/features/notifications/`, `apps/web/src/features/assistance-engine/`.
- **Severity**: MEDIUM-HIGH.
- **Proposed Correction**: Durable outbox with explicit states (`CREATED`, `QUEUED`, `PROCESSING`, `ACCEPTED_BY_PROVIDER`, `DELIVERED`, `READ`, `FAILED`, `CANCELLED`). Production mode throws or flags `NOT_CONFIGURED` if credentials are empty; never silently claim success.
- **Regression Risk**: Low; tests use mock adapter explicitly labeled as `is_mock: true`.
- **Validation Method**: Outbox contract and adapter tests verifying error handling when API keys are missing.

---

### Gap 5: Advisory AI Boundaries & Prompt Injection Protections
- **Existing Behavior**: Gemini multimodal triage provides urgency, category, and reasoning.
- **Evidence**: `apps/web/src/lib/ai/gemini/triage.service.ts` processes input.
- **Root Cause**: Need strict architectural guardrails preventing AI triage from automatically approving incidents or initiating dispatch without coordinator sign-off.
- **Affected Modules**: `apps/web/src/lib/ai/gemini/`, `apps/web/src/features/incidents/services/`.
- **Severity**: HIGH (Safety Critical).
- **Proposed Correction**: Enforce fail-safe advisory policy: AI output is strictly labeled `AI_ADVISORY`. Incident status remains `TRIAGED` or `REQUIRES_HUMAN_REVIEW` until an authenticated `COORDINATOR` explicitly approves conversion to an operational `CASE`.
- **Regression Risk**: Low; aligns with existing safety architecture.
- **Validation Method**: Automated tests asserting that unapproved incidents cannot trigger matching or dispatch.

---

### Gap 6: Granular Geospatial Privacy Controls
- **Existing Behavior**: Public tracking endpoint (`/api/incidents/[publicReference]`) sanitizes lat/long to `null`.
- **Evidence**: Verified in live smoke test (returned `latitude: null, longitude: null`).
- **Root Cause**: Need consistent 3-tier geospatial privacy across the entire platform:
  1. *Public*: District/Pincode only; zero exact coordinates.
  2. *Coordinator / NGO Search*: Approximate vicinity (1-km bounding box or district centroid) prior to acceptance.
  3. *Assigned Responder*: Exact coordinates unlocked ONLY upon verified assignment acceptance.
- **Affected Modules**: `apps/web/src/features/incidents/services/privacy.service.ts`, `apps/web/src/features/cases/services/privacy.service.ts`.
- **Severity**: HIGH (Beneficiary Protection).
- **Proposed Correction**: Implement 3-tier privacy masking in repository and service serialization layers.
- **Regression Risk**: Low.
- **Validation Method**: Unit tests verifying coordinate masking across public, unassigned, and assigned scopes.

---

## 4. Milestone Execution Plan

1. **Milestone 1**: Production Data Foundation & Entity Normalization (MongoDB Schemas, Migrations, Provenance).
2. **Milestone 2**: Identity and Multi-Tenant RBAC (MongoAuthRepository, Central Authorization Policy, Tenant Isolation Tests).
3. **Milestone 3**: NGO Portal & Partner Verification (Onboarding API, Admin Review Queue, Atomic Acceptance).
4. **Milestone 4**: Citizen & Coordinator Operations (Triage Queue, Human Review, Incident Conversion).
5. **Milestone 5**: Matching & Field Operations (Explainable Ranking, Responder Workspace, Lifecycle Progression).
6. **Milestone 6**: Real External Providers & Durable Notification Outbox (Explicit NOT_CONFIGURED reporting, Gemini Advisory Bounds).
7. **Milestone 7**: UI/UX, Design System & Accessibility (Unified App Shell, Role-Specific Dashboards, WCAG 2.2 AA).
8. **Milestone 8**: Reliability, Structured Logging, Health Checks & Deployment Runbooks.
9. **Milestone 9**: Independent QA Verification & Acceptance Report.
