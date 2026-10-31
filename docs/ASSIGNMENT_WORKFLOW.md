# UMEED Multi-NGO Assignment Workflow & State Machine

## 1. Overview

Cases frequently require assistance beyond the capacity or specialization of a single organisation (e.g. an injured animal requiring an immediate field ambulance and subsequent specialized surgery in a hospital ward).

UMEED coordinates multiple organisations concurrently on a single case while enforcing strict tenancy isolation and non-conflicting primary ownership per requirement.

---

## 2. The 15 Assignment Statuses

Every organisation assignment transitions through an isolated 15-status lifecycle:

| Status | Phase | Description |
| --- | --- | --- |
| `PROPOSED` | Recommendation | Recommended by matching algorithm; pending coordinator outreach review. |
| `CONTACT_READY` | Coordinator Selection | Coordinator approved organisation for outreach. |
| `CONTACT_QUEUED` | Dispatch | Notification job written to persistent transactional outbox. |
| `CONTACTED` | Outreach | Dispatch adapter successfully processed notification attempt. |
| `CONTACT_FAILED` | Resiliency | Delivery attempt failed (carrier/adapter error). Preserves case record. |
| `ACKNOWLEDGED` | Responder Receipt | NGO responder viewed notification or confirmed preliminary receipt. |
| `REQUESTED_INFORMATION` | Responder Inquiry | NGO requested clarifying details (e.g. landmark, beneficiary status). |
| `ACCEPTED` | Primary Commitment | NGO officially accepted dispatch responsibility for the requirement. |
| `REJECTED` | Responder Decline | NGO declined dispatch with structured reason. Freezes assignment. |
| `EXPIRED` | SLA Breach | Acceptance deadline lapsed without responder confirmation. |
| `EN_ROUTE` | Field Operations | Responder units mobilized and in transit to the distress location. |
| `ARRIVED` | Field Operations | Responder on-scene; verified presence at distress coordinates. |
| `INTERVENTION_RECORDED` | Record Keeping | Assistance delivered and documented with evidence references. |
| `COMPLETED` | Resolution | Requirement fulfilled and verified by human coordinator. |
| `CANCELLED` | Management | Assignment aborted by coordinator before fulfillment. |

---

## 3. Concurrency & Collision Protection

### Single Active Responder per Requirement

To prevent confusion, duplicate dispatches, and wasted emergency resources:

- When an assignment for a given requirement enters `ACCEPTED`, `EN_ROUTE`, `ARRIVED`, or `INTERVENTION_RECORDED`, all subsequent assignment attempts for that same requirement are blocked.
- If two organisations were simultaneously contacted (`CONTACTED`) for the same requirement:
  - The first organisation to call `POST /api/assignments/:id/accept` secures the primary assignment.
  - The second organisation's acceptance attempt is safely rejected with `409 Conflict`:
    `"Requirement '...' was already accepted by '...' at ..."`

---

## 4. Multi-Need Assignment Model

A single case maintains an array of assignments partitioned by requirement:

```json
{
  "public_case_reference": "CASE-2026-DEL-014",
  "assignments": [
    {
      "assignment_id": "asg_001",
      "organisation_id": "ngo_del_001",
      "organisation_name": "Delhi Animal Welfare Society",
      "requirement": "animal_ambulance",
      "status": "COMPLETED",
      "assigned_at": "2026-10-31T14:00:00Z",
      "contact_attempts": [
        {
          "attempt_id": "att_001",
          "channel": "in_app",
          "status": "SIMULATED_MOCK",
          "details": "Delivered via simulated_mock (is_mock: true)"
        }
      ]
    },
    {
      "assignment_id": "asg_002",
      "organisation_id": "ngo_del_007",
      "organisation_name": "Friendicoes SECA Emergency Hospital",
      "requirement": "orthopedic_surgery",
      "status": "EN_ROUTE",
      "assigned_at": "2026-10-31T15:30:00Z",
      "contact_attempts": [...]
    }
  ]
}
```

---

## 5. Tenancy & Privilege Isolation

1. **Cross-Organisation Barrier**: An NGO authenticated as `ngo_del_001` cannot accept, reject, or record interventions for an assignment belonging to `ngo_del_007`. Unauthorised mutations return `403 Forbidden`.
2. **Coordinator Oversight**: Coordinators possess authority to view all assignments across organisations and cancel or reassign as operational priorities dictate.
