# UMEED — Meko Runtime Integration Architecture (Track A)

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph UMEED Core
        Inc[Citizen Incident] --> Tri[Gemini Triage]
        Tri --> Rev[Coordinator Review]
        Rev --> Case[Assistance Case]
    end

    subgraph Meko Context Engine
        Client[MekoHttpClient (apps/web/src/lib/ai/meko)]
        Client -->|HTTP/2 JSON-RPC 2.0| Cloud[Meko Cloud Server: https://mcp.mekodata.ai/mcp]
        
        Cloud --> DP_Prod[(umeed-product-context)]
        Cloud --> DP_Build[(umeed-build)]
    end

    subgraph Product Agents
        MatchAgent[Matching Agent]
        FollowAgent[Follow-Up Agent]
        CuratorAgent[Knowledge Curator]
    end

    Case --> MatchAgent
    MatchAgent -->|Pre-Reasoning Recall| Client
    Client -->|memory_search| DP_Prod

    Case --> FollowAgent
    FollowAgent -->|Lesson Recall| Client

    Case --> CuratorAgent
    CuratorAgent -->|Propose Lesson| Coord[Human Coordinator]
    Coord -->|Approve & Sign-Off| CuratorAgent
    CuratorAgent -->|memory_add / memory_promote| Client
```

---

## 2. Separate Datapack Scopes (Requirement A2 & Section 4)

UMEED maintains an inviolable boundary between development context and operational product intelligence:

### 2.1 Build Datapack (`umeed-build`)

- **Audience**: Team coding agents (Antigravity, Cursor, Claude Code).
- **Scope**: Engineering architecture decisions, schema invariants, integration gotchas, and sprint notes.
- **Privacy Rule**: Never contains live beneficiary information, incident references, or credentials.
- **Role**: Shared with team members as Maintainers to support Check T.

### 2.2 Product Datapack (`umeed-product-context`)

- **Audience**: UMEED runtime services and product agents.
- **Scope**: Approved, de-identified operational lessons learned from completed assistance journeys.
- **Privacy Rule**: Strictly sanitized via `validateOperationalMemoryText`. Strips names, phone numbers, exact addresses, GPS, and tracking tokens.
- **Access**: Accessed exclusively via server-side `MekoHttpClient` with scoped `datapack_id`.

---

## 3. Product Agents Specification (Section 6 & 7)

### 3.1 Matching Agent (`umeed_matching_agent`)

- **Trigger**: Assistance case created from an approved incident.
- **Action**: Queries `memory_search` against `umeed-product-context` before evaluating NGO candidates.
- **Context Injection**: Infuses retrieved lessons into assistance requirements. For example, if an animal trauma report is matched, the recalled lesson instructs the engine that initial rescue stabilization and subsequent surgical veterinary treatment require independent dispatch cycles.
- **Transparency**: Outputs explicit `MemoryInfluenceCitation` records showing exact memory quotes and relevance scores.
- **Truth Boundary**: Current NGO availability and capacity are always evaluated against MongoDB registry truth; historical memory is never treated as proof of current availability.

### 3.2 Follow-Up Agent (`umeed_followup_agent`)

- **Trigger**: Responder logs field arrival or immediate emergency intervention.
- **Action**: Evaluates unresolved assistance needs against previous operational procedures.
- **Recommendation**: Proposes whether a secondary dispatch cycle, coordinator escalation, or specialized in-patient transfer is required.
- **Boundary**: All follow-up dispatches require explicit human coordinator approval.

### 3.3 Knowledge Curator (`umeed_curator_agent`)

- **Trigger**: Case resolved with evidence documentation.
- **Action**: Synthesizes a de-identified operational learning candidate.
- **Coordinator Workflow**:
  1. Displays exact proposed memory text in the review UI.
  2. Identifies the supporting case reference and intervention evidence.
  3. Coordinator signs off with decision notes.
  4. Stores private memory via `memory_add`.
  5. Explains shared visibility and prompts for confirmation before calling `memory_promote`.

---

## 4. Context-Dependent Demonstration Story (Requirement A3 & Section 8)

### Case 1 (Learning Generation)

- **Incident**: Stray canine hit by vehicle in Rohini after midnight (`UMD-ANM-001`).
- **Initial Dispatch**: Stray Relief NGO ambulance arrives and provides field wound dressing.
- **Follow-Up Gap**: Canine has a compound pelvic fracture requiring orthopedic surgery; the initial shelter lacks nighttime surgical theater.
- **Resolution**: Case Coordinator routes animal to Delhi Veterinary Trauma Center.
- **Curated Lesson**:
  > *"Animal rescue and veterinary follow-up are separate assistance capabilities. For after-hours injury reports, coordinators should check whether a separate veterinary provider is required and revalidate current service availability."*
- **Persistence**: Saved via `memory_add` and promoted to shared knowledge via `memory_promote`.

### Case 2 (Context Changes the Outcome — A1 Experiment)

- **Test Incident**: Identical severe trauma canine report submitted after midnight (`UMD-ANM-002`).
- **Run A (Meko OFF)**:
  - System queries only static NGO registry.
  - Matches single animal rescue ambulance.
  - Leaves secondary surgical care unaddressed until manual field escalation occurs.
- **Run B (Meko ON)**:
  - System executes pre-reasoning recall (`memory_search`).
  - Retrieves the promoted animal rescue + veterinary lesson (Score: 0.89).
  - Automatically splits assistance requirements into:
    1. Emergency field rescue & stabilization (`animal_rescue`)
    2. Surgical veterinary follow-up (`veterinary_surgery`)
  - Evaluates MongoDB registry for both capabilities simultaneously and recommends a coordinated dual-NGO response plan with explainable memory citations.
