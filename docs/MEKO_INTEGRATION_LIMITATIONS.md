# UMEED — Meko Integration Limitations & Upstream Constraints

**Evaluation Phase**: Phase 6.0 Integration Spike  
**Challenge Target**: HackCBS 9.0 Track A  
**Document Purpose**: Transparently record upstream platform constraints, developer friction, and runtime trade-offs.

---

## 1. Upstream Platform Constraints

### 1.1 Custom Application SDK Status

- **Official Documentation Notice**: Meko's Quick Start (`https://docs.mekodata.ai/quick-start/`) explicitly notes:
  > *"Full programmatic integration into custom AI applications is currently under development."*
- **Impact**: There is currently no official npm/Node.js SDK (`@meko/sdk`). Custom applications must build an MCP-over-HTTP bridge speaking JSON-RPC 2.0 (`POST https://mcp.mekodata.ai/mcp`).
- **UMEED Solution**: We engineered `MekoHttpClient` (`apps/web/src/lib/ai/meko/client.ts`) with bounded timeouts, schema parsing, correlation IDs, and tool allowlists.

### 1.2 In-Flight Latency Characteristics

- **`memory_add`**: Incurs ~10–12 seconds of latency per invocation due to synchronous vector embedding generation and server-side semantic extraction.
- **`memory_search`**: Incurs ~2–5 seconds per query for hybrid retrieval (BM25 + pgvector + entity boost).
- **Impact**: Synchronous UI operations must use optimistic or asynchronous loading patterns to avoid blocking citizen or coordinator workflows.

### 1.3 One-Way Eviction on `memory_promote`

- Calling `memory_promote(memory_ids=[...])` permanently moves private memories from mem0 storage into the datapack's shared knowledge base.
- Once promoted, attempts to invoke `memory_update` or `memory_delete_by_id` fail with HTTP 409 (`memory_is_promoted`).
- **Correction / Forget Limitation**: For already-promoted knowledge, deletion requires direct knowledge base document deletion or manual portal management.

### 1.4 Quota & Rate Limiting

- Free and Standard tiers enforce lifetime and monthly rate caps. Exceeding limits returns `free_tier_limit_reached`.
- The UMEED client catches this error specifically via `MekoRateLimitError` and degrades gracefully without crashing the coordination engine.

---

## 2. Active Blocker: Meko Authentication Failure (HTTP 401)

### Blocker Description

- Live HTTP probes against `https://mcp.mekodata.ai/mcp` using candidate token `mko_tkn_gljvb7vk` consistently return:

  ```json
  {
    "error": "invalid_token",
    "error_description": "Authentication failed. The provided bearer token is invalid, expired, or no longer recognized by the server."
  }
  ```

- Per challenge guidelines:
  1. No live calls can be faked or simulated.
  2. The system must stop and report the authentication failure.
  3. Live Phase 6.1 agent binding is gated on provisioning a valid, active token.

### Action Plan for Challenge Mentors / User

1. Open the [Meko Portal](https://cloud.mekodata.ai/) → **Settings → API Keys**.
2. Revoke the expired key and generate a fresh key named `umeed-hackcbs-prod`.
3. Add the token to `apps/web/.env.local`:

   ```bash
   MEKO_API_KEY="mko_tkn_..."
   MEKO_PRODUCT_DATAPACK_ID="5c3fe678-a090-48da-b1f5-22b33bd58ad5"
   MEKO_BUILD_DATAPACK_ID="<umeed-build-uuid>"
   ```

4. Re-run `client.runCanaryTest()` to confirm live roundtrip access.
