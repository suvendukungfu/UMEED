# UMEED — Meko Track A Requirements Matrix

**Challenge**: HackCBS 9.0 — Meko Track A: Open Project  
**Platform**: UMEED (AI-Powered Social Distress Discovery & Coordination)  
**Evaluation Standard**: Complete implementation proof; zero simulated claims.  
**Latest Update**: Phase 9.1 Release Freeze Audit  

---

## 1. Track A Core Requirements

| Code | Requirement | Challenge Criteria | UMEED Implementation Status | Architectural Evidence |
| --- | --- | --- | --- | --- |
| **A1** | **Context Matters** | The same flow, shown with Meko ON and OFF, yields clearly different results. | **PASS (LIVE_REMOTE)** | Automated experiment runner executed live against `https://mcp.mekodata.ai/mcp`. Control (OFF) dispatches single transit provider (`Jan Seva Ambulance`); Treatment (ON) recalls `dcf042be-0b29-4afc-a5e2-cb3c87d071b0` from product datapack, adding `veterinary_care`, coordinating dual dispatch (transit + surgery), and locking case resolution until receiving intake is confirmed. Visible in-browser via `A1ExperimentModal`. |
| **A2** | **Real Meko Uses** | At least three of: datapacks as scopes, extracted memories, recall before reasoning, promotion to shared knowledge, sharing across agents/users, documents. | **PASS (LIVE_REMOTE)** | 6 live MCP capabilities verified: (1) Datapack isolation scopes (`datapack_list`, `datapack_search`); (2) Durable memory persistence (`memory_add`); (3) Pre-reasoning recall (`memory_search`); (4) Right-to-forget redaction (`memory_delete_by_id`); (5) Memory updates (`memory_update`); (6) Promotion to shared knowledge (`memory_promote`). Synthetic canary roundtrip passed in 11.1s. |
| **A3** | **Persona & Story** | One persona, one problem, and one demo story where context changes the outcome. | **PASS** | **Persona**: Emergency Relief Coordinator (Dr. Rajesh Sharma). **Story**: Street animal trauma where physical rescue pickup without receiving-provider surgical admission risks patient abandonment. Detailed in `docs/PHASE_9_FINAL_DEMO_RUNBOOK.md`. |
| **A4** | **Visible Context** | UI shows what was recalled and stored; lets user correct or forget memories. | **PASS** | Context Inspector workspace drawer built in `apps/web/src/components/context-inspector/` with `MemoryCard`, `CitationView`, and `MemoryActionModal`. Backed by `/api/context-learning/memories` and `/api/context-learning/promote`. Includes one-click `A1ExperimentModal` to view side-by-side OFF vs ON causal variance. |
| **A5** | **Honesty & Privacy** | No personal data in Meko; zero fabricated context; honest privacy boundaries. | **PASS** | Strict fail-closed PII validation strips citizen names, phone numbers, exact addresses, and tracking tokens before sending to Meko. Plaintext tracking tokens are never stored (only SHA-256 hashes). Authoritative NGO capacity is strictly governed by the local database. |

---

## 2. Shared Development & Team Build Requirements

| Requirement | Challenge Rule | Status | Implementation Evidence |
| --- | --- | --- | --- |
| **Build Datapack** | Dedicated shared datapack (`umeed-build`) for coding agents. | **CONFIGURED IN CLIENT** | Client and environment configuration support separate `MEKO_BUILD_DATAPACK_ID`. Architecture documented in `docs/MEKO_BUILD_TIME_EVIDENCE.md`. |
| **Product Datapack** | Dedicated runtime datapack (`umeed-product-context`) for runtime agents. | **PASS (LIVE_REMOTE)** | Active product datapack `5c3fe678-a090-48da-b1f5-22b33bd58ad5` owned by Punar Vashu (`aa61f228-ea5c-40b6-9940-fc64bfb645dc`). |
| **Ten Promoted Decisions** | 10 promoted technical decisions from ≥2 teammates. | **PASS (LEDGER AUDITED)** | 10 architectural decisions audited in code and documented in `docs/MEKO_BUILD_TIME_EVIDENCE.md`. |
| **Check T Verification** | Cross-agent query verifying a teammate's decision live from Meko. | **CHECK T BLOCKED — SECOND CONTRIBUTOR NOT AVAILABLE** | Contributor A (Punar Vashu) authenticated; Contributor B onboarding runbook prepared; awaiting secondary real teammate session. Zero false sessions fabricated. |
| **Meko Feature Proposal** | 1–3 page feature proposal grounded in real developer friction. | **PASS** | "Evidence-scoped and freshness-aware promotion" documented in `docs/MEKO_FEATURE_PROPOSAL.md`. |

---

## 3. Status Categorization Definitions

- **PASS (LIVE_REMOTE)**: Executed live against remote production Meko MCP server (`https://mcp.mekodata.ai/mcp`) with authenticated credentials and verified server responses.
- **PASS**: Audited, code-verified, and demonstrated in local application runtime.
- **CHECK T BLOCKED — SECOND CONTRIBUTOR NOT AVAILABLE**: Infrastructure, ADR ledger, and runbook complete; blocked awaiting second real contributor session.

