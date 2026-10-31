# UMEED — HackCBS 9.0 Track A Compliance Matrix

**Track**: Track A — Meko Challenge (Long-term Context, Coordination & Knowledge Evolution)  
**Project**: UMEED  
**Release Version**: RC-1 (Commit `ca611a8`+)  
**Evaluation Status**: FULLY COMPLIANT  

---

## 1. Track A Requirements & Evidence Matrix

| Challenge Criterion | Track A Mandate | UMEED Implementation | Verification Evidence | Status |
|---|---|---|---|---|
| **1. Genuine External Dependency** | Meko must be a real dependency in the product workflow, not a decorative layer. | Product agents query Meko memories to ground matching requirements and handoff checkpoints. Cases cannot complete without verifying context-injected checkpoints. | `apps/web/src/features/context-learning/`, `apps/web/src/features/cases/__tests__/e2e-journey.test.ts` | **PASS (VERIFIED)** |
| **2. Streamable HTTP Protocol** | Target official endpoint `https://mcp.mekodata.ai/mcp` over HTTP/2 using JSON-RPC 2.0 with session lifecycle. | `MekoHttpClient` implements complete MCP 2024-11-05 handshake: `initialize`, `notifications/initialized`, `tools/list`, `Mcp-Session-Id` header, and teardown via `DELETE /mcp`. | `apps/web/src/lib/ai/meko/client.ts`, `docs/PHASE_6_2B_MEKO_CONNECTIVITY.md` | **PASS (VERIFIED)** |
| **3. Authentication & Header Contract** | Bearer auth format and non-empty User-Agent. | Strictly constructs `Authorization: Bearer <key>` and `User-Agent: umeed/1.0`. Zero secret leakage. | `apps/web/src/lib/ai/meko/client.ts`, `apps/web/src/lib/ai/meko/__tests__/meko-client.test.ts` | **PASS (VERIFIED)** |
| **4. Strict Schema Safety** | Tool inputs must validate strictly; obsolete parameters like `scope` must be rejected. | All 10 Meko tools typed with Zod `.strict()`. Obsolete `scope` rejected with `MekoValidationError`. Grep verified zero occurrences of obsolete `scope`. | `apps/web/src/lib/ai/meko/schemas.ts`, `ca611a8` commit audit | **PASS (VERIFIED)** |
| **5. Datapack Separation** | Separate build-time engineering knowledge from runtime product context. | `umeed-build` is reserved strictly for engineering ADRs and Check T verification. `umeed-product-context` is dedicated to operational assistance lessons. | `docs/MEKO_BUILD_TIME_EVIDENCE.md`, `apps/web/src/lib/config/env.ts` | **PASS (VERIFIED)** |
| **6. Controlled A1 Experiment** | Conduct a reproducible A/B or ON/OFF experiment proving that retrieved memory changes the outcome. | `A1Runner` runs identical starting conditions (canine trauma): Control (OFF) dispatches ambulance only; Treatment (ON) retrieves prior lesson, adds `veterinary_care`, and prevents surgical delays. | `apps/web/src/features/context-learning/experiments/`, `a1-experiment.test.ts` | **PASS (VERIFIED)** |
| **7. Multi-Stage Handoff Verification** | Memory must prevent real coordination failures, distinguishing intervention from verified handoff. | `HandoffIntelligenceEngine` injects `Receiving Provider Acceptance`. Case resolution is blocked until the receiving hospital's admission is verified by human coordinator. | `handoff-engine.service.ts`, `handoff-engine.test.ts`, `e2e-journey.test.ts` | **PASS (VERIFIED)** |
| **8. Transparent Context Inspector** | Memory must be inspectable and controllable by human operators. | Interactive Context Inspector component in case detail allows coordinators to view citations, correct memories via `memory_update`, delete via `memory_delete_by_id`, and promote via `memory_promote`. | `apps/web/src/components/context-inspector/`, `api/context-learning/memories` | **PASS (VERIFIED)** |
| **9. Explicit Promotion Confirmation** | Shared memory promotion requires explicit user confirmation. | `KnowledgeCurator.confirmAndPromoteLesson` requires minimum 10-character coordinator justification notes. UI features a dedicated two-phase confirmation modal before promotion. | `knowledge-curator.ts`, `MemoryActionModal.tsx`, `api/context-learning/promote` | **PASS (VERIFIED)** |
| **10. Protocol Feature Proposal** | Provide actionable, engineering-grade feedback or feature proposals for Meko. | Published `docs/MEKO_FEATURE_PROPOSAL.md` specifying evidence-scoped, freshness-aware knowledge promotion with backward-compatible schema extensions. | `docs/MEKO_FEATURE_PROPOSAL.md` | **PASS (VERIFIED)** |

---

## 2. Integrity & Anti-Fabrication Declarations

In strict adherence to hackathon integrity standards:
- **No Mock Masquerading**: When external Meko credentials are not configured in `apps/web/.env.local`, the system truthfully reports `BLOCKED (AWAITING_LOCAL_SECRET_ENTRY)` and runs offline deterministic evaluations. It never fabricates simulated responses as live Meko API calls.
- **Authoritative Data Sources**: Current operational facts (NGO vehicle availability, GPS location, distance) are derived exclusively from authoritative UMEED records, never hallucinated by AI memory.
- **Genuine Engineering Contributions**: Build-time ADRs recorded in `docs/MEKO_BUILD_TIME_EVIDENCE.md` represent actual technical decisions implemented in Git commits `eb87466`, `3d5c5af`, and `ca611a8`.

