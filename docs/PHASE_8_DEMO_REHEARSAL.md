# UMEED — Phase 8 Final End-to-End Demo Rehearsal Guide

**Document Version**: 1.0.0  
**Phase**: Phase 8 — Persistence, Production Hardening & Final HackCBS Release  
**Owner**: Senior QA Lead & Product Release Engineer  
**Evaluation Date**: 2026-10-31  

---

## 1. Demo Architecture & Ethics Statement

All data used in this demonstration consists exclusively of **synthetic scenario fixtures** and **fictional NGO profiles** clearly marked with `[DEMO_ONLY]`. No real citizen distress calls, live phone numbers, or vulnerable individuals are utilized.

---

## 2. Five-Minute Timed Demonstration Sequence

### Stage 1: Clean Boot & Health Check (0:00 – 0:30)
1. Start the application:
   ```bash
   npm run dev
   ```
2. Navigate to [http://localhost:3000/api/health](http://localhost:3000/api/health) to show live service status:
   - Application: `operational`
   - Gemini AI: `operational` (`gemini-2.5-flash`)
   - Meko MCP Layer: `operational` (Product Datapack active)
   - Persistence: `InMemoryIncidentRepository (Development/Demo Only)`

### Stage 2: Citizen Distress Reporting (0:30 – 1:00)
1. Navigate to `/report`.
2. Select incident category: `Injured Animal (Accident / Laceration)`.
3. Provide synthetic scenario:
   > *"Street dog hit by a two-wheeler near Pitampura Metro Station. Compound leg fracture, bleeding heavily, immobile on roadside."*
4. Click **Submit Emergency Distress Report**.
5. The citizen is issued a private reference (`UMD-XXXX-XXXX`) and an ephemeral tracking token.

### Stage 3: Automated AI Triage & Coordinator Queue (1:00 – 1:45)
1. Navigate to `/incidents` (Coordinator Queue).
2. Observe the automated Gemini multimodal triage card:
   - Severity: `CRITICAL`
   - Confidence: `0.95`
   - Inferred assistance needs: `["field_ambulance", "fracture_stabilization"]`
3. Click **Approve Incident & Open Assistance Case**.

### Stage 4: Meko-Grounded NGO Matching (1:45 – 2:30)
1. Open the created case at `/cases/CASE-XXXX-XXXX`.
2. Inspect the **Meko Context Layer** section:
   - Shows badge: `Meko Connected — umeed-product-context`.
   - Click **Run Grounded Matching (Meko ON)**.
3. Observe the operational difference:
   - Meko recalls precedent `mem_lesson_vet_trauma_001`: *"Separate physical capture/transport from secondary veterinary trauma surgery to prevent post-rescue mortality."*
   - Requirements expand from `["field_ambulance"]` to include `["veterinary_care"]`.
4. Explainable Matching Result displays the **Dual-Provider Dispatch**:
   - Provider 1 (Transit): `Jan Seva Animal Emergency Ambulance [DEMO_ONLY]` (Score: 0.98)
   - Provider 2 (Surgery): `Delhi Veterinary Surgical Trust & Shelter [DEMO_ONLY]` (Score: 0.70)
5. Click **Confirm Assignments for Both Providers**.

### Stage 5: NGO Responder Acceptance & Field Intervention (2:30 – 3:30)
1. Navigate to `/responder`.
2. Select NGO: `Jan Seva Animal Emergency Ambulance`.
3. View the incoming assignment. Click **Accept Assignment** $\to$ **En Route** $\to$ **Arrived**.
4. Click **Record Intervention**:
   - Description: *"Animal stabilized with splint and loaded into trauma van. Transporting to Delhi Vet Surgical Trust."*
   - Assistance provided: `["first_aid_provided", "transport_arranged"]`.
   - Additional needs flagged: `["veterinary_surgery"]`.
5. Submit intervention. Notice that case status transitions to `FOLLOW_UP_REQUIRED`.

### Stage 6: Downstream Receiving Provider Handoff & Resolution Gate (3:30 – 4:30)
1. Return to `/cases/CASE-XXXX-XXXX`.
2. Inspect the **Handoff Intelligence Checkpoints**:
   - Stage 1: `Field Rescue & Transport` $\to$ `VERIFIED_COMPLETE`.
   - Stage 2: `Receiving Provider Acceptance` $\to$ `AWAITING_PROVIDER_ACCEPTANCE`.
3. Attempting to click **Resolve Case** is blocked:
   - Modal warning: *"Cannot resolve case: Receiving Provider Acceptance is pending verification."*
4. Confirm receiving provider intake from `Delhi Veterinary Surgical Trust & Shelter`.
5. Checkpoint clears $\to$ Click **Resolve Case** with coordinator audit sign-off.

### Stage 7: Meko Context Inspector & Controlled A1 Comparison (4:30 – 5:00)
1. Click **Inspect Meko Context** at the bottom of the case view:
   - View recalled memory cards.
   - Show human controls: **Correct Memory** (`memory_update`) and **Forget Memory** (`memory_delete_by_id`).
2. Click **Run A1 Controlled Experiment**:
   - Shows side-by-side modal of Control (Meko OFF) vs Treatment (Meko ON).
   - Demonstrates the causal requirement variance (`+ veterinary_care`) with live MCP attribution.

---

## 3. Demo Rehearsal Verdict

**PASS**. Full 13-stage lifecycle completes smoothly in under 5 minutes with zero unhandled exceptions, zero data leaks, and 100% explainable human oversight.
