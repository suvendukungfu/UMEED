# UMEED Security Review & Dependency Audit (Final Toolchain Hardening)

**Date**: 2026-10-31  
**Project**: UMEED (HackCBS 9.0)  
**Branch**: `main` (commit `666736c`, synchronized with `parallel/product-ux-oss`)  
**Security Status**:
- **Production Runtime Dependencies**: **0 Vulnerabilities (`npm audit --omit=dev`)**
- **Test Toolchain**: Vitest `4.1.12` (Tinypool completely removed; 0 Critical, 0 High vulnerabilities across workspace)
- **Full Development Toolchain Audit**: 13 Moderate Advisories (Transitive `minimatch` in ESLint AST parsers, zero production exposure)
- **Framework**: Next.js 15.5.28 (October 14, 2026 Security Release)
- **Schema Validation**: Zod 4.6.7 with strict `.max()` array and string limits
- **Reproducibility**: Clean installation verified via `rm -rf node_modules && npm ci` (Exit code: 0)

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

An audit using `npm audit --omit=dev` against the official npm registry (`https://registry.npmjs.org/`) confirms:
```
found 0 vulnerabilities
```

### Remediation Details:
1. **PostCSS Transitive Dependency Override**:
   - `node_modules/next/node_modules/postcss` (pinned 8.4.31) was overridden using root `package.json` overrides:
     ```json
     "overrides": {
       "postcss": "8.5.32"
     }
     ```
   - Resolves all PostCSS advisories (`GHSA-6g55-p6wh-862q`, `GHSA-r28c-9q8g-f849`, `GHSA-qx2v-qp2m-jg93`, `GHSA-fxqj-rqcc-2cmp`).
2. **Zod 4.6.7 Upgrade & Schema Defense**:
   - Upgraded to `zod@4.6.7` (resolving `GHSA-mrhx-c7xc-m3w5`).
   - Hardened `CanonicalIncidentSchema` in `packages/contracts/src/incident.ts` with explicit `.max()` limits (evidence: max 25, description: max 5000, reasoning: max 20, missing_info: max 20, geographic coordinates: bounded).

---

## 3. Development Toolchain Remediation (Vitest 4.1.12)

### A. Tinypool Removal
- **Previous state**: `vitest@3.2.7` depended on `tinypool@1.1.1`, which was flagged by two Critical RCE advisories (`GHSA-5gmw-xhrv-c9v3`, `GHSA-85c8-ppgw-ccpr`) due to worker option prototype pollution.
- **Remediation**: Upgraded `vitest` to **`4.1.12`**. Vitest 4 completely removed Tinypool and replaced its execution pool with native worker scheduling.
- **Verification**: `npm ls tinypool` outputs `(empty)`.

### B. Vite & Esbuild Alignment
- Vitest 4.1.12 upgraded the internal Vite test bundler to `vite@8.3.5`, resolving the previous `esbuild` and `@vitest/mocker` advisories.

### C. Remaining Development Tooling Advisory
- **Remaining Advisory**: `minimatch <11.0.1` (`GHSA-g3hv-75wg-m249`, Moderate).
  - *Dependency Path*: `eslint-config-next > eslint-plugin-import > minimatch@3.1.5`
  - *Mitigation*: ESLint is strictly a local developer linter (`next lint`). `npm audit fix --force` suggests downgrading to `eslint@4.0.0`, which would be a severe breaking change. This advisory has **zero runtime exposure** in production.

---

## 4. Reproducibility & Quality Verification Gates

All checks executed following a fresh `rm -rf node_modules && npm ci`:

```bash
# Clean deterministic installation
npm ci
# Result: added 409 packages in 4s (Exit code: 0)

# Production audit
npm audit --omit=dev
# Result: found 0 vulnerabilities (Exit code: 0)

# Full audit
npm audit
# Result: 0 Critical, 0 High (13 moderate dev-only transitive minimatch in ESLint)

# Strict TypeScript check
npm run typecheck --workspaces
# Result: 0 errors across @umeed/contracts and @umeed/web (Exit code: 0)

# ESLint check
npm run lint --workspace=apps/web
# Result: ✔ No ESLint warnings or errors (Exit code: 0)

# Automated test suite
npm run test --workspaces
# Result: 70/70 tests passing (6 contracts, 64 web) (Exit code: 0)

# Production build
npm run build --workspace=apps/web
# Result: Compiled successfully in 1361ms (14 routes generated, Exit code: 0)
```

---

## 5. Phase 2, 2.1 & 2.2 Incident Security & Authorization Controls

### A. Authorization & Credential Hygiene
- **Coordinator Feed Access Control**: `GET /api/incidents` enforces strict server-side coordinator authorization via `x-coordinator-key` or `Authorization: Bearer <key>`. Fails closed (`401 Unauthorized`) when unauthenticated.
- **Citizen Tracking Secret Boundary**: Public reference alone (`UMD-XXXX-YYYY`) does not authorize incident inspection. Retrieval requires matching high-entropy tracking token (`trk_...`) in headers. Tokens in query strings (`?token=...`) are rejected.
- **Anti-Enumeration Protection**: Invalid tracking tokens or missing records return a generic `404 Not Found` response with identical error payload to prevent incident existence enumeration.
- **Constant-Time Verification**: Verification of API keys and tracking token hashes utilizes `crypto.timingSafeEqual()` to mitigate timing side-channel attacks.
- **Token Entropy & Storage**: Generated using `crypto.randomBytes(24)` (>192 bits entropy); only SHA-256 hash is persisted; tokens are redacted from all application logs (`trk_***`).
- **Production Credential Hardening (Phase 2.2)**: Development default credentials (`umeed-coordinator-dev-key`, `umeed-crawler-dev-key`) only work when `NODE_ENV=development` or `test`. Production strictly rejects development defaults and template placeholders (`isPlaceholderValue`). Missing production secrets cause operations to fail closed.

### B. Database Fail-Closed Policy (Phase 2.2)
- **Zero Silent Memory Fallback in Production**: `InMemoryIncidentRepository` is strictly forbidden in production. If `MONGODB_URI` is unconfigured or unreachable in production, repository resolution throws a hard error and ingestion returns `503 Service Unavailable`.
- **No False Success**: Reports are never acknowledged as permanently persisted (`201 Created`) if they are only held in ephemeral process memory.
- **Development Ephemeral Indicator**: When running in development mode without MongoDB, `/api/health` and server startup logs surface clear warnings that data is temporary.

### C. Binary Image Privacy & Evidence Derivatives (Phase 2.2)
- **Binary EXIF Purging**: EXIF removal is not merely an API response filter. `stripBinaryExif` parses the actual JPEG binary stream (purging APP1 `0xFFE1`, APP13 `0xFFED`, and COM `0xFFFE`) and PNG chunks (`eXIf`, `tEXt`, `zTXt`, `iTXt`), eliminating device metadata and GPS coordinates directly from binary derivative files.
- **Coordinate Privacy**: Citizen-facing endpoints nullify `location.latitude` and `location.longitude` to prevent public tracking of vulnerable individuals.
- **Evidence Vault Separation**: Internal cloud storage keys (`s3://...`) are withheld; public endpoints proxy media through `/api/evidence/preview/...`.
- **PII Masking**: Indian mobile numbers, email addresses, and ID numbers in public descriptions are masked with replacement tokens.

### D. Rate Limiting Defense & Proxy Trust (Phase 2.2)
- **Intake Protection**: Ingestion endpoint (`POST /api/incidents/ingest`) is protected by a sliding-window limiter (30 req/min/IP).
- **Tracking Enumeration Defense**: Tracking lookup endpoint is limited to 10 req/min/IP.
- **IP Extraction & Reverse-Proxy Trust**: `extractClientIp` validates strict IPv4/IPv6 syntax and prioritizes `cf-connecting-ip` and `x-real-ip` before falling back to `x-forwarded-for`. Production deployments must terminate behind a trusted reverse proxy configured to strip incoming untrusted forwarding headers.
- **Production Disclosure**: Current limiter is in-memory (`MemoryRateLimiter`). Horizontal multi-node deployments must back rate limiters with Redis or edge rate-limiting rules.


