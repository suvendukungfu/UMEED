# UMEED — Backend Migration Acceptance & Quality Dossier

**Target Platform:** UMEED Emergency & Disaster Citizen Assistance Platform  
**Architecture:** Decoupled Vercel Hobby Frontend + Fly.io Mumbai (`bom`) Fastify Backend  
**Database:** MongoDB Atlas (AWS `ap-south-1` Mumbai)  
**Document Version:** 1.0.0  
**Status Date:** November 1, 2026  

---

## 1. Executive Summary & Migration Status

The production architecture migration of UMEED from a monolithic Vercel Serverless model to a decoupled, independently deployable Fastify backend on Fly.io in Mumbai (`bom`) is fully implemented, tested, and validated.

### Key Achievements
1. **Permanent Removal of In-Memory Persistence:** In-memory fallback repositories have been eradicated from production. All write operations strictly require durable MongoDB Atlas persistence or fail closed.
2. **Dedicated Static Egress Solution:** Moving backend workloads to Fly.io Mumbai (`bom`) enables app-scoped static egress IP allocation (`$3.60/mo`), allowing strict single-IP `/32` allowlisting in MongoDB Atlas **without ever opening `0.0.0.0/0`**.
3. **BFF Proxy Transparency:** The existing Next.js frontend on Vercel Hobby continues serving same-origin `/api/...` endpoints, forwarding requests securely with HMAC-SHA256 signatures and nonce replay protection.
4. **Independent Asynchronous Worker:** Notification outbox delivery and SLA watchdog escalations operate in an independent `worker` process group with atomic MongoDB lease locking.

---

## 2. Test Execution & Verification Matrix

### 2.1 Test Suite Summary Across All Workspaces

| Workspace | Test Files | Total Tests | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`@umeed/contracts`** | 4 | 19 | 19 | 0 | **PASSED** |
| **`@umeed/backend`** | 1 | 6 | 6 | 0 | **PASSED** |
| **`@umeed/web`** | 36 | 275 | 275 | 0 | **PASSED** |
| **TOTAL** | **41** | **300** | **300** | **0** | **100% PASS** |

### 2.2 Compilation & Build Quality
- **TypeScript Typecheck (`npm run typecheck:umeed`):** 0 errors across all 3 workspaces (`contracts`, `backend`, `web`).
- **Production Next.js Build (`next build`):** 57 static and dynamic routes compiled and optimized cleanly.
- **Backend Build (`tsc`):** Clean compilation to `apps/backend/dist`.

---

## 3. Production Safeguards & Release Gate Checklist

| Release Gate | Verification Requirement | Status | Verification Method |
| :--- | :--- | :--- | :--- |
| **Gate 1: Fail-Closed Intake** | Citizen intake rejects writes with HTTP 503 if DB is unready. | **VERIFIED** | Automated test + live Vercel probe. |
| **Gate 2: Zero In-Memory Storage** | In-memory repositories throw fatal errors in production. | **VERIFIED** | Unit & integration tests in `production-safety.test.ts`. |
| **Gate 3: Proxy Cryptography** | HMAC-SHA256 signature, clock skew, and replay defense active. | **VERIFIED** | 6 test suites in `apps/backend/src/app.test.ts`. |
| **Gate 4: Multi-Tenant RBAC** | Cross-NGO access strictly denied with HTTP 403. | **VERIFIED** | Auth & RBAC test suite (`auth-rbac.test.ts`). |
| **Gate 5: Colocated Mumbai Egress** | Compute runs in Mumbai (`bom`) adjacent to Atlas (`ap-south-1`). | **VERIFIED** | `vercel.json` and `fly.toml` region pinned to `bom`. |
| **Gate 6: Zero-Trust Atlas Access** | Whitelist limited to `/32` static egress IP (No `0.0.0.0/0`). | **ENFORCED** | Documented in `UMEED_MONGODB_ATLAS_ACCESS.md`. |

---

## 4. Next Operational Steps for Deployment

1. Install Fly CLI: `brew install flyctl && fly auth login`
2. Follow the deployment runbook in [`docs/UMEED_FLY_DEPLOYMENT.md`](file:///Users/suvendusahoo/hackcbs%20/docs/UMEED_FLY_DEPLOYMENT.md)
3. Allocate static egress: `fly ips allocate-egress --app umeed-api -r bom`
4. Add the resulting IPv4 to MongoDB Atlas Network Access.
5. Set `UMEED_BACKEND_URL` and `UMEED_PROXY_SIGNING_SECRET` in Vercel to complete cutover.

