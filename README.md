# UMEED (CARELINK)

> **From distress to real assistance.**  
> AI-powered social distress discovery and closed-loop assistance coordination platform for vulnerable individuals and animals.  
> Built for **HackCBS 9.0**.

---

## 1. Overview

Most social distress reporting stops at the moment of intake. Reports are lost, duplicate requests overwhelm volunteers, or initial first aid is provided while underlying shelter and medical needs remain unresolved.

**UMEED** changes that by establishing a closed-loop assistance operating system:
1. **Multi-Channel Intake**: Accepts citizen reports (photos, GPS, description) and authorized social media distress discoveries.
2. **AI Multimodal Triage**: Gemini extracts structured condition, urgency, and candidate location information with evidence references—without making autonomous medical diagnoses or dispatching responders.
3. **Human Coordinator Verification**: High-risk cases require coordinator verification before any dispatch occurs.
4. **Capability-Aware NGO Matching**: Ranks verified organizations across Delhi based on capabilities, operational districts, availability, and response history—not naive proximity.
5. **Closed-Loop Response Coordination**: Tracks responders through a formal lifecycle state machine (`REPORTED` → `ARRIVED` → `RESOLVED`).
6. **Recursive Assistance Loops**: If initial intervention only resolves part of the need, secondary matching cycles automatically initiate for remaining needs.
7. **Meko Coordination Memory**: Enables the AI coordination agent to recall approved coordinator policies across sessions.
8. **IOMETE Impact Analytics**: Durable event telemetry tracking response times and recurring unmet assistance needs.

---

## 2. Quickstart

### Prerequisites
- Node.js `24 LTS` (`v24.5.0+`)
- npm `10+` / `11+`

### Installation
```bash
# Clone the repository
git clone https://github.com/suvendukungfu/UMEED.git
cd UMEED

# Switch to Node 24 (if using NVM)
nvm use 24

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the UMEED Dashboard.
- Citizen Report Form: [http://localhost:3000/report](http://localhost:3000/report)
- Coordinator Triage Queue: [http://localhost:3000/incidents](http://localhost:3000/incidents)
- NGO Intelligence Directory: [http://localhost:3000/ngos](http://localhost:3000/ngos)

### API Endpoints (Operational)
- **Health Check**: `GET /api/health`
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

