# UMEED Data Privacy & Humanitarian Access Policy

**Document Version**: 2.0.0  
**Status**: APPROVED DATA GOVERNANCE POLICY  
**Standard Compliance**: ICRC Humanitarian Data Protection Standards / GDPR Article 9 Principles  

---

## 1. Principles of Humanitarian Data Governance

Humanitarian data handling in UMEED is governed by the principle of **Do No Harm**:
1. **Consent-First Data Collection**: Citizens reporting distress explicitly consent to the operational transmission of their location and description solely for rescue and relief coordination.
2. **Data Minimization**: Responders receive only the essential operational details necessary to perform physical assistance (e.g. approximate location, physical description). Full historical beneficiary profiles are never exposed to field workers.
3. **No Commercial Use or Advertising**: Operational distress data is never shared with commercial brokers, advertisers, or credit assessment agencies.
4. **Purpose Limitation**: Distress data is collected exclusively for emergency assistance dispatch, responder safety, and auditable relief verification.

---

## 2. PII Classification and Redaction Rules

| Data Classification | Fields | Access Rules | Redaction Policy |
|---|---|---|---|
| **Direct Beneficiary PII** | Full name, personal phone number, exact GPS coordinates, detailed medical notes | Restricted to Assigned Coordinator and Active Responder during emergency response. | Fully redacted in Public, NGO listing, Auditor, and Analytics views. |
| **Operational Identifiers** | Public reference (`UMD-XXXX-XXXX`), Case reference (`CASE-XXXX-XXXX`), NGO Name | Visible to all authenticated coordinators, assigned NGO personnel, and tracking citizens. | Publicly queryable only with a valid confidential tracking token. |
| **Statistical & Impact Data** | District, assistance category, response time, resolution outcome status | Aggregated platform-wide for public transparency and donor reporting. | Always anonymized; minimum aggregation cohort size of $N \ge 5$ to prevent re-identification. |

---

## 3. Right to Erasure and Rectification

1. **Citizen Request Withdrawal**: A citizen holding the authentic tracking token may request withdrawal of an unassigned request.
2. **Post-Resolution Anonymization**: 90 days after case resolution (`RESOLVED`), direct citizen phone numbers and names are permanently scrubbed from the operational database, preserving only anonymized geographic coordinates and incident types for disaster planning.

