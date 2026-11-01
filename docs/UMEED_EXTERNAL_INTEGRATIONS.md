# UMEED — External Integrations and Provider Contracts
**Version**: 2.0.0  
**Classification**: Systems Integration Standard  

---

## 1. Integrations Inventory

| Service | Provider | Environment Variable | Missing Credential Behavior |
| :--- | :--- | :--- | :--- |
| **Primary Database** | MongoDB Atlas | `MONGODB_URI` | In production: Fails closed (HTTP 500/503) unless `ALLOW_INMEMORY_FALLBACK=true` |
| **Multimodal Triage** | Google Gemini (2.5 Flash) | `GEMINI_API_KEY` | Safe fallback to `PROVIDER_UNAVAILABLE` and manual coordinator triage |
| **Notification Gateway** | Multi-channel Webhook / SMS | `NOTIFICATION_WEBHOOK_URL` | Returns `NOT_CONFIGURED`; never claims false delivery |
| **Postal Geolocation** | India Post API (Zero-Key) | None (Public statutory API) | Resolves PIN code to district and post office; falls back to Delhi static mapping |
| **Social Discovery** | RSS / Atom / Web Crawler | `CRAWLER_API_KEY` | Ingests external distress signals into candidate review queue |
| **Context Learning** | Meko MCP Gateway | MCP Runtime | When MCP is offline, falls back to repository documentation |

---

## 2. Invariant Rules for External Gateways

1. **No Silent Mocking in Production**: When external credentials are absent, the application reports `NOT_CONFIGURED`.
2. **Transparent Operational Health**: Health endpoints (`/api/health`) reflect true service status (`configured: false`).
3. **Fail-Closed Security**: Network egress strictly prohibits SSRF through IP allowlisting and internal network range blocking (`10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`).
