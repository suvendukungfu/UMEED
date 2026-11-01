# UMEED Target Architecture Specification

**Document Version**: 2.0.0  
**Status**: APPROVED ARCHITECTURE  
**Target Date**: November 2026  
**Audience**: Principal Architects, Security Engineers, Lead Developers & Humanitarian Coordinators  

---

## 1. Vision and Architectural Principles

UMEED is a unified, multi-tenant humanitarian operations platform engineered to transform citizen distress signals into verified, coordinated, and auditable field assistance.

### Core Architectural Principles
1. **Unified Application Architecture**: Single cohesive Next.js 15+ monorepo deployment with role-aware routing, shared design tokens, and modular bounded domains.
2. **Zero-Trust Multi-Tenant Isolation**: Server-enforced tenancy. No NGO or actor can access, mutate, or enumerate resources outside their verified organizational boundaries.
3. **Dual Persistence Layer**: Production-grade MongoDB repositories (with unique indexes, TTL expirations, and compound keys) paired with continuous in-memory persistence for deterministic local development and continuous integration.
4. **Closed-Loop Assistance State Machine**: Citizen distress intake → AI-assisted multimodal triage → Human coordinator review & approval → Operational case creation → Geospatial matching → Outreach wave dispatch → Exclusive atomic acceptance → Field responder dispatch → Resolution verification → Immutable audit trail.
5. **Explainable AI Integration**: Gemini 2.5 Flash for multimodal triage under strict untrusted input boundaries (`<<<UNTRUSTED_CITIZEN_SUBMISSION>>>`), bounded retries, and explicit classification (`LIVE_AI_SUCCESS`, `MANUAL_REVIEW_REQUIRED`). Consequential decisions strictly require human sign-off.
6. **Auditable Operational Ledgers**: Append-only event tracking for every state transition, access evaluation, outreach dispatch, and coordination intervention.

---

## 2. Monorepo and Subsystem Layout

```text
hackcbs/
├── packages/
│   └── contracts/                 # Canonical schemas, enums, and Zod v4 validation contracts
│       └── src/
│           ├── auth.ts            # Users, sessions, roles, permissions, memberships
│           ├── incident.ts        # Canonical incident reports, evidence, triage
│           ├── case.ts            # Canonical cases, assignments, resolution schemas
│           ├── ngo.ts             # NGO profile, capabilities, verification, capacity
│           ├── engine.ts          # Requirements, outreach attempts, matching weights
│           └── discovery.ts       # Crawl runs, sources, signal candidates
└── apps/
    └── web/                       # Next.js 15 App Router web application
        ├── src/
        │   ├── app/               # App Router pages and API routes
        │   │   ├── (public)/      # Landing (/), distress report (/report), tracking (/track)
        │   │   ├── (auth)/        # Sign-in (/auth/sign-in), invite (/auth/invite)
        │   │   ├── app/           # Authenticated application shell & workspaces
        │   │   │   ├── citizen/   # Citizen submission history & follow-ups
        │   │   │   ├── coordinator/ # Triage queue, case dispatch, escalations
        │   │   │   ├── ngo/       # NGO Portal: Onboarding, requests, cases, capacity, team
        │   │   │   ├── responder/ # Mobile-first field responder operations
        │   │   │   ├── admin/     # Platform administration, NGO verification, user management
        │   │   │   ├── audit/     # Privacy-redacted compliance & audit trail explorer
        │   │   │   └── analytics/ # Real-time assistance metrics & resolution rates
        │   │   └── api/           # Secure REST API route handlers
        │   │       ├── auth/      # Sign-in, sign-up, session, switch-org
        │   │       ├── incidents/ # Ingest, triage, review, public tracking
        │   │       ├── cases/     # Case creation, dispatch, resolution, reopening
        │   │       ├── ngos/      # NGO profiles, verification, capacity, team
        │   │       └── assistance/# Closed-loop matching, outreach waves, watchdog
        │   ├── features/          # Domain business logic & services
        │   │   ├── auth/          # Authentication & RBAC services
        │   │   ├── incidents/     # Incident ingestion & triage
        │   │   ├── cases/         # Case lifecycle & responder services
        │   │   ├── ngos/          # NGO registry & onboarding services
        │   │   └── assistance-engine/ # Matching, outreach, watchdog, outbox
        │   ├── components/        # Reusable UI components & design system
        │   │   ├── layout/        # AppShell, Navbar, Sidebar, OrganizationSwitcher
        │   │   └── ui/            # Buttons, Cards, Modals, Tables, Badges, Skeletons
        │   └── lib/               # Shared libraries (db, security, logging, AI)
```

---

## 3. Real Identity and Session Management

### Session Architecture
- **Transport**: HttpOnly, SameSite=Lax, Secure (in production) cookies holding a signed, opaque session token (`umeed_session`).
- **Storage**: Opaque session IDs hashed via SHA-256 before storage in MongoDB / ephemeral memory.
- **Rotation**: Automatic session renewal and rotation on authentication, privilege elevation, or organization switching.
- **Account States**:
  - `ACTIVE`: Fully authenticated and permitted to access authorized workspaces.
  - `INVITED`: Pre-provisioned user awaiting verification and credential setup.
  - `SUSPENDED`: Access blocked platform-wide; all existing active sessions immediately revoked.
  - `DISABLED`: Permanently disabled account.

---

## 4. Multi-Tenant Role-Based Access Control (RBAC)

Every server request evaluates a centralized authorization policy:
```typescript
authorize(user: AuthUser, permission: Permission, resource?: any, context?: any): AuthorizationResult
```

### Supported Roles
1. **CITIZEN**: Can submit distress reports, view own submissions via session or tracking token.
2. **NGO_OWNER**: Full ownership of their NGO tenant: manage profile, invite team, accept/decline offers, view NGO cases.
3. **NGO_ADMIN**: Delegated administrator for an NGO: manage capacity, operational assignments, and staff.
4. **NGO_OPERATOR**: Field dispatcher or desk operator: acknowledge incoming offers, record assignment progress.
5. **COORDINATOR**: Humanitarian case worker: verify reports, approve incident conversion, dispatch cases, verify resolutions.
6. **RESPONDER**: Field operative: acknowledge assigned cases, update status (`EN_ROUTE`, `ON_SITE`), upload evidence.
7. **PLATFORM_ADMIN**: Platform oversight: verify NGO applications, inspect health, manage system configuration.
8. **AUDITOR**: Read-only oversight: inspect immutable case timelines and compliance audit trails with PII redaction.

---

## 5. First-Class NGO Portal Architecture

The NGO Portal is structured into 5 core modules:
1. **Onboarding & Verification**: Multi-step application submission (`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `VERIFIED`).
2. **Incoming Assistance Queue**: Real-time incoming wave offers with strict SLA acknowledgement countdowns and atomic acceptance.
3. **Operational Case Management**: Dedicated case workspaces for accepted assignments with progress feeds and resolution verification.
4. **Capacity & Availability Management**: Live district coverage, supported service capabilities, verified vehicle/bed capacity, and availability status.
5. **Team Management**: Secure team invitations, role assignment (`NGO_OWNER`, `NGO_ADMIN`, `NGO_OPERATOR`), and member offboarding.

---

## 6. Real Persistence and State Continuity

- **MongoDB Collections**:
  - `users`: User profiles, email hashes, password hashes (scrypt), MFA settings.
  - `sessions`: Active session tokens, expiry, user ID, active organization ID.
  - `organizations`: NGO organizational profiles, verification status, contact details.
  - `organization_memberships`: User-to-organization bindings with scoped organizational roles.
  - `incidents`: Canonical citizen distress reports, geolocations, tracking hashes, triage analysis.
  - `cases`: Operational assistance cases, assigned providers, SLA status, resolution decisions.
  - `assistance_requirements`: Sub-service requirements with active outreach rounds and SLA timers.
  - `outreach_attempts`: Time-limited outreach invitations with provider acknowledgement tracking.
  - `case_events`: Immutable audit ledger recording every human decision and system state change.
  - `notification_outbox`: Scheduled and dispatched communications with delivery confirmation tracking.

---

## 7. Security, Privacy & Data Governance

1. **Beneficiary PII Protection**: Strict minimization. Full names, exact street addresses, and phone numbers are redacted in public and auditor views.
2. **Confidential Tracking Tokens**: Plaintext tokens are returned strictly once upon report intake. Database stores salted SHA-256 hashes (`tracking_token_hash`).
3. **SSRF Guarding**: Social media discovery and external resource crawling strictly enforce RFC 1918 private IP blocking, protocol whitelisting (HTTPS only), and DNS rebinding protections.
4. **Prompt Injection Hardening**: All citizen-supplied text is sanitized and encapsulated within protective delimiter blocks before submission to Gemini LLM.

