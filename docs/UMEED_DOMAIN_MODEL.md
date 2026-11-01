# UMEED — Domain Model Specification
**Version**: 2.0.0 (Enterprise Normalized)  
**Classification**: System Architecture Standard  

---

## 1. Domain Entities & Bounded Contexts

UMEED models the humanitarian operational lifecycle through distinct bounded contexts:

```
+-----------------------------------------------------------------------------------+
|                              UMEED PLATFORM BOUNDARIES                             |
+-----------------------------------------------------------------------------------+
|  1. IDENTITY & RBAC       | User, Session, OrganizationMembership, Invitation    |
|  2. CITIZEN INTAKE        | DistressReport, TrackingToken, PrivacyConsent         |
|  3. INCIDENT MANAGEMENT   | CanonicalIncident, TriageClassification, ReviewRecord |
|  4. ENTITY & FACILITY     | OrganizationEntity, ServiceFacility, ProviderRel      |
|  5. ASSISTANCE DISPATCH   | AssistanceRequirement, CandidateMatch, OutreachAttempt|
|  6. CASE OPERATIONS       | Case, Assignment, ResponderProfile, ProgressEvent     |
|  7. AUDIT & OUTBOX        | AuditLog, NotificationOutbox, DeliveryReceipt         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Decoupled Organizational & Physical Models

### 2.1 Legal Organization (`OrganizationEntity`)
Represents an accredited legal entity (e.g. Registered Society, Section 8 Non-Profit, Trust).
- `id`: Unique identifier (e.g., `org_friendicoes_seca`)
- `legalName`: Full statutory registered name
- `commonName`: Operating brand name
- `kind`: `LEGAL_ORGANIZATION` or `GOVERNMENT_AGENCY`
- `registrationNumber`: Registrar of Societies / Trust / MCA registration number
- `isUmeedPartner`: Boolean. Must be explicitly onboarded through verified administrator sign-off.
- `verificationState`: Operational verification lifecycle state (`DISCOVERED`, `SOURCE_VERIFIED`, `PARTNER_ONBOARDED`, `CAPACITY_CONFIRMED`, `SUSPENDED`).

### 2.2 Government Agency (`OrganizationEntity` with `kind: "GOVERNMENT_AGENCY"`)
Represents public statutory institutions (e.g. DUSIB, AIIMS, Delhi Police, Forest Department).
- Never modeled as an NGO or charity.
- May act as public referral destination or regulatory authority.
- Cannot receive automated NGO outreach assignments without inter-agency MOU.

### 2.3 Service Facility (`ServiceFacilityEntity`)
Represents a physical operating facility or clinical destination.
- `id`: Physical facility ID (e.g., `fac_defence_colony_animal_hospital`)
- `facilityName`: Public display name
- `facilityType`: `VETERINARY_HOSPITAL`, `ANIMAL_SHELTER`, `NIGHT_SHELTER`, `TRAUMA_CENTRE`, `FEEDING_CENTRE`, `REFERRAL_DESTINATION`
- `location`: Exact geospatial location with `Point [lng, lat]`, coordinate precision, entrance verification status, and district
- `capacity`: Total units and confirmed available slots
- `operatingHours`: Schedule (e.g., `24x7 Emergency Ambulance Depot`)
- `isReferralDestinationOnly`: Boolean flag distinguishing public destinations from dispatched partner units.

### 2.4 Provider-Facility Relationship (`ProviderFacilityRelationship`)
Expresses the verified institutional link between an organization and a facility:
- `OPERATED_BY`: Organization directly operates the facility
- `MANAGED_BY`: Contracted facility management (e.g. DUSIB Rain Basera managed by AAA)
- `FUNDED_BY`: Statutory or philanthropic funding
- `GOVERNMENT_CONTROLLED`: Public hospital or government shelter
- `REFERRAL_DESTINATION`: Designated medical or social handoff location

---

## 3. Incident to Assistance Lifecycle

```
[ Citizen Report ] -> POST /api/incidents/ingest
       |
       v
[ Canonical Incident (REPORTED) ]
       |
       v
[ Advisory Gemini Triage (TRIAGED) ] -> AI advisory only; cannot approve or dispatch
       |
       v
[ Coordinator Review Gate ] -> Human coordinator APPROVE / REJECT
       |
       +---> APPROVED -> POST /api/cases -> [ Operational Case Created ]
                                                      |
                                                      v
                                        [ Assistance Requirement Defined ]
                                                      |
                                                      v
                                        [ Explainable Partner Matching ]
                                                      |
                                                      v
                                        [ Time-Bound Outreach Waves ]
                                                      |
                                                      v
                                        [ Atomic Exclusive Acceptance ]
                                                      |
                                                      v
                                        [ Field Responder Dispatched ]
                                                      |
                                                      v
                                        [ Verified Case Resolution ]
```

---

## 4. Invariant Rules

1. **Zero-False-Partnership**: A public facility or discovered NGO is never an accredited UMEED partner until formal onboarding is completed.
2. **Human Authorization Gate**: Unapproved incidents cannot be converted to operational cases or trigger partner outreach.
3. **Atomic Exclusivity**: A requirement can only be assigned to exactly one primary provider; competing offers are automatically superseded.
4. **Geospatial Privacy**: Public viewers see district-level coordinates only; exact latitude/longitude are revealed only to the assigned responder upon assignment acceptance.
