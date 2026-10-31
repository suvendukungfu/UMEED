# UMEED (CARELINK)

> **Every report deserves a response. Every response deserves a verified handoff.**  
> AI-powered public signal discovery, social distress tracking, and closed-loop assistance coordination platform for vulnerable individuals and animals.  
> Built for **HackCBS 9.0 | Meko Challenge Track A**.  
> **Release Candidate**: 1.1 (Phase 11 Discovery Release) | **Verification**: 232 passing tests (35 test files), 0 typecheck errors, 0 lint warnings, 23/23 routes compiled.

---

## 1. Overview & Signature Concepts

Most emergency relief reporting platforms fail at the most vulnerable moment: **the unverified drop-off**. Conventional platforms celebrate when an ambulance or rescue van picks up a patient. But if the trauma hospital is full or the night shelter lacks medical staff, the victim is abandoned at the facility gate.

**UMEED** changes that with two core operational pillars:

### A. The Continuity Line: Zero Dropped Handoffs
```
[ DISCOVER/REPORT ] ──► [ TRIAGE ] ──► [ COORDINATION ] ──► [ RESCUE ] ──► [ HANDOFF ] ──► [ VERIFIED COMPLETION ]
```

### B. Discovery Intelligence & Distress Radar (`/discovery`)
- **Compliant Public Web Crawler**: Bounded, RFC 9309-compliant crawler scanning approved public feeds, Open Government Data (`data.gov.in`), and municipal shelter advisories.
- **SSRF & DNS Rebinding Immunity**: Multi-tier security guard protecting private IPv4/IPv6 ranges and cloud metadata (`169.254.169.254`).
- **Interactive Geospatial Map**: MapLibre GL JS client renderer with coarsened privacy coordinates (~1.1 km area centroids) across all 11 Delhi revenue districts.
- **Mandatory Review Gate**: Public signals are ingested strictly as candidates; human coordinator approval is required before converting to active UMEED incidents.

---

## 2. Core Experience Architecture

1. **Discovery Radar (`/discovery`)**: Live distress signal map, candidate tracker, and coordinator review drawer.
2. **Approved Source Registry (`/discovery/sources`)**: Directory of authorized public feeds with license, terms, and robots.txt health inspection.
3. **Crawl Execution Monitor (`/discovery/runs`)**: Real-time bounded crawl batch logs, metrics, and execution audit trails.
4. **Multi-Channel Intake (`/report`)**: Accepts citizen mobile reports (with SHA-256 token privacy) and authorized social media distress discoveries.
5. **AI Multimodal Triage (`/incidents`)**: Gemini extracts structured condition, urgency, and candidate location information with evidence references—without making autonomous medical diagnoses.
6. **Human Coordinator Verification (`/incidents`)**: Mandatory human coordinator review gate (`CONFIRM`, `OVERRIDE`, `REJECT`) before dispatch.
7. **Capability-Aware NGO Matching (`/cases`)**: 5-factor scoring model ranks accredited organizations across Delhi NCR based on capabilities, district authorization, availability, distance, and capacity.
8. **Field Operations Cockpit (`/responder`)**: Mobile-first touch-friendly interface for field responders to accept tasks, confirm GPS arrival, and submit intervention logs.
9. **Recursive Assistance Loops (`/cases/[caseReference]`)**: When initial first aid only resolves part of the distress, secondary matching cycles automatically trigger for remaining needs.
10. **The Downstream Handoff Gate**: Resolution is strictly blocked until the receiving hospital, clinic, or shelter formally verifies admission.
11. **Meko Institutional Memory (`/agent`)**: Recalls past coordinator lessons (e.g. trauma transport without surgical readiness) before reasoning and injects required handoff checkpoints.
12. **Interactive Context Inspector**: Full human coordinator inspection, PII-validated correction, deletion, and shared promotion control over AI memory.

---

## 2. Five-Command Quickstart

```bash
# 1. Install all dependencies across monorepo workspaces
npm install

# 2. Run automated test suite (187 passing tests across 26 test files)
npm run test

# 3. Verify TypeScript type safety (0 errors)
npm run typecheck

# 4. Compile optimized production build (19 routes generated)
npm run build

# 5. Launch local application
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the UMEED Platform:

- Public Editorial Landing Page: [http://localhost:3000/](http://localhost:3000/)
- Citizen Report & Tracking Portal: [http://localhost:3000/report](http://localhost:3000/report)
- Coordinator Triage Queue: [http://localhost:3000/incidents](http://localhost:3000/incidents)
- Case Mission Control: [http://localhost:3000/cases](http://localhost:3000/cases)
- Field Responder Cockpit: [http://localhost:3000/responder](http://localhost:3000/responder)
- NGO Registry: [http://localhost:3000/ngos](http://localhost:3000/ngos)
- Meko Memory Console: [http://localhost:3000/agent](http://localhost:3000/agent)
- Impact Analytics: [http://localhost:3000/analytics](http://localhost:3000/analytics)

---

## 3. Phase 10 Documentation Deliverables

- **Design System Specification**: [`docs/PHASE_10_DESIGN_SYSTEM.md`](docs/PHASE_10_DESIGN_SYSTEM.md)
- **Visual & UX Audit**: [`docs/PHASE_10_VISUAL_UX_AUDIT.md`](docs/PHASE_10_VISUAL_UX_AUDIT.md)
- **Accessibility & Performance Report**: [`docs/PHASE_10_ACCESSIBILITY_PERFORMANCE_REPORT.md`](docs/PHASE_10_ACCESSIBILITY_PERFORMANCE_REPORT.md)
- **End-to-End Verification Report**: [`docs/PHASE_10_E2E_VERIFICATION.md`](docs/PHASE_10_E2E_VERIFICATION.md)
- **Final Completion Report**: [`docs/PHASE_10_FINAL_COMPLETION_REPORT.md`](docs/PHASE_10_FINAL_COMPLETION_REPORT.md)
- NGO Intelligence Directory: [http://localhost:3000/ngos](http://localhost:3000/ngos)
- Coordinator Case Workspace: [http://localhost:3000/cases](http://localhost:3000/cases)
- Frontline NGO Responder Terminal: [http://localhost:3000/responder](http://localhost:3000/responder)

### API Endpoints (Operational)

- **Health Check**: `GET /api/health`
- **Context Learning Traces & Memory**: `GET`, `PATCH`, `DELETE /api/context-learning/memories`
- **Knowledge Promotion**: `POST /api/context-learning/promote`
- **A1 Controlled Meko Experiment**: `POST`, `GET /api/context-learning/experiment-a1`

- **Incident Ingestion**: `POST /api/incidents/ingest` (Zod v1.0.0, idempotency, secure tracking credentials)
- **Incident Query Feed**: `GET /api/incidents` (Filter by status, category, duplicate flags)
- **Incident Detail Lookup**: `GET /api/incidents/:publicReference` (Redacted for citizen; unredacted for coordinator)
- **AI Triage Trigger**: `POST /api/incidents/:publicReference/triage` (On-demand multimodal Gemini triage)
- **Coordinator Review**: `POST /api/incidents/:publicReference/review` (Confirm, override, reject, or escalate decisions)
- **AI Benchmark Evaluation**: `GET /api/ai/evaluation` (Run 9-scenario synthetic evaluation suite)
- **NGO Directory & Filter**: `GET /api/ngos` (Public sanitized vs. coordinator unredacted)
- **NGO Creation & Updates**: `POST /api/ngos`, `PATCH /api/ngos/:ngoId`
- **NGO Bulk CSV Import**: `POST /api/ngos/import` (RFC 4180 parser, duplicate detection, validation report)
- **Explainable Matching**: `GET /api/ngos/matches/:incidentReference` (Multi-factor scoring, hard capability filter)
- **Case Lifecycle & Feed**: `POST /api/cases`, `GET /api/cases`, `GET /api/cases/:caseReference`
- **Case Multi-NGO Assignment**: `POST /api/cases/:caseReference/assignments`
- **Requirement Matching**: `POST /api/cases/:caseReference/match`
- **Recursive Follow-Up Engine**: `POST /api/cases/:caseReference/follow-up`
- **Case Resolution & Reopening**: `POST /api/cases/:caseReference/resolve`, `POST /api/cases/:caseReference/reopen`
- **Frontline Responder Actions**: `POST /api/assignments/:assignmentId/accept`, `/reject`, `/request-info`, `/en-route`, `/arrived`
- **Intervention Recording**: `POST /api/assignments/:assignmentId/interventions`
- **Notification Outbox Processor**: `POST /api/notifications/process`

---

## 3. Project Structure

```
umeed/
├── apps/
│   └── web/                   # Next.js 15 App Router platform & API routes
├── packages/
│   └── contracts/             # Canonical incident schema & shared contracts (Zod)
├── services/
│   └── discovery/             # Independent Python/FastAPI crawler (Phase 8)
├── docs/                      # Architectural decisions and documentation
└── data/                      # Synthetic data fixtures for hackathon evaluation
```

---

## 4. Verification & Testing

```bash
# Run unit & contract tests
npm run test

# Run strict TypeScript compilation
npm run typecheck

# Run linter
npm run lint

# Build production bundle
npm run build
```

---

## 5. Security & Ethical Standards

- **No Autonomous Dispatch**: AI models provide recommendations; coordinators make dispatch decisions.
- **No Autonomous Diagnosis**: Triage flags visible conditions as non-medical observations.
- **Privacy Protection**: Beneficiary phone numbers and emails are scrubbed before reaching external memory or analytics.
- **Secret Isolation**: All connection credentials and API tokens are server-side only.

---

## 6. License

MIT License. See [LICENSE](LICENSE) for details.
