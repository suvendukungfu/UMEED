# UMEED Foundation Architecture Decisions (Phase 1)

This document records the foundational engineering decisions established for UMEED during Phase 1.

---

## 1. Runtime & Package Management

- **Runtime Target**: Node.js `v24 LTS` (`.nvmrc`).
  - *Rationale*: Node 25 has reached End-Of-Life. Node 24 is stable, current LTS, and fully supported by Next.js 15, React 19, and MongoDB Node driver.
- **Package Manager**: Standardized strictly on `npm`.
  - *Rationale*: Eliminates lockfile drift between `pnpm-lock.yaml`, `bun.lockb`, and `package-lock.json`.
- **Repository Structure**: npm workspaces with `packages/contracts` and `apps/web`.
  - *Rationale*: Minimizes overhead while allowing the shared canonical incident contract to be referenced directly by the Next.js app and future client libraries without publishing to a remote registry.

---

## 2. Fail-Soft Environment Configuration

- **Central Typed Access**: `src/lib/config/env.ts` using Zod.
- **Optional External Integrations at Boot**: External vendor keys (`GEMINI_API_KEY`, `MEKO_API_KEY`, `IOMETE_PAT`) are typed as optional during initial boot.
  - *Rationale*: The core application shell, citizen reporting forms, human verification screens, and health check endpoints must boot and operate reliably even if external AI or analytics vendors are offline or unconfigured.
- **Just-in-Time Assertion**: When an integration is specifically invoked (e.g. calling Gemini multimodal triage in Phase 3), `requireIntegrationConfig(["GEMINI_API_KEY"], "Gemini")` validates presence and raises a helpful error.

---

## 3. Database Abstraction (MongoDB Atlas)

- **Connection Pooling & Hot Reloading**: A cached client promise is maintained in `global._mongoClientPromise` during development to prevent connection exhaustion during Next.js App Router hot reloads.
- **Decoupled Application Liveness**: `GET /api/health` does not crash if MongoDB Atlas is unconfigured or unreachable. It returns `status: "healthy"` for the application core, while reporting `database: { status: "unconfigured" | "unreachable" }`.
- **Zero Credential Leaks**: Connection strings, user passwords, and internal connection options are strictly sanitized and never exposed in error responses or logs.

---

## 4. Canonical Incident Contract & Serialization Decisions

- **Shared Schema (`packages/contracts`)**: Versioned schema `1.0.0` defined using Zod.
- **Source Types Supported**: `citizen_report` and `social_media_discovery`.
- **Python / Pydantic Compatibility**:
  - Timestamps are formatted as ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Missing coordinates and addresses use explicit `null` rather than omitted keys.
  - Confidence values are floating-point numbers normalized between `0.0` and `1.0`.
- **Idempotency Guarantee**: Ingestion enforces compound uniqueness on `{ source_type, source_reference }` at the database index layer in Phase 2.

---

## 5. Security & Privacy Guardrails

- **Zero Client-Side Secret Exposure**: No private vendor tokens or MongoDB connection URIs use the `NEXT_PUBLIC_` prefix.
- **Beneficiary PII Sanitization**: `src/lib/security` provides telephone and email scrubbing to prevent vulnerable individuals' sensitive details from leaking into shared agent memories or analytics.
- **No Autonomous Dispatch**: AI analysis is categorized as recommendations, preserving mandatory human coordinator approval for responder dispatches.

