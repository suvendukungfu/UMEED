# UMEED — Background Worker Operations & Asynchronous Processing

**Process Group:** `worker`  
**Host Application:** `umeed-api` (Fly.io Mumbai `bom`)  
**Source Code:** `apps/backend/src/worker.ts`  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Asynchronous Architecture & Decoupling

In serverless architectures, running background tasks inside HTTP request handlers causes premature container termination and unhandled promise rejections. In UMEED, all asynchronous workloads are extracted to an independent **Worker Process Group** deployed alongside the API service in Fly.io Mumbai.

### Worker Responsibilities
1. **Notification Outbox Dispatch:** Delivering SMS, email, and coordinator alert messages.
2. **Watchdog SLA Scanner:** Detecting unattended distress reports exceeding response thresholds.
3. **Multimodal AI Jobs:** Processing asynchronous visual triage without blocking intake APIs.
4. **Data Retention & Lifecycle:** Purging expired ephemeral logs and rotating tokens.

---

## 2. Notification Outbox Pattern & Atomic Leases

To guarantee that notifications are never duplicated or lost during container redeployment:

```
┌─────────────────┐       ┌────────────────────────┐       ┌─────────────────┐
│ Fastify API     │ ----> │ MongoDB Outbox Record  │ <---- │ Fly Worker      │
│ (Enqueues task) │       │ status: "PENDING"      │       │ (Atomic Claim)  │
└─────────────────┘       └────────────────────────┘       └────────┬────────┘
                                                                    │
                                                                    ▼ Provider
                                                           ┌─────────────────┐
                                                           │ External SMS /  │
                                                           │ Email Provider  │
                                                           └─────────────────┘
```

### Atomic Claim Protocol
The worker executes an atomic find-and-modify with a 30-second lease lock:
```typescript
db.collection("notification_outbox").updateOne(
  {
    _id: messageId,
    status: "PENDING",
    $or: [{ lockExpiresAt: { $exists: false } }, { lockExpiresAt: { $lt: new Date() } }]
  },
  {
    $set: {
      status: "PROCESSING",
      lockExpiresAt: new Date(Date.now() + 30000),
      updatedAt: new Date()
    }
  }
)
```
- If the worker crashes mid-delivery, the lease expires after 30 seconds, allowing another worker instance to retry the task.
- Once the provider acknowledges receipt, the message status transitions to `DELIVERED`.

---

## 3. SLA Watchdog & Escalation Engine

Every 60 seconds, the worker scans the `incidents` collection for reports in `REPORTED` status older than 30 minutes that have not been triaged:
1. Marks incident as `escalated: true`.
2. Elevates urgency level to `CRITICAL`.
3. Emits high-priority coordinator broadcast alert into the outbox.

---

## 4. Signal Handling & Graceful Shutdown

Upon receiving `SIGTERM` (e.g., during a rolling deployment on Fly.io):
1. The worker terminates polling loops immediately.
2. In-flight outbox deliveries finish cleanly within Fly's 10-second `kill_timeout`.
3. MongoDB client connection pool closes gracefully.
4. Process exits with code 0 without leaving orphaned database locks.

