# UMEED — Data Retention, Redaction, and Deletion Policy
**Version**: 2.0.0  
**Classification**: Data Governance Standard  

---

## 1. Retention Schedules by Record Type

| Record Type | Retention Window | Storage Tier | Action Upon Expiration |
| :--- | :--- | :--- | :--- |
| **Active Distress Submissions** | 90 days following case resolution | Hot Storage (MongoDB Atlas) | PII anonymized; statistical metadata retained for citywide impact analytics |
| **Confidential Tracking Tokens** | 30 days post-closure | Hot Storage | Token revoked and hard deleted from session cache |
| **Field Rescue Evidence (Photos/Audio)** | 180 days post-resolution | Private Encrypted Object Storage | Purged unless flagged for ongoing legal or audit inquiry |
| **Notification Outbox Records** | 60 days | Hot Storage | Delivery logs purged; aggregated SLA counts retained |
| **Administrative & Dispatch Audit Logs** | 3 years (Statutory compliance) | Cold Encrypted Storage | Preserved for independent auditor review |

---

## 2. Redaction and Anonymization Workflow

Upon reaching the retention window:
1. Reporter `name` replaced with `[REDACTED_DATA_PRINCIPAL]`.
2. Reporter `phone` replaced with `+91-XXXXX-XXXXX`.
3. Street address replaced with district-level administrative boundary centroid.
4. Exact latitude and longitude truncated to 2 decimal places (~1.1 km precision) for historical density modeling.
5. Evidence images deleted from secure object storage bucket.
