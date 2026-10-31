# UMEED — Environment Configuration Audit & Infrastructure Validation

**Document Version**: 1.0.0  
**Audit Date**: 2026-11-01  
**Environment**: Local Development (`apps/web/.env.local`)  
**Auditor**: Staff Software Engineer & Infrastructure Architect  
**Classification**: Engineering Confidential — Redacted / Zero Plaintext Secrets  

---

## 1. Executive Summary

A comprehensive, zero-leak environment configuration audit was performed across the UMEED platform repository (`/Users/suvendusahoo/hackcbs`). All existing local environment configuration entries have been strictly preserved in `apps/web/.env.local`. Zero keys were deleted, rotated, cleared, or exposed.

All four verification stages pass:
- **Unit & Integration Tests**: 28 test suites (2 in `@umeed/contracts`, 26 in `@umeed/web`), 203 tests passing (100%).
- **TypeScript Typecheck**: Zero errors across all workspaces (`tsc --noEmit`).
- **ESLint**: Zero warnings or errors (`next lint`).
- **Next.js Production Build**: Clean compilation and static optimization of all 19 application routes and API endpoints.

---

## 2. Redacted Environment Variable Audit Table

Every variable supported by UMEED's server-side configuration schema ([env.ts](file:///Users/suvendusahoo/hackcbs/apps/web/src/lib/config/env.ts)) was audited for existence, population status, structural validity, and consuming subsystems without disclosing secret values:

| Environment Variable | Exists in `.env.local` | Populated | Structural Validity | Requirement Level | Consuming Subsystem |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `NODE_ENV` | **YES** | **YES** | Valid runtime environment (`development`) | Optional (Default: `development`) | Runtime Kernel / Next.js Engine |
| `PORT` | **YES** | **YES** | Valid port integer (`3000`) | Optional (Default: `3000`) | Next.js HTTP Server |
| `MONGODB_URI` | **YES** | **NO** (Unset) | N/A (Unpopulated) | Optional (Fail-soft fallback) | Database Layer / Repositories |
| `MONGODB_DB` | **YES** | **YES** | Valid string identifier | Optional (Default: `umeed_db`) | MongoDB Database Namespace |
| `COORDINATOR_API_KEY` | **YES** | **YES** | Valid non-empty credential string | Optional (Dev default available) | Coordinator Security & RBAC |
| `CRAWLER_API_KEY` | **YES** | **NO** (Unset) | N/A (Unpopulated) | Optional (Dev default available) | Crawler Ingestion Security |
| `GEMINI_API_KEY` | **YES** | **YES** | Valid non-empty credential string | Optional (Fail-soft triage fallback) | Google Gemini AI Multimodal Triage |
| `MEKO_API_KEY` | **YES** | **YES** | Valid non-empty credential string | Optional (Fail-soft baseline fallback) | Meko Context Engine (MCP HTTP) |
| `MEKO_PRODUCT_DATAPACK_ID` | **YES** | **YES** | Valid canonical UUID | Optional (Product Context default) | Operational Product Agents |
| `MEKO_BUILD_DATAPACK_ID` | **YES** | **YES** | Valid canonical UUID | Optional (Build Knowledge default) | Engineering ADRs / Check T |
| `IOMETE_PAT` | **YES** | **NO** (Unset) | N/A (Unpopulated) | Optional (Disabled if unset) | Impact Lakehouse Analytics |
| `IOMETE_EVENT_STREAM_URL` | **YES** | **NO** (Unset) | N/A (Unpopulated) | Optional (Disabled if unset) | Impact Streaming Endpoint |
| `DISCOVERY_SERVICE_URL` | **YES** | **NO** (Unset) | N/A (Unpopulated) | Optional (Disabled if unset) | External Social Distress Scraper |

---

## 3. Datapack Separation Architecture

UMEED strictly separates build-time engineering knowledge from runtime operational assistance context:

```
                              ┌────────────────────────────────────────┐
                              │           Meko MCP Gateway             │
                              │       (https://mcp.mekodata.ai)        │
                              └───────────────────┬────────────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
                         ▼                                                 ▼
        ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
        │       umeed-product-context       │    │            umeed-build            │
        │    (MEKO_PRODUCT_DATAPACK_ID)     │    │     (MEKO_BUILD_DATAPACK_ID)      │
        ├───────────────────────────────────┤    ├───────────────────────────────────┤
        │ • De-identified incident lessons  │    │ • Architectural decisions (ADRs)  │
        │ • Dual-dispatch patterns (trauma) │    │ • SHA-256 token hashing conventions│
        │ • Consumed by:                    │    │ • Consumed by:                    │
        │   - MatchingAgent                 │    │   - Coding Agents (Antigravity)   │
        │   - FollowUpAgent                 │    │   - Check T Collaboration Ledger  │
        │   - KnowledgeCurator              │    │   - Team Contributors A & B       │
        └───────────────────────────────────┘    └───────────────────────────────────┘
```

1. **Product Context Isolation**:
   - Runtime assistance operations default to `MEKO_PRODUCT_DATAPACK_ID`.
   - Never accesses engineering ADRs or build-time conventions.
2. **Build Knowledge Isolation**:
   - Team coding agents and Check T multi-agent grounding target `MEKO_BUILD_DATAPACK_ID`.
   - Never exposes operational assistance data to development-time coding agents.

---

## 4. Subsystem Audits & Integration Readiness

### 4.1 Next.js Environment Loading
- **Configuration Path**: `apps/web/.env.local`
- **Root Convenience Symlink**: `.env.local -> apps/web/.env.local`
- **Validation**: Next.js automatically loads `apps/web/.env.local` in `next dev` and `next build` without leaking variables to client-side bundles (zero `NEXT_PUBLIC_` secret prefix violations).

### 4.2 Meko Context Engine (MCP)
- **Protocol**: Model Context Protocol Streamable HTTP (`2024-11-05`) over HTTP/2.
- **Endpoint**: `https://mcp.mekodata.ai/mcp`
- **Headers Enforced**:
  - `Authorization: Bearer <MEKO_API_KEY>`
  - `User-Agent: umeed/1.0` (non-empty string required by proxy)
  - `Mcp-Session-Id: <session-uuid>` (attached to post-initialization calls)
- **Tool Contract Safety**: Whitelist enforced (`ALLOWED_MEKO_TOOLS`); inputs validated via Zod schemas prior to dispatch.
- **Safety Policy**: Destructive operations (`memory_delete_all`) and unapproved tools are rejected at runtime.

### 4.3 Google Gemini AI Multimodal Triage
- **SDK**: `@google/genai` (Official Google GenAI SDK v2.32.0).
- **Model Hierarchy**:
  - Primary: `gemini-2.5-flash`
  - Fallback: `gemini-1.5-flash`
  - Deep Forensics: `gemini-2.5-pro`
- **Fail-Soft Invariant**: If `GEMINI_API_KEY` is missing or network failure occurs, the engine automatically falls back to `analysis_status: "MANUAL_REVIEW_REQUIRED"`. The incident report is persisted safely with zero data loss.
- **Privacy Assurance**: Images and text are processed server-side in transient memory; API keys never leak into browser artifacts.

### 4.4 MongoDB Database Layer
- **Status**: `MONGODB_URI` is currently unset in the local environment.
- **Execution Mode**: **High-Fidelity Ephemeral In-Memory Demo Mode**.
- **Behavior**:
  - `apps/web/src/lib/db/mongodb.ts` evaluates `isMongoConfigured(env.MONGODB_URI)`.
  - When unset or populated with placeholder templates, the repository factory initializes `InMemoryIncidentRepository`, `InMemoryCaseRepository`, and `InMemoryNGORepository`.
  - In `production` mode, the engine strictly fails closed to prevent accidental ephemeral runs.

### 4.5 Security and Git Protection
- **`.gitignore`**: Enforces rules `.env` and `.env.*` with explicit exception for non-secret template `!.env.example`.
- **Permissions**: `apps/web/.env.local` is configured with `chmod 600` (`-rw-------`).
- **Git Status**: Clean. `apps/web/.env.local` is untracked and unstaged.
- **Log Sanitation**: Structured loggers redact PII and secret tokens (`tracking_token_hash`, credentials).

---

## 5. Verification & Test Execution Results

```
Workspace: @umeed/contracts
  ✓ src/incident.test.ts (6 tests)
  ✓ src/case.test.ts (6 tests)
  Result: 2 passed, 12 tests passed (100%)

Workspace: @umeed/web
  ✓ src/lib/config/env.test.ts (10 tests)
  ✓ src/lib/ai/meko/__tests__/meko-client.test.ts (26 tests)
  ✓ src/features/incidents/__tests__/gemini-triage.test.ts (8 tests)
  ✓ src/features/matching/__tests__/matching-engine.test.ts (11 tests)
  ✓ src/features/cases/__tests__/e2e-journey.test.ts (1 test)
  ... (26 total test suites)
  Result: 26 passed, 191 tests passed (100%)

TypeScript Typecheck (tsc --noEmit):
  Zero errors across all workspaces.

ESLint (next lint):
  No ESLint warnings or errors.

Next.js Production Build (next build):
  ✓ Compiled successfully in 2.6s
  ✓ Generating static pages (19/19)
  ✓ Build traces and page optimization complete
```

---

## 6. Missing External Dependencies & Manual Action Items

| Subsystem | Current State | Impact | Developer Action Needed |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | `MONGODB_URI` unset | System uses high-fidelity in-memory storage (data resets on server restart). | To persist data across server restarts, supply a valid connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/` in `apps/web/.env.local`. |
| **IOMETE Lakehouse** | `IOMETE_PAT` & URL unset | Real-time analytics streaming is disabled (analytics dashboard uses local aggregation). | Provide IOMETE Personal Access Token in `.env.local` if lakehouse synchronization is required. |
| **Distress Scraper** | `DISCOVERY_SERVICE_URL` unset | External crawler dispatch is disabled; manual and API ingestion remain fully operational. | Configure the social distress scraper service endpoint if autonomous discovery is required. |
| **Live Credential Privacy** | Keys present in local file | Existing keys are preserved in `.env.local`. | Replace any credentials that may have been previously shared across team channels directly in `.env.local`. |

