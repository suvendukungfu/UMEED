# UMEED Environment Audit (Phase 0)

**Date**: 2026-10-31  
**Project**: UMEED (HackCBS 9.0)  
**Host Environment**: macOS (Darwin arm64)

---

## 1. Toolchains & Runtimes

| Component | Status | Details / Path |
|---|---|---|
| **Node.js** | Installed | `v25.9.0` |
| **npm** | Installed | `v11.12.1` |
| **pnpm** | Installed | `/opt/homebrew/bin/pnpm` |
| **bun** | Installed | `/opt/homebrew/bin/bun` |
| **Python** | Installed | `Python 3.14.8` |
| **FFmpeg** | Installed | `/opt/homebrew/bin/ffmpeg` (ready for Phase 8 frame/audio extraction) |
| **Docker** | Not Found | Not in PATH (Local testing will rely on direct Node/Python runners) |
| **Local MongoDB** | Installed | `/opt/homebrew/bin/mongod` (Atlas connection recommended for production) |

---

## 2. MCP Server Configuration & Meko Status

Inspected `~/.gemini/config/mcp_config.json`:
- **Currently Configured MCP Servers**:
  - `cloudrun`
  - `gke-oss`
  - `dart-mcp-server`
  - `firebase-mcp-server`
  - `genkit-mcp-server`
  - `pencil`
  - `notebooks`
  - `visualization`
  - `devrelay-gateway`
  - `tiger`
  - `Neon`
- **Meko MCP Connection**: **NOT CONNECTED**
  - Meko is currently absent from `mcp_config.json`.
  - To enable Meko MCP in Antigravity per project requirements, the following block must be added to `~/.gemini/config/mcp_config.json` with a valid Meko API key:
    ```json
    "meko": {
      "serverUrl": "https://mcp.mekodata.ai/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MEKO_API_KEY",
        "User-Agent": "meko-mcp-installer/1.0"
      }
    }
    ```

---

## 3. External Integration Credentials Status

A secure check of environment variables was performed (inspecting presence only; no secret values displayed):

| Credential Variable | Status | Role | Requirement |
|---|---|---|---|
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | `NOT_SET` | Multimodal triage & intake | Critical for Phase 3; fallback to manual triage when absent |
| `MONGODB_URI` / `MONGO_URI` | `NOT_SET` | Primary operational store | Critical for Phase 1-5; local fallback / `.env.local` required |
| `MEKO_API_KEY` | `NOT_SET` | Agent memory & coordinator preferences | Required for Phase 6 proof-of-concept |
| `IOMETE_TOKEN` / `IOMETE_URL` | `NOT_SET` | Historical impact analytics event stream | Required for Phase 7; outbox queue ensures non-blocking failure |
| `VULTR_API_KEY` | `NOT_SET` | Cloud deployment | Required for Phase 9 live deployment |

---

## 4. Key Security & Architectural Risks Identified

1. **Credential Exposure Risk**: Next.js applications can inadvertently expose environment variables if prefixed with `NEXT_PUBLIC_`. All database URIs and vendor API keys must remain strictly server-side (`src/lib/config`).
2. **External Service Resilience**: If Gemini, Meko, or IOMETE are temporarily unreachable or unauthenticated, the core reporting, human review, and NGO dispatch workflow must remain 100% operational.
3. **Medical & Dispatch Guardrails**: AI triage must never autonomously diagnose medical conditions or trigger dispatches. High-risk reports must mandate human verification.
4. **Data Isolation & Beneficiary Privacy**: No Personally Identifiable Information (PII) of vulnerable individuals (names, contact numbers, exact sensitive coordinates) may be leaked to external analytics (IOMETE) or shared agent memory (Meko).

