# UMEED — Data Governance, Beneficiary Privacy, and DPDP Compliance
**Version**: 2.0.0  
**Classification**: Legal and Privacy Compliance Standard  

---

## 1. Regulatory Context (DPDP Act, 2023 & Rules, 2025)

UMEED processes distress signals and assistance data relating to individuals in vulnerable situations. This policy establishes compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Digital Personal Data Protection Rules, 2025.

### 1.1 Fiduciary and Processor Roles
- **Data Fiduciary**: UMEED Operations Foundation / Platform Governance Authority.
- **Data Processor**: Partner NGOs, ambulance fleets, and contracted service providers.
- **Data Principal**: Citizen reporters and individuals receiving humanitarian assistance.

---

## 2. 3-Tier Geospatial & Identity Privacy Model

To protect beneficiaries from exploitation, harassment, or unauthorized surveillance, UMEED enforces a 3-tier privacy boundary:

```
+-----------------------------------------------------------------------------------+
| 1. PUBLIC TIER (Public tracking, landing page, external APIs)                     |
|    - Name, phone, exact coordinates: SANITIZED (null)                             |
|    - District & Pincode only: Visible                                             |
|    - Status & Public Reference: Visible                                           |
+-----------------------------------------------------------------------------------+
| 2. COORDINATOR & DISCOVERY SEARCH TIER                                            |
|    - Approximate vicinity / District / Nearest Landmark                           |
|    - Reporter contact: Visible for verification phone calls                       |
+-----------------------------------------------------------------------------------+
| 3. ASSIGNED FIELD RESPONDER TIER                                                  |
|    - Exact entrance GPS coordinates: UNLOCKED ONLY UPON VERIFIED ACCEPTANCE       |
|    - Beneficiary phone: Direct contact for navigation only                        |
+-----------------------------------------------------------------------------------+
```

---

## 3. Lawful Processing & Consent Architecture

1. **Emergency & Life Safety Grounds**: Processing on medical distress, hit-and-run animal trauma, or acute homelessness grounds under Section 7(b) (Emergency Response) of the DPDP Act.
2. **Explicit Consent**: Citizen intake forms capture explicit consent for dispatching vetted local NGOs.
3. **Right to Correction & Erasure**: Beneficiaries or authorized guardians can request record correction or redaction via designated privacy officers.
4. **Data Minimization**: Medical notes and sensitive identity proofs are collected only when strictly necessary for triage and clinical handover.
