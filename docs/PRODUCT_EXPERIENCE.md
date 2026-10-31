# UMEED Product Experience Specification

**System**: UMEED (Closed-Loop Social Distress Assistance Platform)  
**Hackathon**: HackCBS 9.0  
**Authors**: Senior Open Source Maintainer, Staff Product Engineer, Enterprise UX Architect  
**Status**: Specification & Architectural Baseline  

---

## 1. Feature Maturity & Implementation Audit

To maintain complete engineering integrity, every platform capability is audited against actual codebase reality in `apps/web`, `packages/contracts`, and `services/discovery`. Capabilities are explicitly categorized into three states:
- **`IMPLEMENTED`**: Fully built, strictly typed, covered by unit/integration tests, and runnable.
- **`PARTIALLY_IMPLEMENTED`**: Baseline data structures, configs, or contracts exist, but UI or execution workflows are pending.
- **`PLANNED`**: Architecturally specified and scheduled for subsequent phases; currently represented by UI placeholders or documentation.

| Subsystem / Capability | Status | Codebase Reality & Evidence |
|---|---|---|
| **Canonical Ingestion Contract (`v1.0.0`)** | `IMPLEMENTED` | `packages/contracts/src/incident.ts` with Zod 4.6.6+ schemas and 6 passing unit tests in `incident.test.ts`. |
| **Runtime Environment Config & Validation** | `IMPLEMENTED` | `apps/web/src/lib/config/env.ts` with strict Zod schema, safe parsing, and 4 passing unit tests. |
| **MongoDB Atlas Connection Abstraction** | `IMPLEMENTED` | `apps/web/src/lib/db/mongodb.ts` with client promise caching, connection pooling, and readiness probing. |
| **Structured JSON Logger & Error Formatting** | `IMPLEMENTED` | `apps/web/src/lib/logging` and `apps/web/src/lib/errors` with PII sanitization and 5 passing unit tests. |
| **Health Check API (`GET /api/health`)** | `IMPLEMENTED` | `apps/web/src/app/api/health/route.ts` with DB readiness check and uptime tracking. |
| **Security & Sanitization Library** | `IMPLEMENTED` | `apps/web/src/lib/security` with XSS string stripping and PII masking (phones, emails). |
| **Root Shell & Responsive Navigation** | `IMPLEMENTED` | `apps/web/src/components/layout/Header.tsx`, `Sidebar.tsx`, and `layout.tsx` with live health badge. |
| **Citizen Report Form (`/report`)** | `PARTIALLY_IMPLEMENTED` | Static UI placeholder exists at `apps/web/src/app/report/page.tsx`; stateful form, GPS, and upload logic are `PLANNED` (Phase 3). |
| **Ingestion API Handler (`POST /api/incidents/ingest`)** | `PARTIALLY_IMPLEMENTED` | Active workstream in Phase 2 backend engineering; schema ready in `@umeed/contracts`. |
| **Gemini Multimodal Triage Pipeline** | `PLANNED` | Architectural spec defined; scheduled for Phase 3. |
| **Incident Review Queue (`/incidents`)** | `PARTIALLY_IMPLEMENTED` | Page placeholder exists at `apps/web/src/app/incidents/page.tsx`; interactive triage queue is `PLANNED` (Phase 3). |
| **NGO Registry & Directory (`/ngos`)** | `PARTIALLY_IMPLEMENTED` | Page placeholder exists at `apps/web/src/app/ngos/page.tsx`; schema, verification tiers, and matching are `PLANNED` (Phase 4). |
| **Capability-Aware Matching Engine** | `PLANNED` | Mathematical formula defined in `ARCHITECTURE.md`; implementation scheduled for Phase 4. |
| **Closed-Loop Case State Machine (`/cases`)** | `PARTIALLY_IMPLEMENTED` | Page placeholder exists at `apps/web/src/app/cases/page.tsx`; state transitions and responder portal are `PLANNED` (Phase 5). |
| **Meko Coordination Memory (`/agent`)** | `PARTIALLY_IMPLEMENTED` | Page placeholder exists at `apps/web/src/app/agent/page.tsx`; MCP adapter scheduled for Phase 6. |
| **IOMETE Historical Analytics (`/analytics`)** | `PARTIALLY_IMPLEMENTED` | Page placeholder exists at `apps/web/src/app/analytics/page.tsx`; durable outbox worker scheduled for Phase 7. |
| **Social Distress Crawler (`services/discovery`)** | `PLANNED` | Service directory established; FastAPI and FFmpeg ingestion pipeline scheduled for Phase 8. |

---

## 2. Persona Specifications & Experience Architecture

UMEED coordinates four primary user roles, each operating under distinct operational boundaries, permissions, and security constraints.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UMEED USER ARCHITECTURE                         │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│   1. CITIZEN    │  2. COORDINATOR  │     3. NGO      │    4. ADMIN     │
│  (Public / Web) │  (Vetted Staff)  │   (Responder)   │ (SysOps / Lead) │
├─────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ • Quick intake  │ • Triage review  │ • Intake inbox  │ • NGO vetting   │
│ • Zero login req│ • Duplicate dedupe│ • Accept/Reject│ • Role mgmt     │
│ • Ref-code track│ • NGO dispatch   │ • On-scene proof│ • Audit logs    │
│ • Privacy-masked│ • Outcome verify │ • Multi-cycle req│ • Outbox health│
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

---

### Persona A: Citizen (The Reporting Bystander)

#### Primary Objectives
1. Submit an urgent distress observation in under 60 seconds with minimal cognitive friction.
2. Provide high-fidelity evidence (photo, video, audio, GPS) without requiring account creation.
3. Track assistance progress transparently using a privacy-preserving reference code.
4. Submit supplemental follow-up evidence if the situation changes.

#### User Journey
1. **Landing & Intake Initiation**: Citizen navigates to `/report` on mobile or desktop browser. No sign-in or app installation is required.
2. **Language Preference**: Instant switch between English and Hindi (हिन्दी) at the top of the form, persisting across the session.
3. **Evidence Capture**: Citizen taps "Upload Photo / Take Picture" or uses the Voice-to-Report audio recording button.
4. **Location Resolution**: One-tap geolocation capture (`navigator.geolocation`) resolves latitude/longitude, automatically reverse-geocoded to a human-readable street/district address. Manual adjustment is supported for remote spotters.
5. **Subject & Needs Categorization**: Citizen selects simple visual chips: *Injured Animal*, *Vulnerable Elderly Person*, *Unhoused Person Needing Shelter/Food*, or *Medical Emergency*.
6. **Submission & Token Generation**: On submission, client validates input via `@umeed/contracts` constraints. The backend responds with an alphanumeric Tracking Code (e.g., `UMD-7729-DEL`) and secure QR code.
7. **Tracking & Follow-up**: Citizen bookmarks `/track/[code]`. They view status updates (`Reported` → `Verified` → `Responder En Route` → `Assistance Provided`) without ever seeing PII of responders or other citizens. If the subject moves or condition deteriorates, they can append additional timestamped evidence directly to the active tracking view.

#### Permissions & Access Control
- Public, unauthenticated role (`ROLE_ANONYMOUS_REPORTER` or `ROLE_CITIZEN`).
- Restricted to `POST /api/incidents/ingest` (rate-limited via IP sliding window).
- Read access strictly bounded to `GET /api/incidents/track/:referenceCode` (returns redacted summary, never coordinates of shelters or internal coordinator notes).
- Append-only access to `POST /api/incidents/:referenceCode/evidence`.

#### Entry Points & Routing
- Web Root CTA: Primary hero button "Report Social Distress" links to `/report`.
- Direct URL: `https://umeed.app/report` (PWA installable, offline caching enabled).
- Tracking URL: `https://umeed.app/track/[referenceCode]`.

#### Critical Information Display
- Active tracking code with 1-click clipboard copy.
- Real-time milestone tracker (4 high-level stages: `Received`, `Coordinator Review`, `NGO Dispatched`, `Resolved`).
- Emergency helpline disclosure banner: *"If this is an immediate life-threatening emergency, please dial 112 (National Emergency) or 102 (Ambulance) immediately."*

#### Error Cases & Resilience
- **Network drop during photo upload**: IndexedDB stores the draft report and media blob offline; an ambient status banner indicates "Offline — will sync once connection restores."
- **Geolocation access denied**: Form degrades gracefully to an interactive locality/landmark search with district dropdown.
- **Upload size exceeded**: Client-side canvas compression downscales images exceeding 5MB to a maximum 1920x1080 resolution before upload.

#### Loading & Empty States
- **Submitting state**: Button displays an accessible spinner with text: *"Submitting report and analyzing evidence..."* (ARIA live polite).
- **Tracking not found**: Clean error card: *"Tracking code not found. Please verify the code on your receipt or contact coordinator support."*

#### Privacy Boundaries
- Zero public exposure: No citizen phone number, IP address, or raw device metadata is stored or visible on the tracking screen.
- Citizen coordinates are rounded to district/sub-locality level on all public interfaces.

---

### Persona B: UMEED Coordinator (Triage & Dispatch Orchestrator)

#### Primary Objectives
1. Verify and curate incoming reports from citizens and automated crawlers in real time.
2. Review Gemini multimodal recommendations alongside raw submitted evidence.
3. Detect, merge, or link duplicate reports for the same incident.
4. Execute explainable NGO dispatch based on capability, distance, and current capacity.
5. Review evidence of intervention and confirm case closure or trigger secondary recursive assistance cycles.

#### User Journey
1. **Operations Dashboard Access**: Authenticated coordinator logs in and accesses `/incidents`.
2. **Review Queue Prioritization**: Queue presents unreviewed incidents sorted by urgency score (`critical` → `high` → `medium`) and freshness timestamp.
3. **Inspection & Evidence Exploration**: Coordinator selects an incident to view side-by-side:
   - Left Panel: Citizen raw text, captured media with high-resolution lightbox, GPS coordinates with street map.
   - Right Panel: Gemini Multimodal Triage analysis (extracted subject type, observed trauma/needs, suggested severity level, reasoning bullet points, missing info flags).
4. **Duplicate Detection**: System flags potential duplicate reports within a 500-meter radius and 4-hour window. Coordinator can "Merge into Existing Case" or "Mark as Independent Incident."
5. **Action Gate**: Coordinator selects `Approve for Dispatch`, `Request Supplemental Info`, `Mark Duplicate`, or `Reject (Spam/Invalid)`.
6. **Capability-Aware Matching**: Upon approval, the Matching Engine ranks verified NGOs in Delhi based on matching capabilities (e.g., animal medical rescue vs. human homeless shelter), operational district, and real-time caseload. The score breakdown is shown transparently.
7. **Dispatch Coordination**: Coordinator clicks "Assign Case" to notify the top-ranked NGO via portal alert and SMS/Webhook.
8. **Outcome Verification**: When the NGO submits on-scene proof of intervention, the coordinator verifies the photographic outcome. If the report indicates unresolved needs (e.g., dog received first aid but needs surgery at hospital), coordinator clicks "Initiate Secondary Assistance Cycle" to dispatch a medical transport NGO.

#### Permissions & Access Control
- `ROLE_COORDINATOR`.
- Read and update access to all incidents, triage outputs, case states, and NGO capacity metrics.
- Write access to `POST /api/cases/:id/transition`, `POST /api/cases/:id/merge`, `POST /api/cases/:id/dispatch`.
- Immutable audit logging: Every approval, rejection, and reassignment logs the coordinator's user ID and justification note.

#### Entry Points & Routing
- Dashboard: `/incidents` (intake queue).
- Detail Review: `/incidents/[id]`.
- Active Cases Monitor: `/cases`.
- Map Overview: `/incidents/map`.

#### Critical Information Display
- Urgency badge with visual indicator (`Critical [Red]`, `High [Amber]`, `Medium [Blue]`).
- Time elapsed since report creation.
- AI confidence percentage accompanied by the mandatory label: *"AI Recommendation — Human Coordinator Verification Required"*.
- Duplicate proximity alert banner.

#### Error Cases & Resilience
- **Gemini Triage Offline/Failed**: Fallback badge displays: *"AI Triage Unavailable — Manual Verification Required"*. Queue remains fully functional; coordinators execute manual triage directly.
- **NGO Rejection or Dispatch Timeout**: If an NGO rejects or does not respond within 15 minutes, the case automatically reverts to `MATCHING` status, alerting the coordinator with recommended alternative responders.

#### Loading & Empty States
- **Queue Loading**: Skeleton cards with pulsing placeholders matching card geometry.
- **Empty Queue**: Friendly illustration with text: *"Review queue is clear. All incoming distress reports have been triaged."*

#### Privacy Boundaries
- Coordinators can view reported contact details (if citizen opted in) for emergency clarification, but cannot export or bulk-download contact data.

---

### Persona C: NGO Responder (Field Assistance Team)

#### Primary Objectives
1. Receive immediate, actionable dispatch notifications with clear location landmarks and subject context.
2. Accept or decline assignments rapidly with clear accountability.
3. Update real-time operational status (`En Route` → `Arrived` → `Intervention Complete`).
4. Upload on-scene photographic proof of intervention and document remaining assistance needs.

#### User Journey
1. **Dispatch Notification**: NGO dispatcher receives webhook/portal alert: *"New High-Priority Case: Injured Stray Dog, Rohini Sector 14."*
2. **Inbox Review**: NGO opens Responder Inbox at `/responder`. Case summary details subject, observed distress, distance (2.4 km), and primary required capability.
3. **Acceptance / Rejection**:
   - If capacity allows: Dispatcher clicks "Accept Assignment". Case state advances to `ACCEPTED`.
   - If unable: Dispatcher clicks "Decline", selecting mandatory structured reason (*At Maximum Capacity*, *Vehicle Out of Service*, *Outside Immediate Operational Range*). Case automatically rebounds to matching queue.
4. **Field Transit**: Field unit taps "En Route" then "Mark Arrived on Scene" upon reaching GPS coordinates.
5. **Outcome Documentation**: Following intervention, responder opens the case on mobile web, selects:
   - Primary Intervention Performed (e.g., *Wound Dressing & Pain Relief*, *Temporary Shelter Placement*, *Warm Meal & Clothes Distributed*).
   - Evidence Upload: Compulsory photo of subject receiving care or safe in shelter.
   - Closed-Loop Status: Responder toggles:
     - `Case Fully Resolved`: Distress alleviated, no further aid required.
     - `Follow-Up Required`: Subject requires secondary care (e.g., inpatient orthopaedic surgery, long-term foster home). Specific unmet needs are checked.
6. **Case Closure**: Submitting advances case to `INTERVENTION_PROVIDED` or `FOLLOW_UP_REQUIRED`.

#### Permissions & Access Control
- `ROLE_NGO_ADMIN` and `ROLE_NGO_RESPONDER`.
- Scoped strictly to cases dispatched to their organization (`GET /api/responder/cases`, `POST /api/responder/cases/:id/status`).
- Write access to organization capability profiles and active availability toggle (`Available`, `Busy`, `Off Duty`).

#### Entry Points & Routing
- Responder Portal: `/responder`.
- Direct Assignment View: `/responder/cases/[caseId]`.
- Organization Profile: `/ngos/manage`.

#### Critical Information Display
- Exact landmark guidance and navigation link (Google Maps / OpenStreetMap deep-link).
- Elapsed dispatch countdown timer.
- Subject condition notes and safety advisories (e.g., *"Aggressive due to pain — carry muzzle/blanket"*).

#### Error Cases & Resilience
- **Poor mobile connectivity in field**: Responder action buttons queue state updates locally in Service Worker cache; photos are compressed client-side and retried with exponential backoff until upload confirms.
- **Accidental double-click**: State machine transitions are strictly idempotent with unique transition tokens.

#### Loading & Empty States
- **Inbox Empty**: *"No pending assignments. Your organization is currently marked as Available for Rohini and Pitampura districts."*

#### Privacy Boundaries
- Responders do not receive citizen reporter personal details unless the citizen explicitly consented to direct contact for location guidance.

---

### Persona D: Platform Administrator (System Operations & Oversight)

#### Primary Objectives
1. Maintain operational integrity of the NGO intelligence registry through verification tiers.
2. Monitor system health, API limits (Gemini, MongoDB), and outbox queue latency.
3. Inspect complete, immutable case audit logs for accountability and compliance.
4. Review aggregated response metrics without accessing raw private beneficiary data.

#### User Journey
1. **Admin Console**: Administrator navigates to `/admin`.
2. **NGO Verification Governance**: Admin reviews newly registered NGOs, inspects uploaded NGO DARPAN IDs or registration certificates, and sets verification level:
   - Tier 1: `publicly_listed` (basic contact info, not eligible for automated dispatch).
   - Tier 2: `registration_checked` (valid government registration, eligible for low-severity cases).
   - Tier 3: `operationally_verified` (field-vetted, vetted capacity, eligible for critical medical dispatch).
3. **Integration Telemetry**: Admin inspects health status for Core Engine, MongoDB Atlas, Gemini Quota, Meko Memory, and IOMETE Outbox sync backlog.
4. **Audit Trail Inspection**: Admin queries immutable case event logs for any dispute or safety incident (e.g., case reassignment history, rejected dispatches).

#### Permissions & Access Control
- `ROLE_PLATFORM_ADMIN`.
- Full administrative access to user roles, NGO verification status, and system configurations.
- Read-only access to immutable audit log collections (`case_events`, `review_actions`).

#### Entry Points & Routing
- Admin Dashboard: `/admin`.
- NGO Verification Queue: `/admin/ngos/verification`.
- System Health: `/admin/system` and `/api/health`.
- Audit Log Explorer: `/admin/audit`.

#### Critical Information Display
- System outbox backlog depth (pending events queued for IOMETE analytics).
- Verification status counters (Pending, Verified, Suspended).
- Average response time and resolution rate metrics.

---

## 3. Experience Details & Technical Workflows

### 3.1 Citizen Bilingual Experience (English & Hindi)
To serve diverse urban populations across Delhi NCR, all citizen-facing interfaces are architected for zero-delay internationalization:
- **Language Switcher**: Persistent header toggle with single-tap switching: `EN | हिन्दी`.
- **Phonetic & Native Labels**:
  - *Distress Report*: संकट रिपोर्ट (Sankat Report)
  - *Injured Animal*: घायल पशु (Ghayal Pashu)
  - *Elderly Person Needing Aid*: बेसहारा वृद्ध जन (Besahara Vriddh Jan)
  - *Submit Report*: सहायता रिपोर्ट दर्ज करें (Sahayata Report Darj Karein)
- **Voice-to-Report Concept**: Uses browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) for speech-to-text with speech language set dynamically (`hi-IN` or `en-IN`). Transcribed text automatically populates the description field, allowing illiterate or distressed bystanders to speak naturally.

### 3.2 Secure Tracking Code System (`UMD-XXXX-YYYY`)
- Tracking codes follow a standardized format: `UMD-[4 Alphanumeric]-[4 Alphanumeric]` (e.g., `UMD-7B29-4K12`).
- The code maps to a secure MongoDB index queryable via `GET /api/incidents/track/:code`.
- **Public Visibility Filter**:
  ```json
  {
    "reference_code": "UMD-7B29-4K12",
    "status": "RESPONDER_ARRIVED",
    "reported_at": "2026-10-31T14:15:00Z",
    "incident_category": "injured_animal",
    "district": "North West Delhi",
    "milestones": [
      { "stage": "REPORTED", "completed_at": "2026-10-31T14:15:00Z" },
      { "stage": "VERIFIED", "completed_at": "2026-10-31T14:18:22Z" },
      { "stage": "DISPATCHED", "completed_at": "2026-10-31T14:21:05Z" },
      { "stage": "ARRIVED", "completed_at": "2026-10-31T14:38:10Z" }
    ],
    "responder_org_name": "Wildlife & Stray Rescue Foundation",
    "follow_up_evidence_allowed": true
  }
  ```
  *Notice: Beneficiary coordinates, citizen identity, and responder phone numbers are strictly scrubbed.*

### 3.3 Coordinator Duplicate Detection & Merging
When a citizen or crawler report arrives, the system queries the database for nearby active incidents:
$$\text{IsDuplicateCandidate} \iff \text{Distance}(L_1, L_2) \le 500\text{m} \land |\Delta t| \le 4\text{ hours} \land \text{SubjectType}_1 = \text{SubjectType}_2$$
If true, the review UI renders a **Duplicate Warning Banner**:
- Presents side-by-side thumbnails of both reports.
- Provides a one-click "Merge Evidence into Existing Case" button.
- Merged reports retain their unique tracking codes so original submitters still receive live progress updates, but dispatch operations consolidate onto a single active case.

### 3.4 Explainable NGO Matching Display
Coordinators do not receive an opaque "black-box" dispatch recommendation. The UI renders the full mathematical breakdown:
$$\text{Score} = w_s S_{\text{capability}} + w_g S_{\text{geography}} + w_a S_{\text{availability}} + w_c S_{\text{capacity}} + w_h S_{\text{history}}$$
- **Capability Match Badge**: Green checkmark (1.0) or red disqualifier (0.0).
- **Proximity Metric**: Distance in km (e.g., 2.3 km, score 0.88).
- **Current Caseload**: Active cases vs. maximum capacity (e.g., 2 / 5 active, score 0.60).
- **Response History**: Verified arrival rate and average arrival duration (score 0.92).

---

## 4. Privacy & Public Redaction Specification

Public safety and beneficiary dignity are inviolable platform constraints:
1. **No Exact Public Coordinates**: Exact GPS coordinates (`28.7041, 77.1025`) and detailed door/building landmarks are visible only to verified coordinators and assigned responders. Public tracking screens and public analytics displays aggregate coordinates to district level (e.g., "Rohini, North West Delhi").
2. **Beneficiary Face & Vulnerability Masking**: Photographic evidence displayed in coordinator and responder views is scrubbed of direct biometric identifiers before any export or long-term analytical storage.
3. **No Public Live Responders Tracking**: Public tracking views show state milestones (`Dispatched`, `Arrived`), never continuous real-time GPS telemetry of responder vehicles.
