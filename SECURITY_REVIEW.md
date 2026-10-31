# UMEED Security Review & Dependency Audit (Phase 1.2 Remediation)

**Date**: 2026-10-31  
**Project**: UMEED (HackCBS 9.0)  
**Security Status**:
- **Production Runtime Dependencies**: **0 Vulnerabilities (`npm audit --omit=dev`)**
- **Framework Hardening**: Next.js 15.5.28 (October 14, 2026 Security Release)
- **Schema & Array Bounds**: Hardened with Zod 4.6.7 + bounded collections

---

## 1. Next.js 15.5.28 Security Advisory Accuracy (October 14, 2026)

The application runs on **Next.js 15.5.28**. This release specifically resolves three major security vulnerabilities disclosed on October 14, 2026:

| Vulnerability Type | Description | Affected Range | Patched Version | Advisory / Impact |
|---|---|---|---|---|
| **Critical Remote Code Execution (RCE)** | Unauthenticated RCE in `use cache` functions returning typed arrays (e.g., `Uint8Array`) | `15.0.0` - `15.5.27` | **`15.5.28`** | Attackers could craft inputs triggering memory corruption or arbitrary code execution during cache deserialization. |
| **Critical Remote Code Execution (RCE)** | Unauthenticated RCE in Next.js Image Optimization API when processing SVG files | `10.0.0` - `15.5.27` | **`15.5.28`** | Exploit vector allowed arbitrary code execution via malicious SVG payloads parsed during image transformation. |
| **High Denial of Service (DoS)** | Unbounded request processing / DoS involving App Router Server Actions | `13.4.0` - `15.5.27` | **`15.5.28`** | Malicious actors could exhaust server threads and CPU resources through specifically structured Server Action requests. |

*(Note: Older advisories such as CVE-2025-66478 or generic Server Function endpoint disclosure pertain to distinct older releases and are not part of the October 14, 2026 15.5.28 security patch).*

---

## 2. Production Dependency Remediation (`npm audit --omit=dev`)

An audit using `npm audit --omit=dev --json` against the official npm registry (`https://registry.npmjs.org/`) confirms:
```
found 0 vulnerabilities
```

### Remediation Applied:

1. **PostCSS Transitive Dependency Upgrade (via npm overrides)**:
   - *Previous state*: `next@15.5.28` declared a transitive pinned dependency on `postcss@8.4.31`, which carried advisories `GHSA-6g55-p6wh-862q`, `GHSA-r28c-9q8g-f849`, `GHSA-qx2v-qp2m-jg93`, and `GHSA-fxqj-rqcc-2cmp`.
   - *Fix*: Applied an npm override in root `package.json`:
     ```json
     "overrides": {
       "postcss": "8.5.32"
     }
     ```
   - *Result*: All instances of PostCSS across the entire tree now resolve to `8.5.32`, completely eliminating the vulnerable `8.4.31` instance.

2. **Zod Upgrade & Array Resource-Exhaustion Protection**:
   - *Previous state*: `zod@3.25.76` carried advisory `GHSA-mrhx-c7xc-m3w5` (High, CVSS 7.5: memory exhaustion while validating oversized constrained collections in `<4.6.6`).
   - *Fix*: Upgraded root and workspace packages to **`zod@4.6.7`**.
   - *Application-Layer Defense*: Enforced strict `.max(...)` boundaries on all collections in `packages/contracts/src/incident.ts`:
     - `evidence`: max 25 items
     - `description`: max 5000 characters
     - `source_reference`: max 256 characters
     - `source_url`: max 2048 characters
     - `address`: max 500 characters
     - `district`: max 100 characters
     - `severity.reasoning`: max 20 items (max 500 characters each)
     - `missing_information`: max 20 tags (max 200 characters each)
     - `latitude` / `longitude`: bounded to `[-90, 90]` and `[-180, 180]`

---

## 3. Development-Only Dependencies Analysis (`npm audit`)

Full audit report: 19 advisories (0 in production runtime).

| Package | Severity | Advisory ID | Dependency Path | Mitigation & Exposure Assessment |
|---|---|---|---|---|
| `tinypool` | Critical | `GHSA-5gmw-xhrv-c9v3`<br>`GHSA-85c8-ppgw-ccpr` | `apps/web > dev vitest > tinypool` | Prototype pollution in worker options. **Zero Production Exposure**: Tinypool runs strictly in local unit tests (`vitest run`). It is never bundled into `next build`. |
| `vitest` / `@vitest/mocker` | Moderate | `GHSA-82fw-gwwq-j7x9`<br>`GHSA-qxg6-89mg-rqv8` | `apps/web > dev vitest > @vitest/mocker` | Redirect mock path traversal during UI server runs. **Mitigation**: We only execute headless CLI `vitest run`, never listening on network ports. Upgraded Vitest to `3.2.7`. |
| `esbuild` | Moderate | `GHSA-67mh-4wv8-2f99` | `apps/web > dev vitest > vite > esbuild` | Dev-server origin verification. Used solely for test file compilation. |
| `minimatch` | Moderate | `GHSA-g3hv-75wg-m249` | `apps/web > dev eslint > @typescript-eslint > minimatch` | Potential ReDoS during glob expansion in ESLint config array. Used exclusively during static linting (`next lint`). |

---

## 4. Verification Checkpoint

1. `npm audit --omit=dev`: **0 vulnerabilities**
2. `npm run typecheck --workspaces`: **0 errors**
3. `npm run lint --workspace=apps/web`: **✔ No ESLint warnings or errors**
4. `npm run test --workspaces`: **17/17 tests passing** (6 in `@umeed/contracts`, 11 in `@umeed/web`)
5. `npm run build --workspace=apps/web`: **Production build succeeded in 1.3s** (11 static/dynamic routes)
