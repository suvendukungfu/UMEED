# UMEED Phase 1.2 — Production Dependency Remediation Report

**Date**: 2026-10-31  
**Project**: UMEED (HackCBS 9.0)  
**Security Role**: Principal Application Security Engineer  
**Status**: **COMPLETED & VERIFIED**

---

## 1. Executive Summary

A comprehensive dependency security remediation was conducted across the UMEED monorepo workspaces:
1. **Production Runtime Vulnerabilities Eliminated**: `npm audit --omit=dev` reports **0 vulnerabilities**.
2. **PostCSS Hardened**: Fixed transitive vulnerability inside `next@15.5.28` using root `overrides`, ensuring all PostCSS packages resolve to `8.5.32`.
3. **Zod Hardened**: Upgraded to `zod@4.6.7` (resolving GHSA-mrhx-c7xc-m3w5). Enforced strict `.max()` array and string limits across the canonical incident schema to protect against memory exhaustion attacks.
4. **Development Tooling Hardened**: Upgraded `vitest` from `2.1.8` to `3.2.7`.
5. **Quality Gates Passed**: 17/17 tests passing, strict TypeScript typecheck passes with 0 errors, ESLint passes with 0 warnings, and Next.js 15.5.28 production build succeeds.

---

## 2. Dependency Audit Before vs. After

| Scope | Before Remediation | After Remediation | Status |
|---|---|---|---|
| **Production (`--omit=dev`)** | 3 vulnerabilities (2 High, 1 Moderate) | **0 vulnerabilities** | **CLEAN** |
| **All Dependencies (`npm audit`)** | 24 vulnerabilities (3 Critical, 4 High, 17 Moderate) | 19 vulnerabilities (2 Critical, 1 High, 16 Moderate) | **Dev Tooling Only** |

---

## 3. Detailed Remediation Actions

### A. PostCSS Transitive Override
- **Affected Packages**: `postcss@8.4.31` bundled within `node_modules/next`.
- **Advisories Addressed**:
  - `GHSA-6g55-p6wh-862q` (High, CVSS 7.5): Arbitrary file read via sourceMappingURL.
  - `GHSA-r28c-9q8g-f849` (High, CVSS 7.5): Path traversal in source map auto-loading.
  - `GHSA-qx2v-qp2m-jg93` (Moderate, CVSS 6.1): XSS via unescaped `</style>`.
  - `GHSA-fxqj-rqcc-2cmp` (Moderate): Incomplete fix of sourceMappingURL read.
- **Remediation**: Added npm override in root `package.json`:
  ```json
  "overrides": {
    "postcss": "8.5.32"
  }
  ```
- **Verification**: `npm explain postcss` confirms all PostCSS instances across `next`, `tailwindcss`, and `autoprefixer` resolve to `8.5.32`.

### B. Zod Upgrade & Ingestion Array Bounds Hardening
- **Advisory Addressed**: `GHSA-mrhx-c7xc-m3w5` (High, CVSS 7.5: memory exhaustion while validating oversized constrained collections in Zod `<4.6.6`).
- **Remediation**:
  1. Updated `packages/contracts/package.json` and `apps/web/package.json` to `"zod": "^4.6.6"`, resolving to **`4.6.7`**.
  2. In `packages/contracts/src/incident.ts`, added explicit `.max(...)` boundaries:
     - `evidence`: `.max(25)`
     - `description`: `.max(5000)`
     - `source_reference`: `.max(256)`
     - `source_url`: `.max(2048)`
     - `address`: `.max(500)`
     - `district`: `.max(100)`
     - `severity.reasoning`: `.max(20)` (items `.max(500)`)
     - `missing_information`: `.max(20)` (items `.max(200)`)
     - `latitude` / `longitude`: `.min(-90).max(90)` and `.min(-180).max(180)`
  3. Added automated unit regression tests in `packages/contracts/src/incident.test.ts` verifying array DoS rejection.

### C. Development-Only Dependencies Analysis
- **Packages**: `tinypool` (GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr), `vitest` (GHSA-82fw-gwwq-j7x9), `esbuild` (GHSA-67mh-4wv8-2f99), `minimatch` (GHSA-g3hv-75wg-m249).
- **Isolation Guarantee**: None of these packages are imported or bundled into the production Next.js runtime. They run solely on developer machines during `vitest run` and `next lint`.
- **Policy**: `npm audit fix --force` was avoided to prevent breaking major migrations (`vitest@5.x`, `zod@4.x`) from destabilizing hackathon development.

---

## 4. Final Dependency Verification

```bash
npm ls next react react-dom postcss zod
```
```
umeed@0.1.0 /Users/suvendusahoo/hackcbs 
├─┬ @umeed/contracts@0.1.0 -> ./packages/contracts
│ ├─┬ vitest@3.2.7
│ │ └─┬ vite@5.4.21
│ │   └── postcss@8.5.32 deduped
│ └── zod@4.6.7
└─┬ @umeed/web@0.1.0 -> ./apps/web
  ├─┬ autoprefixer@10.6.2
  │ └── postcss@8.5.32 deduped
  ├─┬ lucide-react@0.474.0
  │ └── react@19.3.1 deduped
  ├─┬ next@15.5.28
  │ ├── postcss@8.5.32 deduped
  │ ├── react-dom@19.3.1 deduped
  │ ├── react@19.3.1 deduped
  │ └─┬ styled-jsx@5.1.6
  │   └── react@19.3.1 deduped
  ├── postcss@8.5.32
  ├─┬ react-dom@19.3.1
  │ └── react@19.3.1 deduped
  ├── react@19.3.1
  ├─┬ tailwindcss@3.4.19
  │ └── postcss@8.5.32 deduped
  └── zod@4.6.7 deduped
```

---

## 5. Verification Commands & Results

1. **`npm audit --omit=dev --registry=https://registry.npmjs.org/`**:
   ```
   found 0 vulnerabilities
   Exit code: 0
   ```
2. **`npm run typecheck --workspaces`**:
   ```
   0 errors across @umeed/contracts and @umeed/web
   Exit code: 0
   ```
3. **`npm run lint --workspace=apps/web`**:
   ```
   ✔ No ESLint warnings or errors
   Exit code: 0
   ```
4. **`npm run test --workspaces`**:
   ```
   17 passed (6 in @umeed/contracts, 11 in @umeed/web)
   Exit code: 0
   ```
5. **`npm run build --workspace=apps/web`**:
   ```
   ▲ Next.js 15.5.28
   Creating an optimized production build ...
   ✓ Compiled successfully in 1292ms
   ✓ Linting and checking validity of types
   ✓ Generating static pages (11/11)
   Exit code: 0
   ```
