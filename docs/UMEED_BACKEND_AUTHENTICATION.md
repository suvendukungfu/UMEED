# UMEED — Backend Authentication & Unified RBAC Specification

**Service:** Fastify Operational Backend (`apps/backend`)  
**Security Model:** Role-Based Access Control (RBAC) + Multi-Tenant NGO Scoping  
**Source Code:** `apps/backend/src/plugins/auth.ts`, `modules/auth/routes.ts`  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Unified Identity Model

UMEED implements a unified identity model across citizens, responders, NGO admins, coordinators, and platform administrators.

### Roles (`@umeed/contracts/src/auth.ts`)
- `CITIZEN`: Public beneficiary distress reporter.
- `RESPONDER`: Field volunteer/staff member assigned to specific cases within their NGO.
- `NGO_OPERATOR`: Field dispatcher managing operations for their registered NGO.
- `NGO_ADMIN`: Administrator managing NGO profile, members, and incoming assistance requests.
- `NGO_OWNER`: Founding principal of an authorized NGO.
- `COORDINATOR`: Disaster relief triage officer overseeing city-wide incident verification.
- `PLATFORM_ADMIN`: Humanitarian platform governance and organization verification authority.
- `AUDITOR`: Independent compliance officer reviewing logs and response timeliness.

---

## 2. Session Architecture & Token Cryptography

1. **Token Generation:**  
   Session tokens are cryptographically random 256-bit entropy strings prefixed with `sess_`:
   ```typescript
   rawToken = `sess_${crypto.randomBytes(32).toString("hex")}`
   ```
2. **One-Way Hashing in Database:**  
   Plaintext session tokens are **never stored** in the database. The database records only the SHA-256 hash:
   ```typescript
   tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
   ```
   If the database is compromised, active session tokens cannot be recovered or replayed.
3. **Session Lifetime:**  
   - Time-to-Live: 7 days (`maxAge: 7 * 24 * 60 * 60`).
   - Cookie Attributes: `HttpOnly; Secure; SameSite=Lax; Path=/`.

---

## 3. Strict Multi-Tenant NGO Isolation

A fundamental security requirement is that NGOs cannot inspect or modify cases, assignments, or beneficiary details belonging to other organizations.

Enforced at the Fastify route layer:
1. `request.ngoId` is populated exclusively from the verified active session in the database.
2. Route queries automatically inject `{ assignedNgoId: request.ngoId }`.
3. Requests attempting to query or update a foreign `case_id` or `assignment_id` are rejected with HTTP 403 `FORBIDDEN`.
4. Front-end role parameters or headers (`x-ngo-id`) submitted by untrusted clients are strictly overridden by the authenticated session context.

