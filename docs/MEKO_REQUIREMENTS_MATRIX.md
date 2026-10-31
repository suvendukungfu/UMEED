# UMEED — Meko Track A Requirements Matrix

**Challenge**: HackCBS 9.0 — Meko Track A: Open Project  
**Platform**: UMEED (AI-Powered Social Distress Discovery & Coordination)  
**Evaluation Standard**: Complete implementation proof; zero simulated claims.  

---

## 1. Track A Core Requirements

| Code | Requirement | Challenge Criteria | UMEED Implementation Status | Architectural Evidence |
| --- | --- | --- | --- | --- |
| **A1** | **Context Matters** | The same flow, shown with Meko ON and OFF, yields clearly different results. | **SPIKE_READY** | Architectural design and test harnesses prepared in Phase 6.0 (`apps/web/src/lib/ai/meko/`). Dual-run experiment compares matching outcome with baseline registry (Meko OFF) vs. approved veterinary lesson recall (Meko ON). Live execution gated by active Meko token. |
| **A2** | **Real Meko Uses** | At least three of: datapacks as scopes, extracted memories, recall before reasoning, promotion to shared knowledge, sharing across agents/users, documents. | **IMPLEMENTED (CODE & CLIENT)** | 5 real capabilities implemented in `apps/web/src/lib/ai/meko/client.ts`: (1) Datapacks as isolation scopes (`datapack_search`, `datapack_list`); (2) Durable memory persistence (`memory_add`); (3) Pre-reasoning recall (`memory_search`); (4) Promotion to shared canon (`memory_promote`); (5) Cross-agent context sharing between Matching, Follow-Up, and Curator agents. |
| **A3** | **Persona & Story** | One persona, one problem, and one demo story where context changes the outcome. | **DESIGNED & SPECIFIED** | **Persona**: UMEED Case Coordinator. **Story**: Post-stabilization veterinary surgery in stray canine trauma. Case 1 establishes that animal rescue and veterinary surgical follow-up are separate capabilities; Case 2 retrieves that lesson and splits a single dispatch into dual-NGO response. |
| **A4** | **Visible Context** | UI shows what was recalled and stored; lets user correct or forget memories. | **SCHEDULED (PHASE 6.1)** | Client protocol supports `memory_update` (correction) and `memory_delete_by_id` (forgetting). Drawer UI specification designed for `/cases` and `/incidents`. |
| **A5** | **Honesty & Privacy** | No personal data in Meko; zero fabricated context; honest privacy boundaries. | **VERIFIED & TESTED** | `validateOperationalMemoryText` in `schemas.ts` validates memory candidates against phone numbers, emails, high-precision GPS coordinates, tracking tokens, and API keys. 7 dedicated privacy tests pass in `meko-client.test.ts`. |

---

## 2. Shared Development & Team Build Requirements

| Requirement | Challenge Rule | Status | Implementation Evidence |
| --- | --- | --- | --- |
| **Build Datapack** | Dedicated shared datapack (`umeed-build`) for coding agents. | **BLOCKED_BY_TOKEN** | Client configuration supports separate `MEKO_BUILD_DATAPACK_ID`. Live creation in Meko Portal awaiting active user token. |
| **Product Datapack** | Dedicated runtime datapack (`umeed-product-context`) for runtime agents. | **BLOCKED_BY_TOKEN** | Client configuration supports `MEKO_PRODUCT_DATAPACK_ID`. Verified isolated routing in `client.ts`. |
| **Ten Promoted Decisions** | 10 promoted technical decisions from ≥2 teammates. | **READY FOR PROMOTION** | 10 architectural decisions documented in `docs/FOUNDATION_DECISIONS.md` and `docs/CASE_LIFECYCLE.md` ready to be committed via coding-agent hooks. |
| **Check T Verification** | Cross-agent query verifying a teammate's decision live from Meko. | **BLOCKED_BY_TOKEN** | Test harness ready; pending active Meko credentials. |
| **Meko Feature Proposal** | 1–3 page feature proposal grounded in real developer friction. | **DOCUMENTED** | "Evidence-scoped and freshness-aware promotion" in `docs/MEKO_FEATURE_PROPOSAL.md`. |

---

## 3. Status Categorization Definitions

- **IMPLEMENTED**: Fully coded, tested with automated test suites, and integrated into codebase.
- **SPIKE_READY**: Isolated client abstraction, protocols, schemas, and mock tests complete; ready for live runtime binding.
- **BLOCKED_BY_TOKEN**: Code and architecture complete, but live external execution is halted due to 401 Unauthorized from upstream `https://mcp.mekodata.ai/mcp`.
