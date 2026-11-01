# UMEED — Notification Architecture and Durable Outbox Specification
**Version**: 2.0.0  
**Classification**: Infrastructure Standard  

---

## 1. Durable Notification Outbox Pattern

To ensure reliable, auditable, and idempotent communication with NGOs and field responders, UMEED uses a transactional outbox architecture:

```
[ Domain Operation ] (e.g. Outreach Wave Generated)
        |
        v
[ Enqueue in Notification Outbox ] (status: "PENDING", with SHA-256 Idempotency Key)
        |
        v
[ Outbox Processing Worker ] (bounded retries with exponential backoff)
        |
        +---> Production Mode -> ProductionNotificationAdapter
        |                             |
        |                             +--> Configured Webhook/Gateway -> HTTP POST -> ACCEPTED_BY_PROVIDER
        |                             +--> Unconfigured Credentials -> Return NOT_CONFIGURED (No false claim)
        |
        +---> Test/Sandbox Mode -> MockNotificationAdapter (status: SIMULATED_MOCK, is_mock: true)
```

---

## 2. Notification Lifecycle States

- `PENDING`: Enqueued in persistent outbox; awaiting delivery attempt.
- `PROCESSING`: Picked up by notification worker; lock acquired.
- `ACCEPTED_BY_PROVIDER`: Gateway (Twilio/SendGrid/Carrier Webhook) acknowledged receipt.
- `DELIVERED`: Confirmed carrier delivery receipt received via webhook.
- `FAILED`: Delivery failed after 3 bounded retries.
- `CANCELLED`: Superseded by competing acceptance prior to dispatch.
- `NOT_CONFIGURED`: Gateway credentials missing in production environment. Fails cleanly with transparent logging; never claims false delivery.

---

## 3. Idempotency & Webhook Reconciliation

- **Idempotency Key**: Computed as `SHA-256(caseId:requirementId:attemptId:recipient:channel)`. Prevents duplicate SMS/Email dispatch on network retries or replays.
- **Delivery Webhook**: Inbound carrier delivery receipts (`POST /api/notifications/webhook`) must verify HMAC signatures and reconcile delivery timestamps against outbox records.
