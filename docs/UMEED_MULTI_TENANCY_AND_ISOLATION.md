# UMEED — Multi-Tenancy and Cross-Organization Isolation
**Version**: 2.0.0  
**Classification**: Security Architecture Standard  

---

## 1. Principles of Tenant Isolation

UMEED coordinates operations across multiple humanitarian organizations. An organization's confidential operations, responder details, and case interactions must never leak to competing or independent organizations.

### Non-Negotiable Tenancy Rules

1. **Server-Enforced Scope**: Organization scoping is computed exclusively from verified server session tokens, never from unverified request parameters, query strings, or client state.
2. **Database Boundary Protection**: Every query accessing organization-scoped collections (`assignments`, `offers`, `members`, `facilities`) filters strictly by `organizationId: session.activeOrganizationId`.
3. **No Cross-Tenant Read/Write**: Attempting to read or mutate another organization's records results in immediate `HTTP 403 Forbidden` (`Tenancy isolation violation`).
4. **Responder Work Allocation**: Field responders access only tasks allocated explicitly to their individual vehicle or responder ID.

---

## 2. Centralized Authorization Engine (`authorize`)

All operational route handlers execute through the unified `authorize()` engine:

```ts
const authResult = authorize(
  {
    userId: context.user.userId,
    role: context.session.activeRole,
    organizationId: context.session.activeOrganizationId,
    accountState: context.user.accountState,
  },
  "case:read:organization",
  { organizationId: requestedResource.organizationId }
);

if (!authResult.authorized) {
  throw ApiError.forbidden(authResult.reason);
}
```

---

## 3. Negative Access Validation Matrix

| Threat Vector | Mechanism | Test Result |
| :--- | :--- | :--- |
| **Cross-Tenant Case Read** | NGO A attempts to access NGO B assignment | **PASS** — Rejected with `Tenancy isolation violation`. |
| **Cross-Tenant Offer Acceptance** | NGO A attempts to accept offer sent to NGO B | **PASS** — Rejected with `Conflict: Provider ID mismatch`. |
| **Privilege Escalation** | NGO Operator attempts to invite new members | **PASS** — Rejected with `lacks permission 'ngo_member:invite'`. |
| **Citizen IDOR** | Citizen Alice requests submission of Citizen Bob | **PASS** — Rejected with `Citizens can only inspect their own submissions`. |
| **Suspended Account Bypass** | User with open session gets suspended | **PASS** — Immediate 403 on next API request. |
| **Terminal Case Tampering** | Responder mutates RESOLVED case | **PASS** — Rejected with `Cannot mutate resource in terminal status`. |
