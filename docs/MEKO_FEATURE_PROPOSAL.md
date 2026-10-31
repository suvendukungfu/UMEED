# UMEED — Meko Feature Proposal: Evidence-Scoped, Freshness-Aware Knowledge Promotion

**Document Version**: 1.0.0  
**Authors**: UMEED Systems Architecture Team (HackCBS 9.0 Track A)  
**Target Recipient**: Meko Platform Engineering Team (`mekodata.ai`)  
**Proposal Category**: Protocol & Core Memory Schema Enhancement  

---

## 1. Context & Motivation

During our deep integration of the Meko MCP server (`https://mcp.mekodata.ai/mcp`) into UMEED's humanitarian assistance platform, we leveraged Meko's core capabilities:

- Streamable HTTP lifecycle (`initialize`, `Mcp-Session-Id`, `tools/list`, `DELETE`).
- Datapack isolation (`umeed-build` vs `umeed-product-context`).
- Hybrid memory search (`memory_search`).
- Writer-attributed updates and deletion (`memory_update`, `memory_delete_by_id`).
- One-way knowledge promotion (`memory_promote`).

In production-grade humanitarian and mission-critical domains, operational memories must not be treated as eternally valid static facts. Ground truth evolves: seasonal protocols change, NGO capabilities update, and older procedures become superseded.

We propose an enhancement to the Meko memory and promotion schema: **Evidence-Scoped, Freshness-Aware Promotion**.

---

## 2. Proposed Schema Extension

### 2.1 Current vs. Proposed Capability

| Dimension | Current Meko Functionality | Proposed Enhanced Functionality |
| --- | --- | --- |
| **Memory Text** | Unstructured text string (max 2000 chars) | Text string + optional structured evidence block |
| **Promotion Tool** | `memory_promote(memory_ids, conversation_id, agent_id, datapack_id)` | Accepts optional promotion metadata envelope |
| **Lifecycle & Freshness** | Indefinite until manual deletion | Optional `valid_until` timestamp, auto-staleness scoring |
| **Provenance** | `agent_id` attribution string | Cryptographic or operational evidence reference (`evidence_uri`, `case_reference`) |
| **Supersession** | Manual deletion and re-add | Explicit `supersedes_memory_id` link |

### 2.2 Proposed Schema: `MekoMemoryMetadata`

```typescript
export interface MekoMemoryMetadata {
  /**
   * Domain reference establishing empirical basis (e.g. case reference, incident ID)
   */
  evidence_reference?: string;

  /**
   * Authorized human reviewer or coordinator ID who confirmed the lesson
   */
  reviewed_by?: string;

  /**
   * ISO 8601 timestamp of human verification
   */
  verified_at?: string;

  /**
   * Explicit scope of applicability (e.g. geographic district, incident domain)
   */
  applicability_scope?: {
    domain?: string;
    region?: string;
    jurisdiction?: string;
  };

  /**
   * Freshness expiry or mandatory review date
   */
  expires_at?: string;

  /**
   * Pointer to prior memory ID that this new promoted lesson supersedes
   */
  supersedes_memory_id?: string;

  /**
   * Flag indicating if the memory is currently under operational dispute or review
   */
  lifecycle_status?: "ACTIVE" | "PENDING_REVIEW" | "SUPERSEDED" | "DISPUTED";
}
```

---

## 3. Tool Signature Enhancement

### Proposed `memory_promote` Extension

```json
{
  "name": "memory_promote",
  "description": "Promotes private memories into shared datapack knowledge with optional governance metadata.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "memory_ids": { "type": "array", "items": { "type": "string" } },
      "conversation_id": { "type": "string" },
      "agent_id": { "type": "string" },
      "datapack_id": { "type": "string" },
      "metadata": {
        "type": "object",
        "properties": {
          "evidence_reference": { "type": "string" },
          "reviewed_by": { "type": "string" },
          "expires_at": { "type": "string", "format": "date-time" },
          "supersedes_memory_id": { "type": "string" }
        }
      }
    },
    "required": ["memory_ids", "conversation_id"]
  }
}
```

---

## 4. Architectural Benefits

1. **Self-Pruning Vector Indices**: Outdated or superseded memories automatically down-weighted in similarity calculations.
2. **Auditability for Regulated Domains**: Every promoted piece of shared knowledge links back to a verifiable case outcome.
3. **Transparent Governance**: Teams can inspect which human reviewer authorized a shared guideline.
4. **Backward Compatibility**: All new fields remain strictly optional, preserving 100% compatibility with existing Meko MCP clients.
