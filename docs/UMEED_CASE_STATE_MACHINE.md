# UMEED — Case and Assignment State Machine Specification
**Version**: 2.0.0  
**Classification**: Engineering Protocol  

---

## 1. Case State Machine

```
              +-------------------+
              |     REPORTED      |
              +-------------------+
                        |
                        | Human Review (Coordinator)
                        v
              +-------------------+
       +----->|     APPROVED      |
       |      +-------------------+
       |                |
       |                | Requirements Defined & Outreach Dispatched
       |                v
       |      +-------------------+
       |      | MATCHING_ACTIVE   |
       |      +-------------------+
       |                |
       |                | Provider Accepts Offer
       |                v
       |      +-------------------+
       |      |  ACCEPTED_ACTIVE  |
       |      +-------------------+
       |                |
       |                | Responders On-Site & Interventions Logged
       |                v
       |      +-------------------+
       |      |    IN_PROGRESS    |
       |      +-------------------+
       |                |
       |                +------------------+
       |                |                  |
       | Follow-Up Req  v                  v Human Coordinator Approval
       |      +-------------------+  +-------------------+
       +------|FOLLOW_UP_REQUIRED |  |     RESOLVED      | (Terminal)
              +-------------------+  +-------------------+
```

---

## 2. Requirement & Outreach Wave States

### 2.1 Assistance Requirement States
- `PENDING_DISCOVERY`: Initial creation upon case opening.
- `OUTREACH_ACTIVE`: First wave or subsequent wave dispatched.
- `ACCEPTED_ACTIVE`: Exactly one partner accepted exclusive assignment.
- `HUMAN_REVIEW`: Escalated due to timeout or zero eligible providers.
- `RESOLVED`: Field assistance verified complete.

### 2.2 Outreach Attempt States
```
CREATED -> QUEUED -> SENT -> DELIVERED -> ACKNOWLEDGED -> ACCEPTED
                                                       |
                                                       +-> REJECTED
                                                       +-> TIMED_OUT
                                                       +-> SUPERSEDED
```
- **Atomic Concurrency Guarantee**: When one provider accepts an offer (`POST /api/assistance/outreach/[attemptId]/accept`), all competing outreach attempts for that requirement automatically transition to `SUPERSEDED`.
- Competing acceptance requests received after assignment locking are rejected with `HTTP 409 Conflict`.
