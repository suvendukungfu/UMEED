# UMEED NGO Verification Tiers & Governance Framework (Phase 4)

**Governance Role**: Senior Open Source Maintainer & Verification Architect  
**Scope**: Operational Credentialing, NGO-DARPAN Disambiguation & Provenance Tracking  

---

## 1. Core Verification Philosophy

In disaster response and distress assistance, assuming that an organisation is operationally capable simply because it holds an official government registration (such as an NGO-DARPAN ID from NITI Aayog) is hazardous. Many registered entities are administrative holding trusts, educational endowments, or dormant charities without field teams or active intake facilities.

UMEED establishes a strict separation between **statutory registration** and **operational readiness**:
- Statutory registration confirms legal existence and corporate standing.
- Operational verification confirms live physical facilities, response staff, working helplines, and dispatch capacity.

---

## 2. Verification Tiers

```
                               ┌─────────────────────────────┐
                               │         UNVERIFIED          │
                               │  (New Import / Self-Report) │
                               └──────────────┬──────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
            ┌─────────────────────────┐               ┌─────────────────────────┐
            │     PUBLICLY_LISTED     │               │   REGISTRATION_CHECKED  │
            │ (Public Record / Nodal) │               │ (DARPAN / Trust Valid)  │
            └────────────┬────────────┘               └────────────┬────────────┘
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              │ Field Inspection &
                                              │ Live Capacity Check
                                              ▼
                               ┌─────────────────────────────┐
                               │    OPERATIONALLY_VERIFIED   │
                               │ (Active within last 90 days)│
                               └──────────────┬──────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │        SUSPENDED        │                     │         INACTIVE        │
         │ (Non-responsive / Flags)│                     │  (Dissolved / Ceased)   │
         └─────────────────────────┘                     └─────────────────────────┘
```

### Tier Descriptions & Permissions

| Tier | Matching Eligibility | Multiplier ($M_{\text{tier}}$) | Public Directory | Coordinator Dispatch | Audit Requirement |
|---|:---:|:---:|:---:|:---:|---|
| **`OPERATIONALLY_VERIFIED`** | Yes (Primary) | `1.00` | Shown with badge | Immediate | Physical or video check of facility within 90 days; verified direct phone |
| **`REGISTRATION_CHECKED`** | Yes (Secondary) | `0.90` | Shown | Requires phone confirmation | Valid NGO-DARPAN ID, Society/Trust registration number confirmed in registrar database |
| **`PUBLICLY_LISTED`** | Yes (Tertiary) | `0.75` | Shown | Manual verification required | Verified listing in government disaster plan, hospital referral list, or official municipal directory |
| **`UNVERIFIED`** | Restricted | `0.50` | Hidden | Prohibited | Initial intake from CSV bulk import or online submission; unverified claims |
| **`SUSPENDED`** | Disqualified | `0.00` | Hidden | Prohibited | Multiple failed dispatches, fraudulent reports, or safety violations |
| **`INACTIVE`** | Disqualified | `0.00` | Hidden | Prohibited | Organisation officially ceased operations, dissolved, or relocated outside coverage territory |

---

## 3. Verification Evidence Schema

All verified organisations record cryptographic and provenance evidence in their `verification_evidence` field:

```typescript
interface NGOPrivateEvidence {
  verified_by: string;              // Coordinator ID who executed the verification
  verified_at: string;              // ISO 8601 timestamp of verification
  darpan_id: string | null;         // Validated NITI Aayog NGO-DARPAN Unique ID (e.g. "DL/2018/0184920")
  documentation_urls: string[];     // URLs to statutory filings (e.g. 12A, 80G, Trust Deed, Site Visit Report)
  verification_notes: string | null;// Specific operational constraints recorded by coordinator
}
```

### Audit Invariants
1. `verified_by` must refer to an authorized coordinator identity or verified ingestion harness.
2. `verified_at` cannot be post-dated into the future.
3. If `darpan_id` is supplied, it must conform to the standard alphanumeric format (e.g., `^[A-Z]{2}/[0-9]{4}/[0-9]{7}$`).

---

## 4. Prohibition of Fabricated or Placeholder Contacts

In emergency distress coordination, placeholder contact details (such as `"test@example.com"` or `"9999999999"`) can cause catastrophic communication delays.

- **Production Rules**:
  - All phone numbers must be validated Indian telecommunication numbers (e.g., `+91` prefix or 10-digit mobile/landline with STD code).
  - All emails must be syntactically valid RFC 5322 addresses.
  - Fake, placeholder, or mock contact details in production environments trigger immediate validation rejections (`400 Bad Request`).
- **Demonstration Data (`is_demo: true`)**:
  - Synthetic seed organisations are explicitly flagged with `is_demo: true`.
  - Synthetic contacts use reserved, non-routable numbers or official government helplines (e.g., national disaster or animal distress helplines) and are clearly marked `DEMO_ONLY`.
