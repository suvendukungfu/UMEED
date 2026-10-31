# UMEED — Phase 7: Hackathon Demonstration & Release Readiness Report

**Programme**: UMEED (AI-Powered Social Distress Discovery & Coordination)  
**Challenge**: HackCBS 9.0 — Meko Challenge Track A (Open Project)  
**Release Version**: `1.0.0-rc1` (Release Candidate 1)  
**Commit**: `d732874`  
**Evaluator**: Product Release Engineer  
**Release Readiness**: **RELEASE READY (FULLY TESTED, LIVE MEKO VERIFIED)**

---

## 1. Executive Summary

This report establishes that UMEED is fully assembled, tested, and demo-ready for presentation to the HackCBS 9.0 judging panel. 

The application builds cleanly in Next.js production mode (`19/19 routes`), passes all 187 automated tests, enforces strict zero-PII privacy controls, and features a live, authenticated Meko MCP integration demonstrating the tangible humanitarian value of coordination memory.

---

## 2. 5-Minute Demonstration Walkthrough Script

### Quick Access URLs:
- **Citizen Report**: `http://localhost:3000/report`
- **Triage Queue**: `http://localhost:3000/incidents`
- **Case Detail & Context Inspector**: `http://localhost:3000/cases/CASE-E2E-001`
- **NGO Registry**: `http://localhost:3000/ngos`
- **Responder Portal**: `http://localhost:3000/responder`

---

### Minute 0:00 – 1:00: Problem & Multimodal Citizen Ingestion
- **Speaker**: "In emergency animal distress, speed saves lives, but disconnected coordination leads to post-rescue mortality. Today, when a citizen reports an injured animal, standard systems dispatch an ambulance van. But what happens after pickup? If no surgical hospital is prepared, the animal dies waiting for an operating room."
- **Action**: Open `/report`. Show the intuitive intake form with location pin, phone number, and trauma description:
  > *"Large stray dog hit by a two-wheeler in Pitampura. Deep laceration and compound leg fracture. Animal is bleeding and immobilized."*
- **Behind the Scenes**: Citizen phone is hashed; confidential tracking token `trk_...` is generated. Multimodal triage flags urgency as `urgent` and needs as `["field_ambulance", "fracture_stabilization"]`.

---

### Minute 1:00 – 2:00: Meko OFF — The Transit Blindspot
- **Speaker**: "First, let's observe what happens with standard matching when historical memory is OFF."
- **Action**: Run baseline matching for `CASE-A1-CONTROL-OFF` (or via `/api/context-learning/experiment-a1` with `useLiveMekoIfAvailable: false`).
- **Result**:
  - The deterministic matching engine scores all 8 registered Delhi NGOs.
  - Top match: `Jan Seva Animal Emergency Ambulance` (Score: 0.98).
  - **The Blindspot**: Jan Seva has ambulances and splints, but **no surgical theatre or inpatient hospital beds**. The animal is rescued from the road, but arrives at a facility incapable of performing the required fracture surgery.

---

### Minute 2:00 – 3:30: Meko ON — Live Contextual Recall & Dual Matching
- **Speaker**: "Now let's enable Meko coordination memory (`umeed-product-context`)."
- **Action**: Run grounded matching for `CASE-A1-TREATMENT-ON` (or execute `probe_a1.ts`).
- **Live Trace in Context Inspector**:
  - `MatchingAgent` queries Meko live over MCP Streamable HTTP.
  - Recalls approved operational lesson `mem_lesson_vet_trauma_001`:
    > *"Approved lesson: When coordinating street animal rescue with serious trauma, separate physical capture/transport from secondary veterinary trauma surgery and hospital admission..."*
  - **The Shift**: The agent augments requirements: `["field_ambulance", "fracture_stabilization", "veterinary_care"]`.
  - The deterministic matching engine runs across both requirements, recommending:
    1. `Jan Seva Animal Emergency Ambulance` for physical transit.
    2. `Delhi Veterinary Surgical Trust & Shelter` for inpatient operating room booking.
- **Humanitarian Value**: Prevents animal mortality by coordinating surgical bed allocation in parallel with transit.

---

### Minute 3:30 – 4:15: The Context Inspector & Human-in-the-Loop Governance
- **Speaker**: "Notice that Meko never hallucinates or invents fake NGO capacity. In the Context Inspector, the coordinator has complete transparency."
- **Action**: In `/cases/CASE-E2E-001`, scroll to the **Meko Context Inspector**:
  1. **Connection Badge**: Shows `Meko Live` connected to `5c3fe678-a090-48da-b1f5-22b33bd58ad5`.
  2. **Memory Citation**: Inspect the exact citation card showing the 94% relevance match, source quote, and operational reasoning.
  3. **Privacy Distinction**: Demonstrates the difference between private case memory and promoted shared knowledge.
  4. **Human Actions**: Click **Correct** (`memory_update`), **Forget** (`memory_delete_by_id`), or **Request Promotion** (`memory_promote` with mandatory confirmation notes).

---

### Minute 4:15 – 5:00: Privacy, Safety & Resilience
- **Speaker**: "Finally, citizen privacy is non-negotiable. Before any memory is added to Meko, our Knowledge Curator automatically scrubs phone numbers, emails, tracking tokens, and exact GPS coordinates. And if Meko is ever unreachable, UMEED falls back gracefully to its deterministic baseline without dropping a single emergency rescue."
- **Conclusion**: "UMEED + Meko: Real-time humanitarian coordination powered by evolving, de-identified collective intelligence."

---

## 3. Demo Terminal Commands Cheat Sheet

### 1. Start Development Server
```bash
npm run dev
```

### 2. Run All Automated Test Suites (26 files, 187 tests)
```bash
npm test
```

### 3. Run Live Meko A1 ON/OFF Probe
```bash
npx tsx --tsconfig=apps/web/tsconfig.json --env-file=apps/web/.env.local apps/web/src/lib/ai/meko/probe_a1.ts
```

### 4. Run Live Meko Canary Roundtrip
```bash
npx tsx --tsconfig=apps/web/tsconfig.json --env-file=apps/web/.env.local -e '
import { MekoHttpClient } from "./apps/web/src/lib/ai/meko/client";
new MekoHttpClient().runCanaryTest().then(console.log);
'
```

---

## 4. Submission Checklist for HackCBS 9.0 Track A

- [x] **A1: Context Matters**: Verified with live remote Meko recall showing requirement augmentation (`+veterinary_care`).
- [x] **A2: Real Meko Uses**: 5 capabilities implemented (`datapack_search`, `memory_add`, `memory_search`, `memory_promote`, cross-agent sharing).
- [x] **A3: Persona & Story**: Case coordinator narrative with canine trauma and hospital handoff.
- [x] **A4: Visible Context**: Enterprise Context Inspector built and integrated into `/cases/[caseReference]`.
- [x] **A5: Honesty & Privacy**: Zero PII policy enforced via pre-write regex validator; zero secret leakage.
- [x] **Build-Time Requirements**: `umeed-build` datapack separation configured and technical decisions logged.
- [x] **Meko Feature Proposal**: 3-page architectural proposal completed in `docs/MEKO_FEATURE_PROPOSAL.md`.

**Release Verdict**: **RELEASE READY**

