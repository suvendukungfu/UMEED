# UMEED — Phase 6.2 Security and Privacy Review

**Document Version**: 1.0.0  
**Evaluator**: Principal Product Security Engineer  
**Code Scope**: `apps/web/src/lib/ai/meko/`, `apps/web/src/features/context-learning/`, `apps/web/src/app/api/context-learning/`  
**Classification**: High-Risk Humanitarian Data & LLM Orchestration  

---

## 1. Threat Modeling & Scope

The integration of Meko contextual memory into UMEED introduces specific security and privacy attack surfaces:

1. **Server-Side Credential Exposure**: Accidental leakage of `MEKO_API_KEY` into Git, build logs, browser bundles, or external LLM prompts.
2. **PII Contamination of Vector Storage**: Storing citizen phone numbers, victim names, or precise GPS coordinates in shared vector indices.
3. **Cross-Tenant Context Pollution**: One coordinator or organisation accessing private case memories from unrelated incidents.
4. **Unauthorized Knowledge Promotion**: An unprivileged user promoting private or unvetted case notes into shared team knowledge.
5. **Prompt Injection & Adversarial Memory Poisoning**: Malicious reports attempting to alter matching logic via crafted memory content.

---

## 2. Security Controls & Implementations

### 2.1 Server-Only Credential Isolation

- `MEKO_API_KEY`, `MEKO_PRODUCT_DATAPACK_ID`, and `MEKO_BUILD_DATAPACK_ID` are defined exclusively in `ServerEnvSchema` (`apps/web/src/lib/config/env.ts`).
- `apps/web/.env.local` is set to `0600` permissions and verified Git-ignored by `.gitignore:70:.env.*`.
- The client library strictly passes `Authorization: Bearer <key>`. The string `MEKO_API_KEY` is never transmitted as a header name.
- Client-side code (`components/context-inspector/*`) has zero access to server secrets; all operations proxy through authenticated Next.js API route handlers.

### 2.2 PII Scrubbing & Memory Sanitization

Before any memory write (`memory_add`) or update (`memory_update`), `validateOperationalMemoryText` executes deterministic regex checks:

```typescript
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /(?:\+?91[\s-]?)?[6789]\d{9}\b/g,                        // Indian Mobile Numbers
  /\b\d{4}\s?\d{4}\s?\d{4}\b/g,                           // Aadhaar Numbers
  /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,                        // PAN Cards
  /trk_[a-zA-Z0-9_-]{16,}/g,                              // Citizen Tracking Tokens
  /\b2[89]\.\d{4,},\s?7[678]\.\d{4,}\b/g,                 // High-precision GPS
];
```

Any violation triggers an immediate, non-bypassable `MekoValidationError`.

### 2.3 Role-Based Access Control (RBAC)

- All context learning API endpoints (`/api/context-learning/memories`, `/api/context-learning/promote`, `/api/context-learning/experiment-a1`) mandate coordinator authorization (`verifyCoordinatorAuth`).
- Memory deletion (`DELETE /api/context-learning/memories`) and promotion (`POST /api/context-learning/promote`) require administrative/coordinator privileges and explicit user confirmation notes.

### 2.4 One-Way Promotion Safeguard

- In accordance with Meko architecture, `memory_promote` is irreversible: it moves memories into shared knowledge and purges their private draft.
- The UI Context Inspector enforces a two-step confirmation dialog that explicitly displays the full text and warns of the irreversible shared visibility before calling the promotion API.

### 2.5 Fail-Safe Graceful Degradation

- If Meko MCP endpoint is unconfigured, unreachable, or returns HTTP 4xx/5xx errors, the application safely degrades to baseline deterministic triage and matching without crashing or blocking humanitarian relief workflows.
- Zero mock responses are ever returned as live Meko responses.

---

## 3. Residual Risks & Next Steps

- **Atlas MongoDB Integration**: MongoDB URI is validated for template placeholders before attempting connections, falling back to in-memory repositories in test/demo environments.
- **Production Audit**: Continue monitoring rate limits and upstream Meko latency metrics during multi-region hackathon operations.
