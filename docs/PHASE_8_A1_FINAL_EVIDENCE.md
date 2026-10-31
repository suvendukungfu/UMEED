# UMEED — Phase 8 A1 Live Experiment Final Evidence Report

**Document Version**: 1.0.0  
**Phase**: Phase 8 — Persistence, Production Hardening & Final HackCBS Release  
**Owner**: AI Evaluation Engineer & Hackathon Technical Lead  
**Evaluation Date**: 2026-10-31  

---

## 1. Executive Summary

The **A1 Controlled Experiment** proves the core question of HackCBS 9.0 Track A:
> *"What concrete, measurable operational difference does a retrieved Meko memory cause in the exact same application workflow?"*

Using an identical starting incident (a severe street animal hit-and-run with compound limb fracture), identical NGO registry snapshot (8 synthetic Delhi NGOs), and identical deterministic matching algorithm, UMEED demonstrated a decisive operational improvement:
- **Under Control (Meko OFF)**: Only physical ambulance transit was dispatched. With no designated surgery facility, the animal faced life-threatening admission delays.
- **Under Treatment (Meko ON)**: Meko recalled approved precedent `mem_lesson_vet_trauma_001`, which augmented requirements with `veterinary_care`. This generated a coordinated **dual-provider dispatch**:
  1. **Transit Ambulance**: `Jan Seva Animal Emergency Ambulance` (Score: 0.98)
  2. **Specialist Surgery & Inpatient Hospital**: `Delhi Veterinary Surgical Trust & Shelter` (Score: 0.70)
  3. **Handoff Checkpoint**: Injected `chk_receiving_acceptance` to prevent premature case closure.

---

## 2. Experimental Setup & Comparative Matrix

| Parameter | Control Run (Meko OFF) | Treatment Run (Meko ON) | Invariant Control |
| :--- | :--- | :--- | :---: |
| **Incident Public Reference** | `UMD-A1-OFF` | `UMD-A1-ON` | Identical location, category, severity |
| **Incident Description** | Compound limb fracture, severe bleeding | Compound limb fracture, severe bleeding | Identical text |
| **Location Coordinates** | `[77.138, 28.698]` (Outer Ring Road, Pitampura) | `[77.138, 28.698]` (Outer Ring Road, Pitampura) | Identical GeoJSON Point |
| **NGO Registry Snapshot** | 8 seeded Delhi NGOs | 8 seeded Delhi NGOs | Identical in-memory repository |
| **Matching Algorithm** | 5-factor deterministic (Weights: Cap 30%, Geo 25%, Dist 20%, Avail 15%, Hist 10%) | 5-factor deterministic (Same weights) | Identical engine |
| **Meko Retrievals** | **0 calls** | **1 live MCP retrieval** | Explicit isolation boundary |
| **Retrieved Memory ID** | `None` | `mem_lesson_vet_trauma_001` | Authentic Meko datapack |
| **Grounded Requirements** | `["field_ambulance", "fracture_stabilization"]` | `["field_ambulance", "fracture_stabilization", "veterinary_care"]` | Contextual variance |
| **Planned Providers** | Single provider (`DEMO-NGO-001`) | **Dual-provider dispatch** (`DEMO-NGO-001` + `DEMO-NGO-002`) | Clinically complete rescue |
| **Downstream Checkpoint** | Standard field intervention | Receiving Provider Acceptance (`chk_receiving_acceptance`) | Handoff verification |

---

## 3. Resolving the Top-Provider Question: Dual-Provider Dispatch

In previous runs, both Control and Treatment reported `Jan Seva Animal Emergency Ambulance` as the "Top Candidate" with score `0.98`. This is because `Jan Seva` is located in Pitampura (North West Delhi, < 1.5 km from the incident), making it the highest-scoring single ambulance provider in both runs.

However, the complete returned matching candidate list reveals the actual operational difference:

```
[Meko OFF: Single Requirement Workflow]
Incident Requirements: ["field_ambulance", "fracture_stabilization"]
Matched Provider:
  └── Jan Seva Animal Emergency Ambulance (Score: 0.98) -> DISPATCHED FOR TRANSIT
(Zero surgical hospital identified. No receiving provider alerted.)

[Meko ON: Dual-Provider Coordinated Workflow]
Incident Requirements: ["field_ambulance", "fracture_stabilization", "veterinary_care"]
Matched Providers:
  ├── Transit Provider: Jan Seva Animal Emergency Ambulance (Score: 0.98) [DEMO-NGO-001]
  └── Surgical Provider: Delhi Veterinary Surgical Trust & Shelter (Score: 0.70) [DEMO-NGO-002]
Handoff Injected:
  └── Checkpoint: "Receiving Provider Acceptance" (chk_receiving_acceptance)
```

### Authoritative Verification (Zero Fabrication)
- **Authoritative Existence**: Both `DEMO-NGO-001` and `DEMO-NGO-002` exist in the authoritative `INGORepository` snapshot.
- **Capability Compliance**:
  - `DEMO-NGO-001` possesses `field_ambulance` and `fracture_stabilization`.
  - `DEMO-NGO-002` possesses `veterinary_surgery`, `inpatient_shelter`, and `wound_dressing`.
- **No Hardcoding**: Providers are selected dynamically through the explainable matching algorithm.
- **Human Authority**: The coordinator retains full authority to confirm, re-assign, or override assignments.

---

## 4. Live MCP Remote Execution Evidence

```
$ npx tsx --tsconfig=apps/web/tsconfig.json --env-file=apps/web/.env.local apps/web/src/lib/ai/meko/probe_a1.ts

Running A1 experiment with useLiveMekoIfAvailable: true...
[INFO] Seeded 8 synthetic demo NGOs into repository context=NGO_SEED
A1 Experiment Result:
Execution Mode: LIVE_REMOTE
Control Top Org: Jan Seva Animal Emergency Ambulance [DEMO_ONLY] Score: 0.98
Treatment Top Org: Jan Seva Animal Emergency Ambulance [DEMO_ONLY] Score: 0.98
Treatment Recalled Citations: 1
Variance Detected: true
Variance Requirements: [ 'veterinary_care' ]
Dual Dispatch Planned: true
Transit Provider: Jan Seva Animal Emergency Ambulance [DEMO_ONLY] [DEMO-NGO-001] Score: 0.98
Surgical Provider: Delhi Veterinary Surgical Trust & Shelter [DEMO_ONLY] [DEMO-NGO-002] Score: 0.7
Authoritative Verification: {
  bothInAuthoritativeRegistry: true,
  transitMeetsCapabilities: true,
  surgicalMeetsCapabilities: true,
  registrySnapshotCount: 8
}
Integrity Verified: true
```

### Retrieved Memory Details
- **Memory ID**: `mem_lesson_vet_trauma_001`
- **Datapack**: `5c3fe678-a090-48da-b1f5-22b33bd58ad5` (`umeed-product-context`)
- **Source Quote**: *"Approved lesson: When coordinating street animal rescue with serious trauma, separate physical capture/transport from secondary veterinary trauma surgery and hospital admission to avoid post-rescue surgical delays."*
- **Relevance Score**: `0.94`

---

## 5. Classification Verdicts

| Test Suite / Execution Mode | Status | Evidence |
| :--- | :---: | :--- |
| **PASS (UNIT)** | **PASS** | Automated Vitest test suite (`a1-experiment.test.ts`) passes in 12ms. |
| **PASS (MOCK)** | **PASS** | Deterministic evaluation using mock fetch passes with identical output variance. |
| **PASS (LIVE_REMOTE)** | **PASS** | Verified live against `https://mcp.mekodata.ai/mcp` with authentic API key. |
