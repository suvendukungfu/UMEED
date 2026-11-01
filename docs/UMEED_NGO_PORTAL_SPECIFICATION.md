# UMEED First-Class NGO Portal Specification

**Document Version**: 2.0.0  
**Status**: APPROVED SPECIFICATION  
**Primary Users**: `NGO_OWNER`, `NGO_ADMIN`, `NGO_OPERATOR`  

---

## 1. Architectural Scope

The NGO Portal (`/app/ngo`) is an enterprise-grade operational mission control center built for verified humanitarian non-governmental organizations. It transforms NGOs from passive listing entries into active, authenticated participants in closed-loop distress assistance.

---

## 2. Core Functional Modules

### 2.1 NGO Onboarding & Verification Lifecycle (`/app/ngo/onboarding`)
- **12-Step Verification Lifecycle**:
  1. Organization creation & identity declaration.
  2. Authorized representative email verification.
  3. Formal registration details (NGO Darpan / Society / Trust / Section 8 number).
  4. 24x7 emergency dispatch contact verification.
  5. Service capabilities declaration (e.g. `injured_animal`, `homeless_person`, `medical_transport`).
  6. Service area delineation (Districts, Wards, Service Radius km).
  7. Physical depot / clinic / shelter location coordinates.
  8. Capacity declaration (Emergency vehicles, shelter beds, veterinary surgeons).
  9. Secure registration document upload to private object storage.
  10. Application submission into platform review queue.
  11. Platform Administrator review and background check.
  12. Formal platform verification (`VERIFIED`) enabling automatic matching.
- **States**: `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `NEEDS_INFORMATION` → `VERIFIED` → `REJECTED` / `SUSPENDED`.
- **Integrity Rule**: Self-verification is strictly prohibited; only a verified `PLATFORM_ADMIN` can transition an organization to `VERIFIED`.

### 2.2 Operational Dashboard (`/app/ngo`)
- Real-time operational metrics queried from authorized databases:
  - Verification badge (`OPERATIONALLY_VERIFIED`).
  - Real-time active capacity (Occupied vs. Available).
  - Incoming assistance wave offers requiring response.
  - Active field assignments in progress.
  - Historical resolution success rate & average response minutes.
  - Team roster overview and recent activity feed.

### 2.3 Incoming Assistance Request Queue (`/app/ngo/requests`)
- **Offer Card Details**:
  - Public Case & Requirement Reference.
  - Category & Urgency level (`critical`, `high`, `medium`).
  - Generalized location (District / Ward; exact GPS withheld until acceptance to protect citizen privacy).
  - Required capabilities and resource expectations.
  - Acknowledgement SLA countdown timer (e.g. 15 minutes for critical urgency).
- **Actions**:
  - **Acknowledge**: Signal intent to evaluate.
  - **Accept**: Atomically claim the exclusive assignment. First verified provider to accept claims the assignment; competing outreach attempts are automatically superseded.
  - **Decline**: Structured refusal with reason (e.g. `AT_CAPACITY`, `OUTSIDE_SERVICE_RADIUS`, `SPECIALIZED_EQUIPMENT_UNAVAILABLE`). Triggers automatic escalation to next wave candidates.

### 2.4 Active Case Management (`/app/ngo/cases`)
- Case timeline showing all historical actions.
- Field responder dispatch and assignment.
- Real-time status progression (`ACCEPTED` → `WORK_STARTED` → `IN_PROGRESS` → `RESOLVED`).
- Progress note logging with timestamps and actor signatures.
- Rescue evidence attachment upload.
- Completion report submission with outcome notes.

### 2.5 Capacity & Availability Management (`/app/ngo/capacity`)
- Live capacity controls:
  - Toggle operational status: `ACTIVE` / `TEMPORARILY_OFFLINE`.
  - Availability status: `CONFIRMED_AVAILABLE`, `LIMITED_CAPACITY`, `EMERGENCY_ONLY`, `AT_CAPACITY`.
  - Max capacity vs. current occupied capacity.
  - Operating hours and emergency ambulance availability.
  - Stale capacity flags: Records older than 48 hours without coordinator confirmation are flagged as `UNKNOWN_AVAILABILITY`.

### 2.6 Team & Staff Management (`/app/ngo/team`)
- Member directory with role badges (`NGO_OWNER`, `NGO_ADMIN`, `NGO_OPERATOR`, `RESPONDER`).
- Invitation modal sending email invitations with 7-day expiration.
- Delegated permission control: Owners can manage Admins and Operators; Admins can invite Operators and Responders.
- Revocation and suspension of staff members.

