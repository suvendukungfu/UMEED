# UMEED — Meko Track A Requirements Matrix

**Challenge**: HackCBS 9.0 — Meko Track A: Open Project  
**Platform**: UMEED (AI-Powered Social Distress Discovery & Coordination)  
**Evaluation Standard**: Complete implementation proof; zero simulated claims.  
**Latest Update**: Phase 6.2B Engineering Completion  

---

## 1. Track A Core Requirements

| Code | Requirement | Challenge Criteria | UMEED Implementation Status | Architectural Evidence |
| --- | --- | --- | --- | --- |
| **A1** | **Context Matters** | The same flow, shown with Meko ON and OFF, yields clearly different results. | **PASS (AUTOMATED & REPEATABLE)** | Automated experiment runner implemented in `apps/web/src/features/context-learning/experiments/a1-runner.ts`. Control (OFF) preserves single-stage transport baseline; Treatment (ON) recalls `mem_lesson_vet_trauma_001` and injects `veterinary_care` requirement and clinical handoff checkpoint. Tested in `a1-experiment.test.ts`. Live execution gated on local key. |
| **A2** | **Real Meko Uses** | At least three of: datapacks as scopes, extracted memories, recall before reasoning, promotion to shared knowledge, sharing across agents/users, documents. | **IMPLEMENTED (5 CAPABILITIES)** | 5 real capabilities implemented: (1) Datapacks as isolation scopes (`datapack_search`, `datapack_list`); (2) Durable memory persistence (`memory_add`); (3) Pre-reasoning recall (`memory_search`); (4) Promotion to shared canon (`memory_promote`); (5) Cross-agent context sharing between `MatchingAgent`, `FollowUpAgent`, and `KnowledgeCurator`. |
| **A3** | **Persona & Story** | One persona, one problem, and one demo story where context changes the outcome. | **IMPLEMENTED & SCRIPTED** | **Persona**: UMEED Emergency Coordinator (Dr. Sharma). **Story**: Street animal trauma where physical rescue pickup without receiving-provider surgical admission risks patient abandonment. Detailed in `docs/HACKCBS_DEMO_SCRIPT.md` and `docs/A1_MEKO_ON_OFF_EXPERIMENT.md`. |
| **A4** | **Visible Context** | UI shows what was recalled and stored; lets user correct or forget memories. | **IMPLEMENTED (UI & API)** | Context Inspector workspace drawer built in `apps/web/src/components/context-inspector/` with sub-components (`MemoryCard`, `CitationView`, `PromotionModal`). Backed by authenticated API routes (`/api/context-learning/memories`, `/api/context-learning/promote`). Supports inspection, correction (`memory_update`), and forgetting (`memory_delete_by_id`). |
| **A5** | **Honesty & Privacy** | No personal data in Meko; zero fabricated context; honest privacy boundaries. | **VERIFIED & TESTED** | `validateOperationalMemoryText` enforces strict fail-closed PII validation (blocking phone numbers, emails, Aadhaar/PAN, precise GPS coordinates, tracking tokens). Tested across 26 Meko unit tests and domain tests. Honest reporting of local vs live state. |

---

## 2. Shared Development & Team Build Requirements

| Requirement | Challenge Rule | Status | Implementation Evidence |
| --- | --- | --- | --- |
| **Build Datapack** | Dedicated shared datapack (`umeed-build`) for coding agents. | **AWAITING_LOCAL_SECRET_ENTRY** | Client and environment configuration support separate `MEKO_BUILD_DATAPACK_ID`. Architecture documented in `docs/MEKO_BUILD_TIME_EVIDENCE.md`. |
| **Product Datapack** | Dedicated runtime datapack (`umeed-product-context`) for runtime agents. | **AWAITING_LOCAL_SECRET_ENTRY** | Client configuration supports `MEKO_PRODUCT_DATAPACK_ID`. Verified isolated routing in `apps/web/src/lib/ai/meko/client.ts`. |
| **Ten Promoted Decisions** | 10 promoted technical decisions from ≥2 teammates. | **READY FOR PROMOTION** | 10 architectural decisions documented in `docs/MEKO_BUILD_TIME_EVIDENCE.md` spanning architecture, contracts, safety, matching, and Meko protocols. |
| **Check T Verification** | Cross-agent query verifying a teammate's decision live from Meko. | **AWAITING_LOCAL_SECRET_ENTRY** | Protocol harness implemented; awaiting active Meko API credentials in `apps/web/.env.local`. |
| **Meko Feature Proposal** | 1–3 page feature proposal grounded in real developer friction. | **DOCUMENTED** | "Evidence-scoped and freshness-aware promotion" documented in `docs/MEKO_FEATURE_PROPOSAL.md`. |

---

## 3. Status Categorization Definitions

- **IMPLEMENTED**: Fully coded, tested with automated test suites, and integrated into codebase.
- **PASS (AUTOMATED & REPEATABLE)**: Automated end-to-end experiment passing in test runner and unit test suites; live execution gated on local secret entry.
- **AWAITING_LOCAL_SECRET_ENTRY**: Code, protocol, and schemas complete; awaiting user's active API token in local `.env.local` to trigger live network operations.
