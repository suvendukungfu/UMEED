# UMEED — Identity and Unified Authentication Architecture
**Version**: 2.0.0  
**Classification**: Security Standard  

---

## 1. Unified Authentication Paradigm

UMEED implements a single, unified authentication architecture serving all roles across the platform. Users maintain one authenticated identity with role- and membership-aware navigation.

### 1.1 Routes & Workspaces

- `/auth/sign-in`: Unified email/password sign-in and session issuance.
- `/app`: Role-aware redirect hub (routes users based on active role).
- `/app/citizen`: Citizen submission history and tracking.
- `/app/coordinator`: Incident triage queue, review workspace, and dispatch mission control.
- `/app/ngo`: NGO operations portal (incoming offers, assignments, capacity, team).
- `/app/responder`: Mobile-first field responder cockpit.
- `/app/admin`: Platform administration, organization verification, and system status.
- `/app/audit`: Read-only compliance audit trail.

---

## 2. Session and Security Specifications

### 2.1 Cryptographic Standards
- **Password Hashing**: `crypto.scrypt` with a 16-byte cryptographically secure random salt, 64-byte key length, and constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Session Tokens**: 32-byte cryptographically secure random tokens (`sess_<hex64>`).
- **Session Storage**: Only SHA-256 hashes of tokens are stored in the database (`tokenHash`). Plaintext tokens are delivered exclusively in secure HTTP response headers or secure cookies.
- **TTL**: 7 days maximum session lifetime with continuous sliding renewal on active requests.

### 2.2 Account States & Lifecycle
```
[ INVITED ] --------------> [ ACTIVE ] --------------> [ SUSPENDED ]
     |                          |                            |
     v                          v                            v
[ EMAIL_VERIFICATION ]   [ SESSION ISSUED ]           [ IMMEDIATE 401 ]
```
1. `ACTIVE`: Authorized for operational workflows corresponding to permissions.
2. `SUSPENDED`: Access revoked immediately across all open sessions.
3. `DISABLED`: Permanent administrative lock.
4. `PASSWORD_RESET_REQUIRED`: Forces credential update prior to granting operational access.

---

## 3. Multi-Tenant Organization Membership

A user can belong to multiple organizations with distinct roles:
- `NGO_OWNER`: Full administrative governance over their verified NGO.
- `NGO_ADMIN`: Operational administration and member management.
- `NGO_OPERATOR`: Processing incoming offers, acknowledging and updating progress.
- `RESPONDER`: Allocated field assignments and en-route/on-site updates.

The active organization context is switched server-side via `POST /api/auth/switch-org`:
```ts
authService.switchOrganization(sessionToken, targetOrgId);
```
Unverified client-supplied organization IDs are strictly rejected.
