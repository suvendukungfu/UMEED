# UMEED — Production-Grade Remediation Plan

**Document Version**: 1.0.0  
**Date**: November 1, 2026  
**Author**: Principal Full-Stack Engineer, Software Architect & Application Security Lead  
**Target Repository**: UMEED Assistance Coordination Platform  
**Status**: APPROVED FOR REMEDIATION  

---

## 1. Executive Summary & Architecture Baseline

UMEED is an AI-powered humanitarian distress discovery and closed-loop assistance coordination platform designed for vulnerable citizens and animals in urban environments (specifically validated across Delhi NCR).

The platform architecture comprises:
- **Contracts (`@umeed/contracts`)**: Strictly validated, type-safe Zod 4.6.6+ schemas for canonical incidents, cases, NGO registries, assistance requirements, outreach attempts, assignments, and audit events.
- **Core Engine & Next.js Web App (`@umeed/web`)**:
  - 9 public and authenticated coordinator routes (`/`, `/report`, `/incidents`, `/cases`, `/ngos`, `/discovery`, `/responder`, `/agent`, `/analytics`).
  - Next.js 15.5.28 App Router backend APIs.
  - Multi-tiered repository pattern with dual implementations:
    1. Production-ready MongoDB Atlas repositories with 2dsphere, unique compound, and idempotency indexing.
    2. Ephemeral in-memory fallback repositories anchored to `globalThis` for deterministic test suites and local zero-dependency demonstration.
  - Multimodal AI Triage powered by `@google/genai` (Gemini 2.5 Flash) with strict zero-harm ethical guardrails and schema validation.
  - Explainable Matching Engine scoring NGOs across geographic proximity, service specialization, capacity, reliability, and freshness.
  - Closed-Loop Assistance Engine with exclusive provider assignments, timeout watchdogs, recursive escalation, and append-only audit event ledgers.

---

## 2. Confirmed Defects and Root-Cause Analysis

### Defect 1: Next.js In-Memory Route Isolation in Ephemeral Demo Mode
- **Symptom**: In local demonstration mode without external MongoDB Atlas credentials, incidents submitted via `POST /api/incidents/ingest` returned HTTP 404 when looked up by tracking reference in other API route handlers (`/api/incidents/[publicReference]`, `/api/cases`).
- **Root Cause**: Next.js App Router bundles API routes as independent webpack/turbopack chunks. File-scoped singleton variables (`let inMemoryFallbackSingleton = null`) were reinstantiated per route chunk, breaking state continuity in memory.
- **Affected Files**:
  - `apps/web/src/features/incidents/repositories/index.ts`
  - `apps/web/src/features/cases/repositories/index.ts`
  - `apps/web/src/features/ngos/repositories/index.ts`
  - `apps/web/src/features/assistance-engine/repositories/index.ts`
- **Proposed Repair**: Anchor fallback in-memory repository singletons to `globalThis` (e.g. `(globalThis as any)._umeedIncidentRepo`), matching the pattern established in `features/discovery`.
- **Risk Level**: Low.
- **Verification Method**: Submit citizen report via API and retrieve immediately through separate route handlers.

### Defect 2: Coordinator API Key Dev Mismatch in Client Views
- **Symptom**: Frontend coordinator views using `"x-coordinator-key": "umeed-coordinator-dev-key"` received 401 Unauthorized when `.env.local` configured a custom `COORDINATOR_API_KEY`.
- **Root Cause**: `verifyCoordinatorAuth` tested strictly against `process.env.COORDINATOR_API_KEY`, failing to accept the well-known local development key during non-production runs.
- **Affected Files**:
  - `apps/web/src/lib/security/authorization.ts`
- **Proposed Repair**: Permit `DEV_DEFAULT_COORDINATOR_KEY` strictly when `NODE_ENV !== "production"` alongside the configured key, while maintaining constant-time comparison and fail-closed production enforcement.
- **Risk Level**: Low.
- **Verification Method**: Verify authenticated coordinator routes succeed with both keys in development; verify production mode strictly rejects default keys.

### Defect 3: Notification Outbox Falsely Marks Mock Delivery as "DELIVERED"
- **Symptom**: When simulated notifications are dispatched via `MockNotificationAdapter`, the outbox record status was updated to `"DELIVERED"` rather than `"SIMULATED"`.
- **Root Cause**: `NotificationOutboxService.processOutbox()` hardcoded `status: "DELIVERED"` on send success without inspecting `adapter.isMock()`.
- **Affected Files**:
  - `apps/web/src/features/assistance-engine/services/notification-outbox.service.ts`
  - `packages/contracts/src/engine.ts`
- **Proposed Repair**: Add `"SIMULATED"` to `OutboxStatusSchema` and set outbox status to `"SIMULATED"` when `adapter.isMock()` is true, upholding Rule 8 (honest status reporting).
- **Risk Level**: Low.
- **Verification Method**: Run outbox processing with mock adapter; verify database record status is `"SIMULATED"`.

### Defect 4: AI Triage Missing Prompt Injection Armor & Transient Retry Policy
- **Symptom**: Citizen description was concatenated directly into prompt string, creating potential susceptibility to prompt injection attacks. Transient API rate limits (HTTP 429) or timeouts immediately triggered fallback without retries.
- **Root Cause**: `buildTriageUserPrompt` lacked delimiter fencing. `GeminiTriageService` lacked bounded retries with exponential backoff.
- **Affected Files**:
  - `apps/web/src/lib/ai/gemini/prompts.ts`
  - `apps/web/src/lib/ai/gemini/triage.service.ts`
- **Proposed Repair**:
  1. Enclose untrusted citizen inputs in `<<<UNTRUSTED_CITIZEN_SUBMISSION>>>` tags with explicit instructions instructing the model to treat content as passive data.
  2. Implement bounded retries (up to 2 retries with backoff) for transient errors before falling back to manual review.
  3. Clearly record canonical analysis statuses: `LIVE_AI_SUCCESS`, `MANUAL_FALLBACK`, `AI_PROVIDER_ERROR`, `PENDING_REVIEW`.
- **Risk Level**: Low.
- **Verification Method**: Automated tests testing prompt injection resistance, transient retry handling, and unconfigured key fallback.

### Defect 5: Analytics Page Disconnected from Real Engine Metrics API
- **Symptom**: The `/analytics` dashboard rendered static dummy values from a constant array (`DISTRICT_METRICS`) instead of aggregating live data from `/api/assistance/metrics`.
- **Root Cause**: UI component was created with mock placeholders rather than dynamic client fetching.
- **Affected Files**:
  - `apps/web/src/app/analytics/page.tsx`
- **Proposed Repair**: Update `AnalyticsPage` to fetch live data from `/api/assistance/metrics`, displaying real database counts, zero-state indicators, and transparent historical disclosure.
- **Risk Level**: Low.
- **Verification Method**: Verify `/analytics` makes request to `/api/assistance/metrics` and correctly displays real database-backed totals.

### Defect 6: Stale Reopening Protection on Resolved Cases
- **Symptom**: An out-of-order or duplicate responder progress request could update a case that has already transitioned to `RESOLVED` or `CLOSED`.
- **Root Cause**: `CaseLifecycleService` did not assert that progress updates are prohibited once an assignment or requirement is in terminal `RESOLVED` state.
- **Affected Files**:
  - `apps/web/src/features/assistance-engine/services/case-lifecycle.service.ts`
- **Proposed Repair**: Add strict guard asserting `status !== "RESOLVED"` and `status !== "CANCELLED"` in `recordProgress`, throwing `409 Conflict` if attempted without formal coordinator reopening.
- **Risk Level**: Low.
- **Verification Method**: Attempt progress update on resolved assignment; verify 409 Conflict.

### Defect 7: MongoDB Reconnection Handling on Transient Client Rejection
- **Symptom**: If MongoDB connection fails initially or drops, `global._mongoClientPromise` cached the rejected promise, preventing future connection attempts from succeeding without restarting the Node process.
- **Root Cause**: Missing `.catch()` handler on the cached promise to reset `global._mongoClientPromise = undefined`.
- **Affected Files**:
  - `apps/web/src/lib/db/mongodb.ts`
- **Proposed Repair**: Reset cached promise on rejection to allow seamless subsequent reconnection attempts.
- **Risk Level**: Low.
- **Verification Method**: Simulate rejected connection promise and verify subsequent request triggers a fresh connection attempt.

---

## 3. Implementation and Verification Roadmap

| Phase | Remediation Focus | Verification Milestone |
| :--- | :--- | :--- |
| **Phase 2** | Database & Persistence: Global singletons & reconnection cleanup | Ingestion + restart state continuity test |
| **Phase 3** | Incident Lifecycle: Validated server-side state machine & reopening guard | Lifecycle integration tests with valid/invalid transition checks |
| **Phase 4** | AI Triage: Prompt injection fence, bounded retries, canonical status enums | AI evaluation benchmark & injection tests |
| **Phase 5** | NGO Matching & Dispatch: Exclusive assignment locking & competing offer cancellation | Concurrency tests for simultaneous acceptance |
| **Phase 6** | Notification System: Truthful `"SIMULATED"` outbox status & retry tracking | Outbox service test verifying honest simulation statuses |
| **Phase 7** | Security & Authorization: Defense-in-depth API protection | Authenticated endpoint matrix testing |
| **Phase 8** | Dashboard & UI: Real metrics on `/analytics`, empty states, contrast | Browser inspection across mobile and desktop |
| **Phase 9** | End-to-End Automation: 15-step complete humanitarian lifecycle | Automated end-to-end integration test |
| **Phase 10**| Regression & Build: Full test suite, TypeScript, ESLint, production build | 252+ tests passing, 0 type errors, clean build |
| **Phase 11**| Final Delivery: Truthful verification report and preview URL | `docs/UMEED_REMEDIATION_REPORT.md` |

