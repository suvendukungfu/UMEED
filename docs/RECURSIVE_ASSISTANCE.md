# UMEED Recursive Assistance Engine & Multi-Cycle Coordination

## 1. The Core Differentiator

Traditional emergency reporting platforms operate as a "fire-and-forget" broadcast: an incident is ingested, an NGO is alerted, and the ticket is immediately closed regardless of whether the beneficiary actually received comprehensive care.

In reality, real-world social distress is multi-stage and compound:

- An injured street canine first requires emergency field stabilization by an animal ambulance (`Cycle 1`).
- Upon on-scene examination, the veterinary responder discovers a compound limb fracture requiring orthopedic surgery and in-patient hospitalization (`Cycle 2`).
- After surgery, post-operative rehabilitation and shelter are required (`Cycle 3`).

UMEED's **Recursive Assistance Engine** is the technological engine that ensures closed-loop accountability across all sequential stages of distress.

---

## 2. Dynamic Follow-Up Cycle Algorithm

When an assigned responder submits an intervention record via `POST /api/assignments/:id/interventions`:

1. **Unfulfilled Needs Calculation**:
   $$\text{Remaining Needs} = (\text{Prior Unresolved} \setminus \text{Assistance Provided}) \cup \text{Additional Needs Discovered}$$
2. **State Evaluation**:
   - If $\text{Remaining Needs} = \emptyset$: Case transitions to `INTERVENTION_PROVIDED`. Case is ready for coordinator final resolution review.
   - If $\text{Remaining Needs} \neq \emptyset$: Case transitions to `FOLLOW_UP_REQUIRED`.
3. **Triggering Next Matching Cycle**:
   - Coordinator triggers `POST /api/cases/:caseReference/follow-up`.
   - Cycle increments: `current_matching_cycle = current_matching_cycle + 1`.
   - Case returns to `MATCHING` status.
   - Explainable matching engine executes against the remaining needs ($\text{Remaining Needs}$).
   - Organisations that previously rejected, expired, or failed delivery on this case are excluded to prevent infinite notification loops.
   - All historical assignments, contact attempts, and intervention records from prior cycles remain permanently preserved in the case audit ledger.

---

## 3. Stopping Conditions & Coordinator Escalation

To prevent infinite matching cycles and guarantee deterministic system termination, two automated stopping conditions are strictly enforced:

### Condition 1: Maximum Cycles Reached

- Each case carries a configurable `max_matching_cycles` threshold (default: 3).
- If `current_matching_cycle >= max_matching_cycles` and unfulfilled needs remain, the engine automatically transitions the case to `ESCALATED`.
- Logged with structured alert: `"Case escalated due to reaching max matching cycles"`.

### Condition 2: Zero Eligible Organisations

- If the matching engine evaluates the remaining specialized requirements and identifies 0 eligible registered organisations in the geographic radius, the engine halts automated dispatch and transitions the case to `ESCALATED`.
- Logged with structured alert: `"Case escalated due to zero eligible NGOs in new cycle"`.

### Human Agency Preservation

When escalated, the platform surfaces an urgent action alert in the Coordinator Case Workspace (`/cases`). The human coordinator can:

1. Expand geographic radius or manually override eligibility constraints.
2. Contact allied government municipal agencies (e.g. Delhi Municipal Corporation / Police).
3. Directly resolve the case with documented external proof (`override_unresolved: true`).
