# UMEED Privacy & Data Governance Specification

**System**: UMEED (Closed-Loop Social Distress Assistance Platform)  
**Hackathon**: HackCBS 9.0  
**Authors**: Senior Security Engineer, Enterprise Systems Architect  
**Status**: Specification & Privacy Charter  

---

## 1. Core Privacy Philosophy: Protection of the Vulnerable

UMEED handles reports of individuals and animals in acute distress. In many cases, reporting subjects include abandoned children, unhoused families, elderly persons experiencing memory impairment, or injured community animals. 

A careless disclosure of exact locations, identities, or medical conditions could expose vulnerable subjects to exploitation, eviction, harassment, or retaliation. Therefore, UMEED operates under a strict **Zero-Harm Data Privacy Framework**.

---

## 2. Privacy Boundaries by User Persona

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PII VISIBILITY MATRIX                           │
├───────────────────┬──────────────┬──────────────┬──────────────┬───────┤
│ Data Element      │ Citizen      │ Coordinator  │ NGO Field    │ Public│
│                   │ (Reporter)   │ (Vetted)     │ (Assigned)   │ Web   │
├───────────────────┼──────────────┼──────────────┼──────────────┼───────┤
│ Exact GPS (Lat/Lon│ Full (Own)   │ Full         │ Full         │ REDACT│
│ Street Landmark   │ Full (Own)   │ Full         │ Full         │ REDACT│
│ District Name     │ Full         │ Full         │ Full         │ Full  │
│ Raw Distress Photo│ Full (Own)   │ Full (Vetted)│ Full (Vetted)│ REDACT│
│ Beneficiary Face  │ Visible      │ Blurred      │ Blurred      │ HIDDEN│
│ Citizen Phone/Mail│ Full (Own)   │ Full (Opt-in)│ Redacted     │ HIDDEN│
│ Responder Telemetry Redacted     │ Real-time    │ Real-time    │ REDACT│
│ Case Outcome State│ Milestone    │ Full History │ Own Cases    │ None  │
└───────────────────┴──────────────┴──────────────┴──────────────┴───────┘
```

---

## 3. The Public Redaction Boundary

Public tracking screens (`/track/[referenceCode]`) and public analytical widgets **must never disclose**:
1. **Precise Coordinates**: Latitude and longitude are stripped from public responses and rounded to the operational district or major administrative division (e.g., *"North West Delhi"*).
2. **Doorstep Landmarks**: Specific apartment numbers, alleyway landmarks, or building names are restricted to the assigned responder's dispatch view.
3. **Contact Identifiers**: Neither the bystander who submitted the report nor the personal phone numbers of field volunteers are publicly accessible.
4. **Responder Vehicle Telemetry**: Public trackers render discrete milestone badges (`DISPATCHED`, `ARRIVED`), never a live real-time vehicle GPS tracking pin.

---

## 4. Anonymous Reporting & Data Minimization

- **No Compulsory Registration**: Citizens are never forced to create an account, log in with social media, or provide an email/phone number to submit a distress report.
- **Reference Code as Bearer Token**: A cryptographically random alphanumeric code (e.g., `UMD-7B29-4K12`) is issued at submission. Possession of the code grants access only to the sanitized milestone tracker.
- **Optional Contact Information**: If a citizen voluntarily provides a phone number for location clarification, it is stored in a segregated field, encrypted at rest, and accessible solely to authorized coordinators.

---

## 5. Automated Log Sanitization & Ingestion Scrubbing

All log events pass through `apps/web/src/lib/security`, which intercepts and masks:
- Indian mobile phone numbers (`+91` / 10-digit series) replaced with `[REDACTED_PHONE]`
- Email addresses replaced with `[REDACTED_EMAIL]`
- Bearer tokens, authorization headers, and MongoDB connection URIs replaced with `[REDACTED_SECRET]`

---

## 6. Retention and Media Lifecycle

1. **Active Incidents**: Raw photographic evidence is preserved in access-controlled object storage for the duration of the active coordination lifecycle (`REPORTED` through `RESOLVED`).
2. **Post-Resolution**: 30 days after verified case closure, high-resolution media is compressed and archived; facial regions are blurred before any retention for research or model evaluation.
3. **Right to Erasure**: Any individual or authorized legal representative may request immediate redaction or deletion of an incident report by submitting the tracking code to `privacy@umeed.org`.
