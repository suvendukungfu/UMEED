# UMEED — Phase 8 Database Data Model & Integrity Audit

**Document Version**: 1.0.0  
**Phase**: Phase 8 — Persistence, Production Hardening & Final HackCBS Release  
**Owner**: Senior Data Architect  
**Evaluation Date**: 2026-10-31  

---

## 1. Entity Model Architecture

UMEED coordinates distress response through an aggregate root architecture:

```
[IncidentDocument] (Citizen Distress Report)
       │ (1:1 Approved Transition)
       ▼
[Case Aggregate Root] (Operational Case)
       ├─── [CaseAssignment[]] (Multi-NGO assignments)
       ├─── [InterventionRecord[]] (Field evidence & actions)
       ├─── [HandoffCheckpoint[]] (Downstream care verifications)
       └─── [CaseEvent[]] (Immutable audit timeline)
```

---

## 2. Entity Specification & Constraint Matrix

| Entity | Primary Identifier | Public Route Key | Unique Constraints | Immutability / Versioning |
| :--- | :--- | :--- | :--- | :--- |
| **Incident** | `_id` (`inc_...`) | `public_reference` (`UMD-XXXX-XXXX`) | `{ source_type, source_reference }`, `public_reference` | `schema_version: "1.0.0"`, mutable status transitions |
| **Case** | `case_id` (`case_...`) | `public_case_reference` (`CASE-XXXX-XXXX`) | `case_id`, `incident_id` (1:1), `public_case_reference` | Updated atomically with timestamped audit events |
| **Assignment** | `assignment_id` (`asg_...`) | Sub-document of Case | Unique `assignment_id` per case; max 50 assignments | Transition state machine (`ASSIGNMENT_TRANSITIONS`) |
| **Intervention** | `intervention_id` (`int_...`) | Sub-document of Case | Unique `intervention_id` per case; max 50 interventions | Append-only; verified by coordinator |
| **Handoff Checkpoint**| `checkpoint_id` (`chk_...`) | Sub-document of Case | Unique `checkpoint_id` per case | Injected by Meko context or category template |
| **Case Event** | `event_id` (`evt_...`) | `case_events` collection | `event_id`, chronological index `{ case_id, timestamp }` | Append-only immutable log |
| **NGO Profile** | `ngo_id` (`DEMO-NGO-XXX`) | `ngo_id` | `ngo_id`, `registration_number` (sparse) | Updated via verified administrative audit |

---

## 3. Data Integrity Invariants & Enforcements

### 3.1 Idempotent Ingestion & Duplicate Suppression
- **Citizen Reports**: When a citizen resubmits identical reports, the compound index `{ source_type: 1, source_reference: 1 }` triggers an idempotent replay handler in `apps/web/src/features/incidents/services/incident.service.ts`:
  - Returns HTTP `200 OK` with the existing `public_reference`.
  - Does **not** reissue a new citizen tracking token.
  - Prevents multiple coordinator cases from spawning for the same distress event.
- **Geographic Duplicate Detection**: Automated `$nearSphere` geospatial proximity scanning detects reports within 500m occurring within 2 hours, flagging `is_suspected_duplicate: true` for coordinator deduplication review.

### 3.2 Handoff Verification Gate Before Case Resolution
In `apps/web/src/features/cases/services/case.service.ts`:
- **Strict Invariant**: A case cannot transition to `RESOLVED` if `unresolved_requirements.length > 0` or if contextual handoff checkpoints (e.g. `chk_receiving_acceptance`) remain unverified.
- **Override Mechanism**: A coordinator may supply `override_unresolved: true` with a mandatory human rationale (`rationale.length >= 5`) and supporting evidence URLs.

### 3.3 Atomic Concurrency & State Mutation
- MongoDB operations use atomic `$set` and `$push` operators via `findOneAndUpdate()`:
  ```typescript
  await collection.findOneAndUpdate(
    { case_id: caseId },
    {
      $set: { ...partial, updated_at: new Date().toISOString() },
    },
    { returnDocument: "after" }
  );
  ```
- **Concurrency Decision**: The aggregate root design encapsulates assignments and interventions within the `Case` document. In a multi-NGO response, updates to distinct assignments or append-only interventions avoid partial document write conflicts without requiring heavyweight distributed transaction locks.

### 3.4 Temporal & Timestamp Handling
- All timestamps adhere strictly to ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Zod schemas validate timestamps via `.datetime()`.

### 3.5 Privacy & PII Boundary (A5 Compliance)
- **Plaintext Citizen Tokens**: Never stored in the database. Only SHA-256 hashes (`tracking_token_hash`) are persisted.
- **Meko Context Boundary**: Meko MCP memory tools (`memory_add`, `memory_search`) strictly receive de-identified operational lessons. Beneficiary names, phone numbers, exact addresses, and citizen tokens are stripped before context ingestion.

---

## 4. Verdict

**PASS**. The data architecture enforces strict relational integrity, atomic state machine transitions, immutable audit logging, and automated duplicate prevention across both MongoDB Atlas and the in-memory fallback engine.
