# UMEED Integration Configuration & External Services Inventory

**Document Version**: 2.0.0  
**Status**: APPROVED CONFIGURATION GUIDE  

---

## 1. External Integration Inventory

| Service | Environment Variable | Required in Production | Development Fallback Behavior |
|---|---|:---:|---|
| **MongoDB Atlas** | `MONGODB_URI` | **YES** | Ephemeral `InMemoryIncidentRepository`, `InMemoryCaseRepository`, etc. |
| **Google Gemini AI** | `GEMINI_API_KEY` | **YES** | Fail-soft `MANUAL_REVIEW_REQUIRED` triage with `confidence: 0.0`. |
| **Coordinator API Secret** | `COORDINATOR_API_KEY` | **YES** | Allows default dev key `umeed-coordinator-dev-key` when `NODE_ENV !== "production"`. |
| **Notification Gateway** | `NOTIFICATION_PROVIDER`, `TWILIO_ACCOUNT_SID`, `SENDGRID_API_KEY` | OPTIONAL | Durable `MockNotificationAdapter` recording outbox status as `"SIMULATED"`. |
| **Private Object Storage** | `S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | OPTIONAL | Local secure binary storage adapter with signed ephemeral URL generator. |
| **Crawler Auth Secret** | `CRAWLER_API_KEY` | **YES** | Prevents unauthorized ingestion of social media signals. |

---

## 2. Configuration Validation Rules

1. **Placeholders Rejected in Production**: Any variable containing `your_`, `replace_me`, `<insert_...>`, or `dummy` triggers a fatal configuration startup error when `NODE_ENV === "production"`.
2. **Never Log Secrets**: Logger formatting rules strictly mask all values for keys containing `KEY`, `SECRET`, `PASSWORD`, `TOKEN`, `CREDENTIAL`.
3. **Fail-Soft in Development**: In development mode (`NODE_ENV === "development"`), the system starts gracefully with clear console warnings explaining which services are operating in ephemeral or simulated modes.

