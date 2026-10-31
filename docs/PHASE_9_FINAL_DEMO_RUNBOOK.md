# UMEED — Phase 9 Final 5-Minute HackCBS Demo Runbook & Script

**Document Version**: 1.0.0  
**Phase**: Phase 9 — Final Competition Readiness, Check T & Release Freeze  
**Owner**: Senior Product Engineer & Hackathon Presentation Lead  
**Date**: 2026-11-01  

---

## 1. The Core 8 Architectural Questions (Judges Q&A Alignment)

| Question | UMEED Architectural Answer |
| :--- | :--- |
| **1. What problem does UMEED solve?** | Solves the *broken handoff problem* in social distress response. Millions of distress calls result in physical pickup, but beneficiaries perish or are turned away because downstream clinical intake was never coordinated. |
| **2. Why do standard systems fail?** | Traditional 311 or ticketing systems treat rescue as a single terminal ticket. Once an ambulance picks up the subject, the ticket closes—ignoring whether the destination facility has an operating theatre or open beds. |
| **3. How does UMEED coordinate multiple NGOs?** | Through an aggregate state machine that manages multi-organisation assignments (`CaseAssignment[]`), linking field transport to inpatient medical facilities under a single operational case. |
| **4. What role does Meko play?** | Meko acts as the *Persistent Coordination Memory Layer*, retaining de-identified operational lessons across cases so responders don't repeat historical coordination failures. |
| **5. What actually changes when Meko is ON?** | Grounded context expands baseline transit needs to include secondary surgical requirements, transforming a single-ambulance dispatch into a coordinated dual-provider response. |
| **6. How can coordinators inspect and correct memories?** | Through the **Meko Context Inspector** UI directly on `/cases/[caseReference]`, providing one-click Edit (`memory_update`), Forget (`memory_delete_by_id`), and Promote (`memory_promote`) controls. |
| **7. How is premature case closure prevented?** | By injecting a mandatory **Receiving Provider Acceptance Checkpoint** (`chk_receiving_acceptance`). The case resolution button is locked until the receiving hospital confirms clinical admission. |
| **8. What safeguards protect beneficiary privacy?** | Zero citizen PII enters Meko. Plaintext tracking tokens are never stored (only SHA-256 hashes). Authoritative NGO capacity is strictly governed by the local database. |

---

## 2. Timed 5-Minute Demonstration Script

### Minute 0:00 – 0:45: The Problem & Live Service Status
- **Spoken**: *"In Delhi, street animals and vulnerable citizens face fatal delays because ambulances transport them to shelters with no operating theatre. UMEED bridges this gap with AI multimodal triage and Meko persistent coordination memory."*
- **Action**: Open [http://localhost:3000/api/health](http://localhost:3000/api/health).
- **Show**: Point out `gemini_ai: operational`, `meko_context: operational`, and `database: healthy_demo_mode`.

### Minute 0:45 – 1:30: Citizen Distress Reporting & AI Triage
- **Action**: Navigate to `/report`.
- **Action**: Select `Injured Animal`, paste scenario: *"Stray dog hit by a two-wheeler near Pitampura Metro Station. Compound leg fracture, bleeding heavily."*
- **Action**: Submit report. Copy public reference (`UMD-XXXX-XXXX`).
- **Action**: Open Coordinator Queue at `/incidents`. Show Gemini multimodal triage classifying severity as `CRITICAL` with 95% confidence and recommending ambulance transit. Click **Approve Incident & Open Assistance Case**.

### Minute 1:30 – 2:45: The Core Proof — Meko Context & A1 Experiment
- **Action**: Open the case at `/cases/CASE-XXXX-XXXX`.
- **Action**: Scroll to **Meko Context Inspector**.
- **Action**: Click **Run A1 Experiment (OFF vs ON)**.
- **Show**:
  - **Meko OFF**: Only dispatches `Jan Seva Ambulance` (Transit). Zero surgical care planned.
  - **Meko ON**: Retrieves authentic lesson `dcf042be-0b29-4afc-a5e2-cb3c87d071b0`. Injects requirement `veterinary_care`.
  - **Dual Dispatch**: Shows `Jan Seva Ambulance` (transit) + `Delhi Veterinary Surgical Trust` (surgery).
  - Point out the `[DEMO_ONLY]` label and explain that authoritative NGO capacity comes from UMEED's registry.

### Minute 2:45 – 3:45: Field Action & Injected Resolution Gate
- **Action**: Navigate to `/responder`. Select `Jan Seva Ambulance`.
- **Action**: Accept assignment $\to$ Click **Record Intervention** with note *"Animal stabilized in transit van."*
- **Action**: Return to case view. Show that case status transitioned to `FOLLOW_UP_REQUIRED`.
- **Show**: Point to the **Downstream Handoff Checkpoints**. Point out `Receiving Provider Acceptance` (`chk_receiving_acceptance`).
- **Action**: Attempt to resolve the case. Point out that the system **blocks premature resolution** because clinical admission is still pending!

### Minute 3:45 – 4:30: Human Oversight — Context Inspector Controls
- **Action**: Return to **Meko Context Inspector** at the bottom of the page.
- **Show**: Point out the live trace card showing `recalled_memory_id: dcf042be-0b29...`.
- **Action**: Click **Edit** to demonstrate `memory_update` (coordinator corrects a lesson).
- **Action**: Click **Forget** to demonstrate `memory_delete_by_id` (right-to-forget redaction).
- **Action**: Click **Promote** to show two-phase confirmation notes for `memory_promote`.

### Minute 4:30 – 5:00: Summary & Track A Wrap-up
- **Spoken**: *"UMEED proves that Meko coordination memory transforms isolated emergency pickups into verified, closed-loop clinical resolutions. We have zero PII in memory, timing-safe role security, and 100% reproducible live MCP integration."*

---

## 3. Fallback Plan (Simulated Offline Mode)

If internet connectivity or Meko remote service experiences an outage during the live pitch:
1. The application automatically falls back to its offline deterministic fixtures (`apps/web/src/fixtures/demo/index.ts`).
2. The UI clearly displays `status: "OFFLINE_DEMO_FIXTURE"`.
3. The A1 experiment runs deterministically in 12ms using verified local mock responses.
4. **Honest Disclosure**: State to judges: *"The live remote MCP server is currently unreachable; the application is demonstrating its deterministic offline resilience using cached verified fixtures."*
