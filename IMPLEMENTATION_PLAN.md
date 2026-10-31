# UMEED Implementation Plan

**Project**: UMEED (HackCBS 9.0)  
**Strategy**: Parallel Workstreams with Continuous Verification & Zero-Placeholder Standards

---

## Milestone Roadmap

### [x] Phase 0 — Repository Inspection & Engineering Plan
- **Objectives**: Audit repository status, toolchains, environment credentials, and MCP servers.
- **Deliverables**: `REPOSITORY_AUDIT.md`, `ENVIRONMENT_AUDIT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`.
- **Status**: Completed.

---

### [ ] Phase 1 — Production Project Foundation
- **Milestone 1.1**: Initialize Next.js App Router project with TypeScript strict mode and Tailwind CSS.
- **Milestone 1.2**: Implement `src/lib/config/env.ts` with strict Zod validation (runtime fail-fast for invalid config).
- **Milestone 1.3**: Implement `src/lib/db/mongodb.ts` supporting connection pooling, cached clients, and graceful disconnection.
- **Milestone 1.4**: Implement structured logging (`src/lib/logging`) and standardized error responses (`src/lib/errors`).
- **Milestone 1.5**: Implement health check endpoint `GET /api/health` verifying memory, uptime, and database connectivity.
- **Milestone 1.6**: Write automated tests for config validation, DB error handling, and health check. Run lint, typecheck, and build.

---

### [ ] Phase 2 — Canonical Incident Contract & Operational Data Model
- **Milestone 2.1**: Define versioned canonical incident contract in `src/features/incidents/types.ts` with Zod schemas.
- **Milestone 2.2**: Define MongoDB models & indexes for `incidents`, `ngos`, `cases`, `evidence`, `ngo_matches`, `review_actions`, `case_events`, `integration_outbox`.
- **Milestone 2.3**: Enforce unique compound index on `{ source_type: 1, source_reference: 1 }` for idempotency.
- **Milestone 2.4**: Implement ingestion endpoint `POST /api/incidents/ingest` with validation, deduplication, and audit timestamps.
- **Milestone 2.5**: Write integration tests for invalid schemas, duplicate submissions, and crawler payload ingestion. Document `API_CONTRACT.md` and `DATA_MODEL.md`.

---

### [ ] Phase 3 — Citizen Incident Reporting & Gemini Multimodal Triage
- **Milestone 3.1**: Build responsive Citizen Incident Reporting UI (`/report`) with subject type, category, GPS/address, description, and photo upload.
- **Milestone 3.2**: Implement secure upload handler (`/api/uploads`) with MIME/size validation and private storage references.
- **Milestone 3.3**: Integrate Gemini Multimodal SDK for structured extraction (incident category, visible condition, urgency recommendation, missing info).
- **Milestone 3.4**: Implement resilient fallback logic when Gemini is offline or quota-exceeded (mark incident for manual triage without crashing).
- **Milestone 3.5**: Build Coordinator Incident Review UI (`/reviewer/incidents/[id]`) showing AI triage vs. citizen submission side-by-side.
- **Milestone 3.6**: Add unit and integration tests for AI triage parsing, low-confidence flags, and missing location scenarios.

---

### [ ] Phase 4 — NGO Intelligence Registry & Explainable Matching Engine
- **Milestone 4.1**: Create NGO data model distinguishing `publicly_listed`, `registration_checked`, and `operationally_verified`.
- **Milestone 4.2**: Generate an authentic, clearly labeled synthetic dataset of operational NGOs across Delhi districts.
- **Milestone 4.3**: Implement multi-factor scoring matching engine (`src/features/ngos/matching.ts`) considering capability, geography, availability, capacity, and history.
- **Milestone 4.4**: Implement endpoints `GET /api/ngos`, `POST /api/ngos`, and `GET /api/ngos/matches/[incidentId]` with transparent scoring breakdown.
- **Milestone 4.5**: Build NGO Directory page (`/ngos`) and Matching Panel on the Case Management page.
- **Milestone 4.6**: Write tests proving capability hard-filtering (a nearby NGO without required capability cannot match).

---

### [ ] Phase 5 — Closed-Loop Case Coordination & State Machine
- **Milestone 5.1**: Build formal case state machine service enforcing `REPORTED` → `UNDER_REVIEW` → `APPROVED` → `MATCHING` → `RESPONDERS_CONTACTED` → `ACCEPTED` → `RESPONDER_ARRIVED` → `INTERVENTION_PROVIDED` → `FOLLOW_UP_REQUIRED` → `RESOLVED`.
- **Milestone 5.2**: Implement immutable audit trail logging actor ID, previous status, new status, timestamp, and action reason into `case_events`.
- **Milestone 5.3**: Build NGO Responder Portal (`/responder/[caseId]`) enabling Accept, Reject with reason, En Route, Arrive, Record Intervention, and Request Follow-up.
- **Milestone 5.4**: Implement recursive assistance allocation: trigger secondary matching when initial intervention leaves remaining unmet needs.
- **Milestone 5.5**: Build Case Detail & Timeline view (`/cases/[id]`) and verified outcome resolution gate.
- **Milestone 5.6**: Write comprehensive transition unit tests and multi-stage workflow integration tests.

---

### [ ] Phase 6 — Meko Coordination Memory Agent
- **Milestone 6.1**: Run isolated Meko integration spike testing MCP server connection and tool schema availability.
- **Milestone 6.2**: Configure Meko MCP in `~/.gemini/config/mcp_config.json` and verify datapack selection.
- **Milestone 6.3**: Implement server-side Meko adapter saving approved coordinator preferences (e.g. preferred dispatch policies for specific districts).
- **Milestone 6.4**: Implement cross-session preference recall and transparent memory provenance display.
- **Milestone 6.5**: Build Coordinator Agent Memory UI with correction, approval, and rejection controls.
- **Milestone 6.6**: Document proof-of-concept in `MEKO_INTEGRATION.md` with repeatable verification scripts.

---

### [ ] Phase 7 — IOMETE Impact Analytics & Integration Outbox
- **Milestone 7.1**: Implement durable Integration Outbox in MongoDB saving lifecycle events transactionally.
- **Milestone 7.2**: Build IOMETE Event Stream worker pushing events to IOMETE Iceberg table with exponential backoff and error tracking.
- **Milestone 7.3**: Build Analytics Dashboard (`/analytics`) displaying reports by district, categories, acceptance rate, response times, and unmet assistance needs.
- **Milestone 7.4**: Implement data coverage warnings and synthetic data labels.
- **Milestone 7.5**: Document setup and SQL queries in `IOMETE_INTEGRATION.md`.

---

### [ ] Phase 8 — Independent Social Distress Discovery Service (Crawler)
- **Milestone 8.1**: Set up independent Python FastAPI microservice in `services/discovery`.
- **Milestone 8.2**: Build FFmpeg frame and audio extraction pipeline.
- **Milestone 8.3**: Integrate OCR and multimodal vision model for visible distress and location clue detection.
- **Milestone 8.4**: Build freshness classifier, duplicate detector, and canonical schema mapper.
- **Milestone 8.5**: Implement integration client submitting structured payloads to `POST /api/incidents/ingest`.
- **Milestone 8.6**: Write standalone tests with synthetic fixtures and document limitations in `DISCOVERY_LIMITATIONS.md`.

---

### [ ] Phase 9 — End-to-End Verification, Security Audit & Deployment
- **Milestone 9.1**: Execute complete 10-step functional user journey from citizen report to verified resolution.
- **Milestone 9.2**: Conduct comprehensive security audit (secrets isolation, validation, RBAC, PII scrubbing).
- **Milestone 9.3**: Polish UI states (loading, empty, error, mobile responsiveness).
- **Milestone 9.4**: Prepare Docker configurations and deployment scripts for Vultr hosting.
- **Milestone 9.5**: Deliver `TEST_REPORT.md`, `SECURITY_REVIEW.md`, `DEMO_READINESS.md`, `DEPLOYMENT.md`.

---

## Verification & Quality Gates
Every phase will conclude with:
1. `npm run lint` / code style verification.
2. `tsc --noEmit` / strict TypeScript compilation.
3. Test suite execution.
4. Next.js production build (`npm run build`).
5. Git commit with meaningful conventional commit message.

