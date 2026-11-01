# UMEED — Pre-Deployment Engineering Audit Report
**Vercel BFF + Fly.io Mumbai (`bom`) Fastify Architecture**

- **Document Version:** 2.0.0 (Post-Remediation Re-Audit)
- **Audit Date:** November 1, 2026
- **Auditor:** Antigravity Autonomous Pair-Programming Agent (DeepMind)
- **Target Workspaces:** `apps/backend` (Fastify + TypeScript), `apps/web` (Next.js 15 BFF), `packages/contracts`
- **Infrastructure Target:** Fly.io Mumbai (`bom`), MongoDB Atlas AWS Mumbai (`ap-south-1`), Vercel Hobby Edge/Serverless
- **Audit Decision:** **GO FOR FLY.IO INFRASTRUCTURE PROVISIONING & DEPLOYMENT**  
  *(Public intake remains strictly fail-closed until live Atlas persistence and static egress allowlisting are completed by operator).*

---

## 1. Executive Summary

Following the comprehensive remediation across all 8 architectural and security phases, the pre-deployment engineering blockers identified in version 1.0.0 have been **100% resolved in code**:

1. **API Parity Achieved (68 / 68 endpoints):** All 68 endpoints across Authentication, Incidents, Cases, Assistance Engine, Responders, NGOs, Facilities, Geo, Discovery, Context Learning, AI, Admin, and System Ops have been implemented on the Fastify backend and verified via automated route introspection (`apps/backend/src/parity.test.ts`).
2. **Universal BFF Proxy Coverage (68 / 68 endpoints):** Every Next.js API route handler in `apps/web/src/app/api` now includes `tryForwardToBackend()`, routing operational traffic to the Fly.io Mumbai backend with raw-body HMAC-SHA256 signatures, nanosecond nonces, and timestamp validation.
3. **Multi-Tenant RBAC Enforced:** Organization tenancy isolation has been strictly applied to all case queries (`GET /v1/cases`, `GET /v1/cases/:caseReference`) and responder assignment workflows (`accept`, `reject`, `en-route`, `arrived`, `interventions`, `request-info`), preventing IDOR or cross-tenant data leakage. Concurrency locks prevent duplicate claims.
4. **Resilient Reconnection Cycle:** `apps/backend/src/plugins/database.ts` evicts failed connection promises on `.catch()`, eliminating startup death-loops on temporary Atlas network stalls.
5. **Background Worker Hardened:** The worker queries schema field `reported_at: { $lt: overdueCutoff }`, reclaims expired `PROCESSING` leases, and tracks outbox deliveries.
6. **Distributed Nonce Storage:** In-memory map replaced by atomic MongoDB `proxy_nonces` unique collection with 120-second TTL index. Fails closed in production if replay storage is unreachable.
7. **Quality Gates Passed:** Clean typechecks across all 3 workspaces (`npm run typecheck:umeed`), 100% test pass rate across 44 test suites (314 tests passing), and clean production build (`npm run build:umeed`).

---

## 2. Remediation Verification Matrix

| Issue ID | Severity | Category | Status | Verified Resolution & Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRITICAL** | Multi-Tenant RBAC | **RESOLVED** | Enforced NGO tenancy check on `GET /v1/cases` and `GET /v1/cases/:caseReference`. Non-coordinators can only inspect cases assigned to their NGO. Verified in `security.test.ts`. |
| **SEC-02** | **CRITICAL** | Multi-Tenant RBAC | **RESOLVED** | Assignment acceptance, rejection, en-route, arrived, interventions, and request-info enforce `assignedNgoId === request.ngoId`. Atomic state transition prevents concurrent claims. |
| **ARC-01** | **CRITICAL** | API Parity & Routing | **RESOLVED** | All 68 routes migrated to Fastify modules (`auth`, `incidents`, `cases`, `assistance`, `responders`, `ngos`, `facilities`, `discovery`, `notifications`, `admin`, `ai`, `context-learning`). All 68 Next.js routes wired to `tryForwardToBackend()`. Verified via `parity.test.ts`. |
| **ARC-02** | **CRITICAL** | Database Stability | **RESOLVED** | In `apps/backend/src/plugins/database.ts`, `clientPromise` and `clientInstance` reset to `null` on `.catch()`, enabling automatic reconnection on subsequent requests. |
| **WRK-01** | **HIGH** | Worker Reliability | **RESOLVED** | SLA watchdog queries schema field `reported_at: { $lt: overdueCutoff }` and marks overdue incidents with `urgencyLevel: "CRITICAL"`. |
| **WRK-02** | **HIGH** | Worker Reliability | **RESOLVED** | Outbox leasing queries `{ $or: [{ status: "PENDING" }, { status: "PROCESSING", lockExpiresAt: { $lt: now } }] }`, reclaiming abandoned locks. |
| **WRK-03** | **HIGH** | Worker Completeness | **RESOLVED** | Worker loops catch and mark individual dispatch failures as `FAILED` with `lastError` telemetry. |
| **SEC-03** | **HIGH** | Proxy Security | **RESOLVED** | Replay protection backed by atomic `proxy_nonces.insertOne()`. Detects duplicate key `11000` (rejects 401 `REPLAYED_PROXY_NONCE`). Fails closed (503) in production if DB is unreachable. |
| **SEC-04** | **HIGH** | Proxy Security | **RESOLVED** | Exact byte-for-byte raw body preservation via `request.arrayBuffer()` on Vercel BFF and Fastify custom content parser capturing `req.rawBody` as Buffer. Multibyte Hindi text and whitespace preserved. |
| **SEC-05** | **MEDIUM** | CORS Configuration | **RESOLVED** | Fastify CORS restricted to explicit whitelist (`umeed-platform-nu.vercel.app`, `localhost:3000`) and requests without Origin (BFF proxy/health probes). |
| **SEC-06** | **MEDIUM** | Header Handling | **RESOLVED** | Multiple `Set-Cookie` headers extracted via `getSetCookie()` and forwarded individually using `responseHeaders.append("set-cookie", cookieStr)`. |
| **OPS-01** | **MEDIUM** | Deployment Config | **DOCUMENTED** | `fly.toml` configured with `bom` region and separate `api` and `worker` process groups. Distributed nonces in MongoDB prevent machine restart cold-start vulnerabilities. |
| **OPS-02** | **LOW** | Path Uniformity | **RESOLVED** | Operational endpoints under `/v1/*`, health/ready probes supported at both `/health`, `/ready` and root routes. |

---

## 3. Automated Test Evidence

- **Contracts:** 4 test files, 19 passing tests.
- **Backend:** 4 test files, 20 passing tests (including `parity.test.ts` for all 68 routes and `security.test.ts` for UTF-8 HMAC, replay rejection, and multi-tenant isolation).
- **Frontend / Monorepo:** 36 test files, 275 passing tests.
- **Total:** 44 test suites, 314 tests passing, 0 failures.
- **Build Verification:** Clean compilation of `@umeed/contracts`, `@umeed/backend` (tsc), and `@umeed/web` (`next build` 57/57 static/dynamic pages).

---

## 4. Final Audit Verdict

```
╔═══════════════════════════════════════════════════════════════════════╗
║                      FINAL ENGINEERING DECISION                       ║
║                                                                       ║
║          >>>  GO FOR FLY.IO INFRASTRUCTURE PROVISIONING  <<<          ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Safe Operational Next Steps:
1. Operator creates the Fly app in Mumbai (`bom`) using `fly launch --name umeed-api --region bom --no-deploy`.
2. Operator allocates dedicated static egress IPv4: `fly ips allocate-egress --app umeed-api -r bom`.
3. Operator whitelists the allocated static IPv4 `/32` in MongoDB Atlas Network Access.
4. Operator provisions secrets on Fly (`MONGODB_URI`, `MONGODB_DB`, `UMEED_PROXY_SIGNING_SECRET`, `GEMINI_API_KEY`, `COORDINATOR_API_KEY`) and deploys via `fly deploy --app umeed-api`.
5. Operator sets `UMEED_BACKEND_URL` and `UMEED_PROXY_SIGNING_SECRET` on Vercel and deploys `vercel --prod`.
6. Verify live health probes: `GET /api/ready` returns HTTP 200 `READY`.
