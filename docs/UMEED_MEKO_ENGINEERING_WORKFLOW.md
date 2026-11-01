# UMEED — Meko Engineering Intelligence and AI Agent Workflow
**Version**: 2.0.0  
**Classification**: Developer Productivity & AI Workflow Standard  

---

## 1. Meko MCP Integration Boundary

UMEED leverages Meko for shared engineering intelligence, architectural decision records, and multi-agent development continuity.

### Architectural Invariants:
1. **Engineering Context, Not Operational Database**: Meko is used exclusively for developer documentation, ADRs, and cross-agent context. MongoDB Atlas remains the sole source of truth for all operational records (users, incidents, cases, assignments).
2. **Zero Beneficiary Data in Engineering Memory**: Real citizen names, phone numbers, addresses, coordinates, or medical descriptions are NEVER uploaded to Meko.
3. **No Secret Storage**: API keys, passwords, and tokens are strictly excluded from Meko memories.
4. **Offline Resilience**: When the Meko MCP server is not reachable in the local development environment, the platform operates seamlessly using repository documentation.

---

## 2. Specialized Agent Roles

1. **UMEED Architect**: Owns domain boundaries, data models, and canonical contracts (`packages/contracts`).
2. **UMEED Backend**: Owns API route handlers, repositories, transactional boundaries, and database indexes.
3. **UMEED Security**: Owns unified authentication, server-enforced RBAC, tenant isolation, and DPDP privacy guardrails.
4. **UMEED Partner Operations**: Owns organization onboarding, facility registry, verification states, and capacity declarations.
5. **UMEED Frontend**: Owns responsive UI/UX, unified application shell, and WCAG 2.2 AA accessibility.
6. **UMEED AI & Integrations**: Owns Gemini multimodal triage, advisory boundaries, and external gateways.
7. **UMEED QA & Reliability**: Owns contract tests, regression suites, and production release gating.
