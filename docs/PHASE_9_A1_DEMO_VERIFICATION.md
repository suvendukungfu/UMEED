# UMEED — Phase 9 A1 Demonstration Reproducibility & Browser Verification

**Document Version**: 1.0.0  
**Phase**: Phase 9 — Final Competition Readiness, Check T & Release Freeze  
**Owner**: AI Evaluation Engineer  
**Date**: 2026-11-01  

---

## 1. Executive Summary

This report establishes the complete reproducibility of the **A1 Controlled Meko ON/OFF Experiment** both through automated CLI probes and directly within the UMEED web application interface.

The experiment strictly preserves identical starting conditions:
- **Incident Description**: *"Large stray dog hit by a two-wheeler. Deep laceration and compound leg fracture. Animal is immobile, bleeding, and in severe distress on the side of the road."*
- **Location**: Outer Ring Road, Near Pitampura Metro Station (`[77.138, 28.698]`, North West Delhi).
- **Authoritative NGO Snapshot**: 8 seeded synthetic Delhi NGOs (all explicitly marked `[DEMO_ONLY]`).
- **Scoring Weights**: Capability 30%, Geographic Jurisdiction 25%, Distance 20%, Availability 15%, Historical Reliability 10%.

---

## 2. Browser Interface Integration (`A1ExperimentModal`)

The experiment is fully integrated into the coordinator case view at `/cases/[caseReference]`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Meko Context Inspector                                │
│   Auditable operational memory & grounded reasoning trace                   │
│                                                                             │
│   [ Run A1 Experiment (OFF vs ON) ]        [ Refresh Trace ]                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ (Click)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               A1 Controlled Experiment: Meko OFF vs. ON                     │
│               [DEMO_ONLY FIXTURES]                                          │
│                                                                             │
│   CONTROL: Meko OFF                  │  TREATMENT: Meko ON (Live MCP)       │
│   ────────────────                   │  ─────────────────────────────       │
│   Meko Calls: 0                      │  Meko Calls: 1 (Live Remote)         │
│   Requirements:                      │  Retrieved Memory:                   │
│    - field_ambulance                 │    [dcf042be-0b29-...] "Approved..." │
│    - fracture_stabilization          │  Augmented Requirements:             │
│                                      │    - field_ambulance                 │
│   Dispatched Provider:               │    - fracture_stabilization          │
│    Jan Seva Ambulance (Score: 98%)   │    - veterinary_care (Meko Added)    │
│                                      │                                      │
│   Clinical Gap:                      │  Dual-Provider Coordination:         │
│    No surgery facility alerted.      │    1. Transit: Jan Seva (98%)        │
│    High risk of surgical delay.      │    2. Surgery: Delhi Vet Trust (70%) │
│                                      │                                      │
│   Checkpoints:                       │  Injected Resolution Gate:           │
│    Field transport only.             │    Blocked until Receiving Provider  │
│                                      │    Acceptance is verified.           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Side-by-Side Comparative Audit

| Evaluation Dimension | Control Run (Meko OFF) | Treatment Run (Meko ON) | Causal Impact of Retrieved Context |
| :--- | :--- | :--- | :--- |
| **Meko Retrievals** | 0 calls | 1 authentic call | Isolated execution boundary |
| **Retrieved Memory ID** | `None` | `dcf042be-0b29-4afc-a5e2-cb3c87d071b0` | Live remote Meko vector database |
| **Grounded Requirements** | `["field_ambulance", "fracture_stabilization"]` | `["field_ambulance", "fracture_stabilization", "veterinary_care"]` | **+ `veterinary_care`** |
| **Candidate Count** | 3 eligible NGOs | 3 eligible NGOs | Identical registry evaluated |
| **Transit Ambulance** | `Jan Seva Animal Emergency Ambulance` (0.98) | `Jan Seva Animal Emergency Ambulance` (0.98) | Top proximity transit match |
| **Inpatient Surgery Hospital**| `None` (unmatched) | `Delhi Veterinary Surgical Trust & Shelter` (0.70) | **Dual-dispatch coordinated** |
| **Downstream Checkpoint** | Primary field transport only | `chk_receiving_acceptance` | **Resolution gate enforced** |
| **Clinical Outcome** | Animal transported to general shelter with no surgical theater | Animal transported directly to surgical facility with pre-alerted surgeons | Prevents post-rescue mortality |

---

## 4. Operational Guardrails & Clinical Integrity

1. **Synthetic Nature of Providers**: Both `DEMO-NGO-001` and `DEMO-NGO-002` are synthetic test records clearly marked with `[DEMO_ONLY]`. They do not represent real-world clinical partnerships.
2. **Non-Autonomous Clinical Governance**: Historical lessons retrieved from Meko **cannot** diagnose an animal or override current triage facts. Current incident evidence (bleeding, compound fracture) and coordinator approvals govern the matching process.
3. **Authoritative Consistency**: NGO capacity and availability are sourced strictly from UMEED's authoritative database (`INGORepository`), never hallucinated by Meko context.

---

## 5. Verification Verdict

**PASS (LIVE_REMOTE)**. Live MCP retrieval and dual-provider coordination are 100% reproducible via CLI (`npx tsx apps/web/src/lib/ai/meko/probe_a1.ts`) and within the web UI (`A1ExperimentModal`).
