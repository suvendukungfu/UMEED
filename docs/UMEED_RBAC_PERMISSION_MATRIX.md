# UMEED Enterprise RBAC & Authorization Permission Matrix

**Document Version**: 2.0.0  
**Status**: APPROVED SPECIFICATION  
**Scope**: All API Endpoints, Server Actions & UI Workspaces  

---

## 1. Role Definitions

| Role Identifier | Description | Tenancy Scope |
|---|---|---|
| **`CITIZEN`** | Distress reporter seeking humanitarian help | Self-scoped (only own requests & public tracker) |
| **`NGO_OWNER`** | Primary executive owner of a verified NGO | Single Organization (Full management of own NGO) |
| **`NGO_ADMIN`** | Operations manager delegated by NGO Owner | Single Organization (Operational management & staff) |
| **`NGO_OPERATOR`** | Dispatch operator / desk responder in NGO | Single Organization (Offer intake & progress reports) |
| **`COORDINATOR`** | Humanitarian coordinator (neutral triage authority) | Cross-Organization (Review, match, dispatch, verify) |
| **`RESPONDER`** | Field paramedic / mobile rescue driver | Assignment-scoped (Only specifically assigned cases) |
| **`PLATFORM_ADMIN`** | Platform infrastructure & security administrator | Platform-wide (User accounts, NGO verification, settings) |
| **`AUDITOR`** | Independent compliance & humanitarian auditor | Platform-wide Read-Only (Redacted audit logs & case trails) |

---

## 2. Permission Catalog and Role Mapping Matrix

| Permission | `CITIZEN` | `NGO_OWNER` | `NGO_ADMIN` | `NGO_OPERATOR` | `COORDINATOR` | `RESPONDER` | `PLATFORM_ADMIN` | `AUDITOR` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `incident:create` | **YES** | NO | NO | NO | **YES** | NO | NO | NO |
| `incident:read:own` | **YES** | NO | NO | NO | NO | NO | NO | NO |
| `incident:read:assigned` | NO | NO | NO | NO | NO | **YES** | NO | NO |
| `incident:read:organization`| NO | **YES** | **YES** | **YES** | NO | NO | NO | NO |
| `incident:review` | NO | NO | NO | NO | **YES** | NO | **YES** | NO |
| `incident:approve` | NO | NO | NO | NO | **YES** | NO | NO | NO |
| `incident:reject` | NO | NO | NO | NO | **YES** | NO | NO | NO |
| `case:create` | NO | NO | NO | NO | **YES** | NO | NO | NO |
| `case:read:assigned` | NO | NO | NO | NO | **YES** | **YES** | **YES** | **YES** (Redacted) |
| `case:read:organization` | NO | **YES** | **YES** | **YES** | **YES** | NO | **YES** | **YES** (Redacted) |
| `case:dispatch` | NO | NO | NO | NO | **YES** | NO | NO | NO |
| `case:escalate` | NO | **YES** | **YES** | NO | **YES** | NO | **YES** | NO |
| `case:resolve` | NO | NO | NO | NO | **YES** | NO | NO | NO |
| `ngo:read` | NO | **YES** | **YES** | **YES** | **YES** | NO | **YES** | **YES** |
| `ngo:manage:own` | NO | **YES** | **YES** | NO | NO | NO | NO | NO |
| `ngo:verify` | NO | NO | NO | NO | NO | NO | **YES** | NO |
| `ngo:suspend` | NO | NO | NO | NO | NO | NO | **YES** | NO |
| `ngo_member:invite` | NO | **YES** | **YES** | NO | NO | NO | NO | NO |
| `ngo_member:manage` | NO | **YES** | NO | NO | NO | NO | NO | NO |
| `capacity:read` | NO | **YES** | **YES** | **YES** | **YES** | NO | **YES** | **YES** |
| `capacity:update` | NO | **YES** | **YES** | **YES** | NO | NO | NO | NO |
| `responder:update_assigned_case` | NO | **YES** | **YES** | **YES** | NO | **YES** | NO | NO |
| `analytics:read:organization` | NO | **YES** | **YES** | NO | NO | NO | NO | NO |
| `analytics:read:platform` | NO | NO | NO | NO | **YES** | NO | **YES** | **YES** |
| `audit:read:authorized` | NO | NO | NO | NO | **YES** | NO | **YES** | **YES** |
| `admin:manage_users` | NO | NO | NO | NO | NO | NO | **YES** | NO |
| `admin:manage_permissions` | NO | NO | NO | NO | NO | NO | **YES** | NO |

---

## 3. Server-Enforced Tenancy & Authorization Invariants

1. **Server Policy Enforcement**: Every mutating API route must execute `authorize(user, permission, resource, context)`. A client-supplied role or header is strictly untrusted.
2. **Organization Boundary Enforcement**: A user belonging to `NGO-DELHI-001` cannot read or mutate any case, offer, or assignment belonging to `NGO-DELHI-002`. Doing so returns `HTTP 403 Forbidden`.
3. **Exclusive Offer Acceptance**: Only an authorized representative of the explicitly targeted organization can accept an outreach attempt. Acceptance is conditional, atomic, and automatically supersedes competing attempts.
4. **Terminal Case Mutation Block**: Neither coordinators nor responders can alter an assignment or record progress on a case in terminal `RESOLVED` or `CANCELLED` status without an explicit, auditable coordinator reopening.
5. **No Self-Verification**: An `NGO_OWNER` cannot approve their own organization's verification. Verification requires a `PLATFORM_ADMIN`.

