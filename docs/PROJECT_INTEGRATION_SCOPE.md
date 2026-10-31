# UMEED — Project Integration Scope & Architectural Boundaries

**Document Version**: 1.0.0  
**Effective Date**: 2026-11-01  
**Author**: Staff Software Engineer & Principal Platform Architect  
**Classification**: Engineering Governance & Architectural Scope Baseline  

---

## 1. Executive Statement of Architectural Scope

This document defines the authoritative scope of external and internal platform integrations for UMEED. It establishes an explicit boundary between active, verified subsystems and unused, out-of-scope technologies to prevent architectural drift and maintain system transparency.

> **Explicit Architecture Scope Decision**:
> **UMEED IS NOT USING IOMETE.**  
> IOMETE is not an active integration, not part of the runtime application architecture, and has no active service client, background worker, or health check dependency.  
> 
> Environment variables `IOMETE_PAT` and `IOMETE_EVENT_STREAM_URL` are retained exclusively as empty compatibility placeholders in local configuration templates. They have zero runtime effect on the platform.

---

## 2. Integration Scope Matrix

| Subsystem / Integration | Technology / Provider | Integration Status | Runtime Role & Boundary | Configuration Key(s) |
| :--- | :--- | :---: | :--- | :--- |
| **Operational Store** | **MongoDB Atlas** | **ACTIVE** | Primary database for incidents, cases, NGOs, and audit records. Features automatic in-memory fallback during local development/demo mode. | `MONGODB_URI`, `MONGODB_DB` |
| **Multimodal Distress AI** | **Google Gemini** | **ACTIVE** | Official `@google/genai` SDK (v2.32.0). Provides automated structured triage suggestions (`gemini-2.5-flash`) with safe fail-soft manual review fallback. | `GEMINI_API_KEY` |
| **Coordination Memory** | **Meko MCP** | **ACTIVE** | Model Context Protocol Streamable HTTP (`2024-11-05`). Manages operational assistance memories and team engineering knowledge across isolated datapacks. | `MEKO_API_KEY`, `MEKO_PRODUCT_DATAPACK_ID`, `MEKO_BUILD_DATAPACK_ID` |
| **Distress Feed Scraper** | **Standalone Discovery Service** | **OPTIONAL / INDEPENDENT** | Independent Python FastAPI crawler for public social distress media ingestion via shared REST API contract. | `DISCOVERY_SERVICE_URL`, `CRAWLER_API_KEY` |
| **Impact Lakehouse** | **IOMETE** | **NOT CURRENTLY USED / OUT OF SCOPE** | **No integration exists.** No SDK, client, worker, or pipeline. Empty environment variables retained for configuration compatibility only. | `IOMETE_PAT`, `IOMETE_EVENT_STREAM_URL` (Unused) |

---

## 3. Active Architecture Details

The core UMEED architecture focuses exclusively on the following validated subsystems:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           UMEED Core Platform Architecture                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   1. Citizen & Public Intake                                                    │
│      ├── Web / Mobile Reporting Form (/report)                                 │
│      └── Direct Ingestion API (POST /api/incidents/ingest)                      │
│                                                                                 │
│   2. AI Multimodal Triage (Google Gemini v2.32.0)                               │
│      ├── Visible Distress Classification & Reasoning                            │
│      ├── Non-medical assistance category recommendation                         │
│      └── Fail-Soft Boundary -> MANUAL_REVIEW_REQUIRED on error/absence           │
│                                                                                 │
│   3. Human Verification & Coordinator RBAC                                     │
│      ├── Coordinator Dashboard (/incidents, /cases)                             │
│      ├── SHA-256 Citizen Token Redaction & Constant-Time Verification          │
│      └── Authorized Dispatch Override & Approval                                │
│                                                                                 │
│   4. Deterministic 5-Factor NGO Matching Engine                                 │
│      ├── Capability Hard Filter (100% prerequisite match)                       │
│      ├── Scoring: Capability (30%), Geography (25%), Distance (20%),            │
│      │            Availability (15%), Capacity (10%)                            │
│      └── Verified NGO Registry (/ngos)                                          │
│                                                                                 │
│   5. Closed-Loop Case State Machine & Handoff Coordination                      │
│      ├── Pure Functional Transitions: REPORTED -> ASSIGNED -> EN_ROUTE ->       │
│      │   ON_SCENE -> INTERVENTION_RECORDED -> RESOLVED (or FOLLOW_UP_REQUIRED)  │
│      ├── Recursive Assistance Loops (Multi-cycle care continuity)               │
│      └── Separate Field Transport from Clinical Handoff                         │
│                                                                                 │
│   6. Contextual Coordination Memory (Meko MCP)                                  │
│      ├── umeed-product-context: Operational assistance lessons                  │
│      └── umeed-build: Architecture Decision Records (ADRs) & Check T            │
│                                                                                 │
│   7. Internal Operational Telemetry & Analytics Dashboard (/analytics)          │
│      ├── Real-time aggregations from internal assistance cases                  │
│      └── Macro district trends, response latencies, and unmet needs             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Decommissioning & Out-of-Scope Rationale (IOMETE)

### 4.1 Zero Runtime Footprint
- **No Package Dependencies**: Neither root `package.json` nor `apps/web/package.json` includes any IOMETE libraries or drivers.
- **No Service Adapter**: No client class, connection pool, or HTTP request logic targets IOMETE.
- **No Route Dependencies**: Zero Next.js API routes dispatch calls to IOMETE.
- **Independent Health Check**: `/api/health` probes MongoDB, Google Gemini, and Meko MCP. It does not inspect, ping, or require IOMETE.

### 4.2 Analytics Architecture
The UMEED analytics interface at `/analytics` does not rely on an external lakehouse:
- Metrics, response latencies, district breakdowns, and NGO acceptance rates are computed from internal case telemetry and seeded operational datasets.
- Operational metrics are rendered with transparent disclosure notices regarding demonstration data.

### 4.3 Environment Variable Compatibility
In compliance with developer constraints:
- `IOMETE_PAT` and `IOMETE_EVENT_STREAM_URL` remain defined in `.env.local` and `.env.example`.
- In `apps/web/src/lib/config/env.ts`, they are typed as optional and inert (`emptyToUndefined`, `optionalUrl`).
- They are classified as `UNUSED / RESERVED / OUT OF SCOPE` in all audits and documentation.

---

## 5. Summary of System Boundaries

| Concern | Primary Implementation | Secondary / Fallback |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.5 App Router (React 19) | Node.js Server Runtime |
| **Persistence** | MongoDB Atlas (`MongoIncidentRepository`) | `InMemoryIncidentRepository` (Ephemeral Demo) |
| **AI Inference** | Google Gemini (`gemini-2.5-flash`) | Human Coordinator Review (`MANUAL_REVIEW_REQUIRED`) |
| **Agent Context** | Meko MCP Streamable HTTP | Local rule-based matching & static procedures |
| **Analytics** | Internal Incident & Case Telemetry | Local In-Memory Aggregations |
| **Lakehouse / IOMETE** | **NONE (Out of Scope)** | **NONE (Out of Scope)** |

