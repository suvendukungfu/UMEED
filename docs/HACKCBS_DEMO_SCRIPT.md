# UMEED — HackCBS 9.0 Demonstration Script & Product Narrative

**Track**: Track A — Meko Challenge (Long-term Context, Coordination & Knowledge Evolution)  
**Duration**: 5 Minutes  
**Narrative Core**:  
> *"UMEED coordinates animal rescue and assistance using live operational data, while Meko preserves reusable lessons from previous interventions so that important follow-up requirements are less likely to be missed."*

---

## 1. Demo Checklist & Environment Setup

Prior to presenting to the judging panel:

1. Ensure Node.js runtime and Next.js dev server are running:

   ```bash
   npm run dev
   ```

2. Open Browser at `http://localhost:3000`.
3. Check `apps/web/.env.local`:
   - If live Meko API key is configured, Context Inspector displays **Meko Live (Connected)**.
   - If credentials are unconfigured, Context Inspector displays **Awaiting Key** with graceful fallback.
4. Verify seeded demo NGOs exist by visiting `/ngos` or viewing the case workspace.
5. Have the A1 experiment API endpoint ready:

   ```bash
   POST http://localhost:3000/api/context-learning/experiment-a1
   ```

---

## 2. Minute-by-Minute Demonstration Flow

### Minute 0:00 – 1:00: Problem & Live Intake

- **Speaker**: "In emergency street animal rescue, speed matters, but missing follow-up medical care is fatal. When a citizen reports a dog hit by a car with a severe fracture, standard dispatch engines only solve the initial ambulance transport. But what happens after the animal is picked up?"
- **Action**: Show citizen intake form (`/report`) and Gemini multimodal triage output.
- **Visual**: Show incoming triage tags: `["field_ambulance", "fracture_stabilization"]`.

### Minute 1:00 – 2:15: Run 1 — Meko Disabled (Baseline Coordination)

- **Speaker**: "First, let's watch what happens with standard deterministic coordination where historical memory is OFF."
- **Action**: Run baseline matching for `CASE-A1-CONTROL-OFF`.
- **Result**:
  - Top match: `Jan Seva Animal Emergency Ambulance` (Score: 94%).
  - The ambulance arrives, stabilizes the fracture, and picks up the animal.
  - **The Blindspot**: The ambulance provider does not operate a veterinary hospital or surgical theatre. The animal arrives at a shelter with no operating room prepared, leading to critical post-rescue delays.

### Minute 2:15 – 3:30: Run 2 — Meko Enabled (Contextual Recall)

- **Speaker**: "Now let's enable Meko coordination memory (`umeed-product-context`)."
- **Action**: Run grounded matching for `CASE-A1-TREATMENT-ON`.
- **Live Trace in Context Inspector**:
  - Meko `MatchingAgent` recalls approved lesson `mem_lesson_vet_trauma_001`:
    > *"Approved lesson: When coordinating street animal rescue with serious trauma, separate physical capture/transport from secondary veterinary trauma surgery and hospital admission..."*
  - Grounded reasoning augments requirements: `["field_ambulance", "fracture_stabilization", "veterinary_care"]`.
  - Matching engine executes deterministic evaluation across both requirements.
- **Outcome**: UMEED simultaneously matches:
  1. `Jan Seva Animal Emergency Ambulance` for urgent field transit.
  2. `Delhi Veterinary Surgical Trust & Shelter` for immediate surgical bed preparation.

### Minute 3:30 – 4:15: Context Inspector Walkthrough & Human Approval

- **Speaker**: "Notice that Meko never overrides current facts or invents fake NGO capacity. In the Context Inspector, the coordinator has full transparency."
- **Action**: Highlight the Context Inspector panel in the case view:
  1. **Datapack Status**: Active datapack `umeed-product-context` with MCP Streamable HTTP protocol.
  2. **Audit Provenance**: Shows timestamp, latency, and exact memory ID.
  3. **Privacy Distinction**: Demonstrates difference between private case memory and promoted shared knowledge.
  4. **Human in the Loop**: Show the "Request Promotion" workflow requiring explicit coordinator confirmation notes before knowledge becomes shared across NGOs.

### Minute 4:15 – 5:00: Privacy, Safety & Fallback Architecture

- **Speaker**: "Crucially, citizen privacy is non-negotiable. Before any lesson enters Meko, our Knowledge Curator automatically scrubs phone numbers, emails, tracking tokens, and exact GPS coordinates. And if Meko is ever unreachable, UMEED falls back gracefully to its deterministic baseline without dropping a single emergency rescue."
- **Conclusion**: "UMEED + Meko: Real-time humanitarian coordination powered by evolving, de-identified collective intelligence."

---

## 3. Judge FAQ Quick Answers

- **Q: Did Meko generate the NGO recommendations?**  
  *A: No. Meko only retrieved the grounded operational lesson. NGO availability, capacity, distance, and capability scores are computed deterministically by UMEED's authoritative repository to prevent hallucinations.*

- **Q: How is citizen privacy protected?**  
  *A: Strict PII filtering runs on every memory candidate before write. Citizen tracking tokens, names, contact numbers, and high-precision coordinates are strictly stripped.*

- **Q: What happens if Meko goes down?**  
  *A: The system uses bounded timeouts (15s) and retries, followed by graceful degradation to baseline matching. No rescue is ever blocked by an external network failure.*
