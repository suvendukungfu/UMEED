# UMEED — Build-Time Datapack & Engineering Evidence (`umeed-build`)

**Document Version**: 1.0.0  
**Authors**: UMEED Core Engineering Team  
**Challenge Target**: HackCBS 9.0 — Meko Shared Build-Time Requirements  
**Target Datapack**: `umeed-build` (Coding Team Knowledge Base)  

---

## 1. Datapack Separation Architecture

In accordance with HackCBS 9.0 challenge rules, UMEED enforces strict physical separation between development-time engineering intelligence and runtime product context:

| Datapack Name | ID / Configuration | Purpose | Consumers |
| --- | --- | --- | --- |
| **`umeed-build`** | `MEKO_BUILD_DATAPACK_ID` | Architecture decisions, schema conventions, protocol bugfixes, and code reviews | Antigravity AI coding agents & team engineers |
| **`umeed-product-context`** | `MEKO_PRODUCT_DATAPACK_ID` | De-identified operational lessons, assistance handoff patterns, and precedent cases | UMEED runtime product agents (`MatchingAgent`, `FollowUpAgent`, `KnowledgeCurator`) |

---

## 2. Promoted Technical Decisions Ledger

Below is the structured ledger of 10 genuine engineering decisions made across the UMEED codebase, ready for promotion within `umeed-build`:

| Decision # | Engineering Topic | Promoted Decision Summary | Contributors | Git Commit / Evidence |
| --- | --- | --- | --- | --- |
| **ADR-001** | Architecture | Next.js 15 App Router with domain-driven features (`incidents`, `cases`, `ngos`, `matching`) | Architect & Lead Dev | `eb87466` |
| **ADR-002** | Data Contracts | Shared `@umeed/contracts` workspace for zero-drift Zod schemas | Full Team | `eb87466` |
| **ADR-003** | Safety & Privacy | Citizen tracking token hashed with SHA-256; zero plaintext token storage | Security Engineer | `eb87466` |
| **ADR-004** | Matching Engine | Deterministic 5-factor scoring (capability, geography, distance, availability, capacity) | ML / Domain Engineer | `3d5c5af` |
| **ADR-005** | Case State Machine | Pure functional state transitions with explicit recursive follow-up loops | Domain Engineer | `eb87466` |
| **ADR-006** | Meko Protocol | Model Context Protocol Streamable HTTP (`2024-11-05`) over HTTP/2 | MCP Systems Engineer | `ca611a8` |
| **ADR-007** | Header Contract | Meko requires `Authorization: Bearer <key>` and non-empty `User-Agent: umeed/1.0` | MCP Systems Engineer | `ca611a8` |
| **ADR-008** | Parameter Pruning | Obsolete `scope` argument retired; routing governed exclusively by `datapack_id` | Backend Engineer | `ca611a8` |
| **ADR-009** | Handoff Engine | Separating physical rescue from receiving provider clinical acceptance | Domain Engineer | `HEAD` |
| **ADR-010** | Safe Promotion | Two-phase human confirmation dialog for one-way `memory_promote` operations | Frontend / UX Lead | `HEAD` |

---

## 3. Cross-Agent Verification & Check T Readiness

- **Check T Requirement**: Verification of code changes across independent agent sessions.
- **Protocol**: Coding agents connecting to `https://mcp.mekodata.ai/mcp` query `umeed-build` to ensure convention alignment before modifying shared contracts or state machines.
- **Truthful Status**: Awaiting active team credentials in `.env.local` to trigger live session synchronization across teammates. Zero artificial promotions or false evidence logged.
