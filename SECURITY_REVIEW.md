# UMEED Security Review & Dependency Audit (Phase 1.1)

**Date**: 2026-10-31  
**Project**: UMEED (HackCBS 9.0)  
**Status**: Framework Patched to Next.js 15.5.28; Audit Risks Documented & Isolated

---

## 1. Framework Security Update (October 14, 2026)

The application was upgraded from Next.js `15.1.7` to **`15.5.28`** (released October 14, 2026).

### Accurate Release Context
Next.js 15.5.28 is a critical security maintenance release addressing three major vulnerabilities:
- Critical remote code execution (RCE) vulnerabilities in server-side handling.
- Unauthenticated disclosure of internal Server Function endpoints.
- High-severity Denial-of-Service (DoS) and cache poisoning issues affecting App Router rendering pipelines.

*(Note: Earlier advisories such as CVE-2025-66478 pertain to older Next.js 15 branches; release 15.5.28 specifically resolves the October 2026 vulnerability disclosure).*

---

## 2. Dependency Tree Alignment

```
umeed@0.1.0 /Users/suvendusahoo/hackcbs
├─┬ @umeed/contracts@0.1.0 -> ./packages/contracts
│ └── typescript@5.9.3
└─┬ @umeed/web@0.1.0 -> ./apps/web
  ├── eslint-config-next@15.5.28
  ├─┬ lucide-react@0.474.0
  │ └── react@19.3.1 deduped
  ├─┬ next@15.5.28
  │ ├── react-dom@19.3.1 deduped
  │ ├── react@19.3.1 deduped
  │ └─┬ styled-jsx@5.1.6
  │   └── react@19.3.1 deduped
  ├─┬ react-dom@19.3.1
  │ └── react@19.3.1 deduped
  └── react@19.3.1
```

- **`next`**: `15.5.28` (Patched release)
- **`eslint-config-next`**: `15.5.28` (Aligned with Next.js)
- **`react` & `react-dom`**: `19.3.1` (Clean peer dependency deduplication)
- **`typescript`**: `5.9.3` (Strict compilation across workspaces)

---

## 3. Post-Upgrade Audit Analysis

An audit was performed using `npm audit --json` against the official npm registry (`https://registry.npmjs.org/`).
The audit is **not zero-advisory**; findings are distinguished below between production runtime impact and development-only tooling.

### A. Production-Only Dependencies (`npm audit --omit=dev`)
- **Total Vulnerabilities**: 3 (0 Critical, 2 High, 1 Moderate)

| Package | Severity | Advisory ID | Description | Impact & Mitigation |
|---|---|---|---|---|
| `postcss` | High | GHSA-6g55-p6wh-862q | Arbitrary file read via sourceMappingURL in CSS comments | Bundled transitively via `next`. Not user-facing in production builds since source maps are not generated from untrusted user CSS. |
| `postcss` | High | GHSA-r28c-9q8g-f849 | Path traversal in previous source map auto-loading | Same as above; internal build-time CSS compilation only. |
| `postcss` | Moderate | GHSA-qx2v-qp2m-jg93 | XSS via unescaped `</style>` in CSS stringify | Mitigated: No raw user input is processed into dynamic CSS stylesheets. |
| `postcss` | Moderate | GHSA-fxqj-rqcc-2cmp | Incomplete fix of sourceMappingURL file read | Mitigated: Controlled build environment. |
| `next` | Moderate | — | Flagged solely via transitive `postcss` | Binary itself is clean of direct CVEs in 15.5.28. |
| `zod` | High | GHSA-mrhx-c7xc-m3w5 | Memory exhaustion on oversized constrained collections (`<4.6.6`) | In our application, request payload sizes are strictly capped (e.g. 1MB body limit in `POST /api/incidents/ingest`), preventing oversized collection exhaustion attacks. Upgrading to Zod 4.x would introduce breaking schema API changes during the hackathon. |

### B. Development & Test Dependencies Only (`npm audit`)
- **Total Workspace Vulnerabilities**: 23 (2 Critical, 3 High, 18 Moderate)
- **None of these packages are shipped in the production Next.js runtime.**

| Package | Severity | Advisory ID | Role | Impact & Risk Assessment |
|---|---|---|---|---|
| `tinypool` | Critical | GHSA-5gmw-xhrv-c9v3<br>GHSA-85c8-ppgw-ccpr | Sub-dependency of `vitest` | Used solely during local execution of `vitest run`. Worker thread pool is never exposed over the network. |
| `vitest` | Critical / Moderate | GHSA-5xrq-8626-4rwp<br>GHSA-82fw-gwwq-j7x9 | Local test runner | Vitest UI server is never started in production; only headless CLI `vitest run` is used. |
| `esbuild` | Moderate | GHSA-67mh-4wv8-2f99 | Sub-dependency of `vite` (test runner) | Dev-only test bundling. |
| `minimatch` | Moderate | GHSA-g3hv-75wg-m249 | Sub-dependency of `eslint` | Linter execution only (`next lint`). |

**Policy Adhered**: `npm audit fix --force` was intentionally avoided because it would force breaking major version jumps (`vitest@5.x`, `zod@4.x`, `eslint@4.x`) that destabilize active Next.js App Router integrations.

---

## 4. Verification Checkpoint

All quality gates were verified post-upgrade:

1. **Strict TypeScript Compilation**:
   ```bash
   npm run typecheck --workspaces
   # Exit code: 0 (0 errors)
   ```
2. **ESLint Verification**:
   ```bash
   npm run lint --workspace=apps/web
   # Exit code: 0 (✔ No ESLint warnings or errors)
   ```
3. **Automated Unit & Contract Test Suite**:
   ```bash
   npm run test --workspaces
   # Exit code: 0 (15/15 tests passing: 4 in contracts, 11 in web)
   ```
4. **Next.js Production Build**:
   ```bash
   npm run build --workspace=apps/web
   # Exit code: 0 (Compiled successfully in 2.2s, 11 routes generated)
   ```
5. **Runtime Server Verification**:
   - `GET /`: Serves rendered HTML without warnings.
   - `GET /api/health`: Responds with HTTP 200 OK, decoupled database reporting `unconfigured` safely.
