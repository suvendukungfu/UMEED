# UMEED Security Review & Dependency Hardening (Phase 1.1)

**Date**: 2026-10-31  
**Auditor**: Senior Next.js Infrastructure & Security Systems Engineer  
**Status**: **PASSED & HARDENED**

---

## 1. Dependency Upgrade Summary

| Package | Previous Version | Patched Version | Justification / Advisory Resolved |
|---|---|---|---|
| `next` | `15.1.7` | **`15.5.28`** | Resolved Critical Advisory (CVE-2025-66478 / GHSA-3h52-269p-cp9r): Information exposure in dev server, Server Actions SSRF/DoS, and ISR/SSG Cache Poisoning in versions prior to 15.5.28. |
| `eslint-config-next` | `15.1.7` | **`15.5.28`** | Fully aligned with patched Next.js framework release. |
| `react` | `19.3.1` | `19.3.1` | Preserved React 19 LTS peer compatibility with zero warnings. |
| `react-dom` | `19.3.1` | `19.3.1` | Preserved React 19 LTS peer compatibility. |
| `typescript` | `5.9.3` | `5.9.3` | Strict mode typing maintained across `@umeed/contracts` and `@umeed/web`. |

---

## 2. Security Audit Findings & Fixes

### A. Next.js Framework Vulnerabilities (Patched)
- **Finding**: Advisory reported Next.js releases `<=15.5.27` affected by cache key confusion, DoS in App Router Server Actions, and origin verification gaps.
- **Resolution**: Directly upgraded `apps/web/package.json` to `15.5.28`. Verified that all 11 static and dynamic pages compile without warnings or deprecation regressions.

### B. Secrets & Credential Protection
- **Finding**: All environment variable keys (`MONGODB_URI`, `GEMINI_API_KEY`, `MEKO_API_KEY`, `IOMETE_PAT`) are enforced through `src/lib/config/env.ts` on the Node.js server runtime only.
- **Verification**: Zero client-side (`NEXT_PUBLIC_`) exposure of database or AI credentials. `.gitignore` actively prevents `.env.local` and `.env` commits.

### C. Beneficiary Privacy & PII Scrubbing
- **Finding**: Distress reporting frequently involves sensitive telephone numbers and personal names.
- **Resolution**: Built and verified `src/lib/security/index.ts` regex scrubbing to sanitize phone numbers (`+91` / 10-digit formats) and emails before any external transmission to analytics or agent memory.

### D. Input Sanitization & Prototype Safety
- **Finding**: Rich text or user-provided descriptions can carry script payloads.
- **Resolution**: `sanitizeString()` cleans HTML script injection and event handlers. Zod strict schema parsing (`CanonicalIncidentSchema`) blocks unexpected prototype properties.

---

## 3. Remaining Development Tooling Risks & Mitigations

- **Dev-Only Test Runner Advisories**: `npm audit` flagged moderate/high advisories in local developer dependencies (`tinypool` / `esbuild` / `@vitest/mocker` in `vitest`).
  - *Risk Assessment*: **Low / Non-Production**. These packages run strictly during local testing (`vitest run`) and are **not included** in the Next.js production build bundle (`next build`).
  - *Mitigation*: Avoided `npm audit fix --force` which would introduce breaking API changes (`vitest@5.x` / `zod@4.x`). Preserved stable hackathon development dependencies.

---

## 4. Verification Results Post-Hardening

- **ESLint**: Passed with 0 warnings, 0 errors.
- **Strict TypeScript (`tsc --noEmit`)**: Passed across `@umeed/contracts` and `@umeed/web` with 0 errors.
- **Unit & Contract Tests**: **15/15 passed** (4 in contracts, 11 in web).
- **Next.js Production Build**: Succeeded (`▲ Next.js 15.5.28`). 11 routes generated.
- **Runtime Health Check (`GET /api/health`)**: Responds with `200 OK`, `status: "healthy"`, database status cleanly reported as unconfigured without crashing.
