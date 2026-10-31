# UMEED Dev Toolchain & Production Dependency Remediation Report

**Date**: 2026-10-31  
**Project**: UMEED (HackCBS 9.0)  
**Branch Status**: Unified & Integrated into `main` (`666736c`), synchronized with `parallel/product-ux-oss`  
**Security Status**:
- **Production Vulnerabilities**: **0 (`npm audit --omit=dev`)**
- **Critical Vulnerabilities in Toolchain**: **0 (Tinypool completely eliminated)**
- **High Vulnerabilities in Toolchain**: **0**
- **Moderate Dev-Only Vulnerabilities**: 13 (Transitive `minimatch <11.0.1` in ESLint AST parsers)
- **Total Tests Passing**: **17/17** (Contracts & Web)
- **Clean Installation Reproducibility**: **Verified via `rm -rf node_modules && npm ci` (Exit code: 0)**

---

## 1. Remediation Chronology & Upgrades

| Package | Initial Version | Final Version | Role | Advisory Resolved / Notes |
|---|---|---|---|---|
| `next` | `15.1.7` | **`15.5.28`** | Framework (Prod) | October 14, 2026 security release (RCE in `use cache` typed arrays, RCE in Image Optimization SVG, DoS in Server Actions) |
| `postcss` | `8.4.31` (transitive) | **`8.5.32`** | CSS Pipeline (Prod) | Overridden via root `package.json` overrides; resolves GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 |
| `zod` | `3.25.76` | **`4.6.7`** | Validation (Prod) | Resolves GHSA-mrhx-c7xc-m3w5 (collection memory exhaustion); added strict `.max()` schema boundaries |
| `vitest` | `2.1.8` / `3.2.7` | **`4.1.12`** | Test Runner (Dev) | Vitest v4 architecture upgrade; **completely eliminated `tinypool`** |
| `tinypool` | `1.1.1` | **REMOVED** | Worker Pool (Dev) | Resolves Critical RCEs `GHSA-5gmw-xhrv-c9v3` and `GHSA-85c8-ppgw-ccpr` |
| `vite` | `5.4.21` | **`8.3.5`** | Test Bundler (Dev) | Resolves dev-only `esbuild` and `@vitest/mocker` advisories |

---

## 2. Dependency Configuration & `.npmrc` Review

### `.npmrc` Configuration:
```ini
legacy-peer-deps=true
registry=https://registry.npmjs.org/
```

### Technical Evaluation of `legacy-peer-deps=true`:
1. **Root Cause**: During initial installation across npm workspaces with Next.js 15.5.28 and React 19.3.1, transitive ESLint plugins (`eslint-plugin-react-hooks`, `eslint-plugin-import`) specify peer dependency ranges on React 18 (`react: "^18.0.0"`). Under npm 10/11's default strict Arborist resolver, this triggers an `ERESOLVE` peer dependency conflict.
2. **Lockfile Consistency**: The `package-lock.json` was generated and validated with these exact pinned versions.
3. **Clean Installation Verification**: Executing `rm -rf node_modules apps/web/node_modules packages/contracts/node_modules && npm ci` with `.npmrc` succeeds cleanly in **4 seconds** adding 409 packages with zero unresolved dependencies (Exit code: 0).

---

## 3. Dependency Audit Breakdown

### A. Production Runtime Dependencies (`npm audit --omit=dev`)
```bash
npm audit --omit=dev --registry=https://registry.npmjs.org/
```
```
found 0 vulnerabilities
```
- **Exit Code**: `0`
- **Result**: Zero vulnerabilities in any production runtime dependency or transitive module.

### B. Full Development Audit (Inclusive of Build Tools)
```bash
npm audit --registry=https://registry.npmjs.org/
```
- **Critical Severity**: **0**
- **High Severity**: **0**
- **Moderate Severity**: **13**
  - **Advisory**: `minimatch <11.0.1` (`GHSA-g3hv-75wg-m249` — potential ReDoS via globparts amplification).
  - **Path**: Transitive dependency within `eslint-config-next` > `eslint-plugin-import` / `@typescript-eslint/typescript-estree`.
  - **Assessment**: ESLint is strictly a local developer linter executed via `npm run lint`. It has zero presence in production bundles (`apps/web/.next`) and is not exposed at runtime. `npm audit fix --force` would downgrade ESLint to v4.0.0 (a severe breaking change). The 13 findings are safely tracked.

---

## 4. Reproducibility & Verification Command Log

All verification commands executed from a clean `node_modules` state after `npm ci`:

| Step / Command | Target Subsystem | Exit Code | Observed Output / Result |
|---|---|---|---|
| `npm ls vitest vite` | Dev Toolchain | `0` | `vitest@4.1.12`, `vite@8.3.5` confirmed across all workspaces |
| `npm ls tinypool` | Dev Toolchain | `1` | `(empty)` — Tinypool completely eliminated |
| `npm audit --omit=dev` | Production Security | `0` | `found 0 vulnerabilities` |
| `npm run test --workspaces` | Contracts & Web Tests | `0` | `17/17 passed` (6 in contracts, 11 in web) |
| `npm run typecheck --workspaces` | TypeScript Strict Check | `0` | `0 errors` across `@umeed/contracts` and `@umeed/web` |
| `npm run lint --workspace=apps/web` | Code Quality | `0` | `✔ No ESLint warnings or errors` |
| `npm run build --workspace=apps/web` | Production Build | `0` | `Compiled successfully in 653ms` (11 routes generated) |
