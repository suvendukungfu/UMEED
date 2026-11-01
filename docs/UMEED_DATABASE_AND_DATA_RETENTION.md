# UMEED Database Schema & Data Retention Policy

**Document Version**: 2.0.0  
**Status**: APPROVED SPECIFICATION  
**Target Engine**: MongoDB Atlas v6.0+ / Ephemeral Development Fallback  

---

## 1. Domain Entities and Schema Definitions

### 1.1 `users`
- `userId` (string, UUID or `usr_...`): Primary identifier. Unique index.
- `email` (string): Normalized lowercase email. Unique index.
- `name` (string): Full display name.
- `phone` (string, optional): E.164 phone number.
- `accountState` (enum): `ACTIVE`, `INVITED`, `SUSPENDED`, `DISABLED`.
- `platformRole` (enum, optional): `COORDINATOR`, `PLATFORM_ADMIN`, `AUDITOR`, `CITIZEN`.
- `passwordHash` (string, scrypt hex): Salted password hash.
- `salt` (string, hex): 16-byte random salt.
- `emailVerified` (boolean).
- `defaultOrganizationId` (string, optional).
- `createdAt`, `updatedAt`, `lastLoginAt` (ISO 8601 timestamps).

### 1.2 `sessions`
- `sessionId` (string): Primary session identifier.
- `tokenHash` (string, SHA-256): Hash of opaque session token. Unique index.
- `userId` (string): Foreign key referencing `users.userId`. Index.
- `activeOrganizationId` (string, optional): Current tenant context.
- `activeRole` (enum): Current active role.
- `expiresAt` (ISO 8601 timestamp): TTL Index (`expireAfterSeconds: 0`).
- `createdAt`, `lastSeenAt` (ISO 8601 timestamps).

### 1.3 `organization_memberships`
- `membershipId` (string): Primary key.
- `userId` (string): Index.
- `organizationId` (string): Index.
- Compound unique index: `{ userId: 1, organizationId: 1 }`.
- `role` (enum): `NGO_OWNER`, `NGO_ADMIN`, `NGO_OPERATOR`, `RESPONDER`.
- `status` (enum): `ACTIVE`, `INVITED`, `SUSPENDED`.
- `createdAt`, `updatedAt` (ISO 8601 timestamps).

### 1.4 `organizations` (NGOs)
- `organizationId` (string): Unique identifier (e.g. `NGO-DELHI-001`).
- `name` (string): Registered organization name.
- `verificationStatus` (enum): `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `SUSPENDED`.
- `registrationDetails`: Registration number, authority, verification date.
- `serviceCategories`: Array of supported services (`injured_animal`, `homeless_person`, etc.).
- `serviceAreas`: Districts and wards covered.
- `operationalStatus`: `ACTIVE`, `OFFLINE`, `SUSPENDED`.
- `reliabilityMetrics`: Historical verified response times and sample sizes.

### 1.5 `incidents`
- `public_reference` (string): Canonical `UMD-XXXX-XXXX` identifier. Unique index.
- `source_type`: `citizen_report`, `social_media_discovery`, `partner_referral`.
- `source_reference`: Idempotency key. Unique compound index: `{ source_type: 1, source_reference: 1 }`.
- `status`: `REPORTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `RESOLVED`.
- `location`: `{ address, district, ward, geo: { type: "Point", coordinates: [lng, lat] } }`. 2dsphere index.
- `triage_analysis`: Multimodal analysis, urgency, classification (`LIVE_AI_SUCCESS`, `MANUAL_FALLBACK`).
- `tracking_token_hash`: SHA-256 hash of confidential citizen tracking token.

### 1.6 `cases` & `assistance_requirements`
- `public_case_reference` (string): `CASE-XXXX-XXXX`. Unique index.
- `case_status`: `APPROVED`, `DISPATCHING`, `ACTIVE`, `RESOLVED`, `CANCELLED`, `REOPENED`.
- `outreachRound`: Incrementing wave counter.
- `activeAttemptIds`: List of concurrent outreach attempt IDs.
- `assignedProviderId`: Currently assigned NGO.

### 1.7 `case_events` (Append-Only Audit Ledger)
- `eventId`: UUID. Unique index.
- `caseId`: Reference to parent case. Index.
- `eventType`: Canonical event type (`INCIDENT_APPROVED`, `OUTREACH_WAVE_INITIATED`, `ASSIGNMENT_ACCEPTED`, `WORK_STARTED`, `PROGRESS_RECORDED`, `REQUIREMENT_RESOLVED`, `CASE_REOPENED`).
- `previousState`, `newState`: State machine transition.
- `actorType`: `COORDINATOR`, `NGO_OPERATOR`, `RESPONDER`, `SYSTEM`.
- `actorId`: User or system identifier.
- `metadata`: Structured context dictionary.
- `timestamp`: ISO 8601 timestamp. Immutable; updates and deletions strictly forbidden.

---

## 2. Retention and Data Minimization Policies

1. **Beneficiary PII Minimization**:
   - Citizen contact details (phone, email) are kept for operational dispatch only.
   - PII is automatically purged or masked 90 days after case resolution (`RESOLVED`), preserving only statistical and geographic records.
2. **Session Lifetimes**:
   - Inactive sessions expire after 7 days (`SESSION_TTL_MS = 604800000`).
   - Expired sessions are automatically cleaned up via MongoDB TTL indexes on `expiresAt`.
3. **Audit Event Immutability**:
   - `case_events` records are never deleted or modified. They are retained for a minimum of 7 years to satisfy humanitarian compliance and donor accountability standards.
4. **Evidence & Document Retention**:
   - Field photos and rescue evidence are stored in private object storage.
   - Evidence records are retained for 180 days post-resolution, after which media assets are archived to deep cold storage.

