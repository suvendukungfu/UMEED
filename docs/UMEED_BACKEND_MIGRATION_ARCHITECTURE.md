# UMEED — Backend Migration Architecture & Topology Specification

**System Architecture:** Decoupled Frontend (Vercel Hobby) + Humanitarian Operations Backend (Fly.io Mumbai `bom`)  
**Target Cluster:** MongoDB Atlas AWS `ap-south-1` (Mumbai)  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Architectural Motivation & Problem Definition

The forensic storage audit of the UMEED platform identified that hosting database-connected Serverless Functions on Vercel Hobby resulted in a critical networking barrier:
1. **Dynamic Egress IP Pool:** Vercel Hobby allocates dynamic outbound IP addresses across AWS regions. Because static egress IPs require Vercel Pro with the Static IPs add-on or Enterprise Secure Compute, MongoDB Atlas ingress access could only be enabled by whitelisting `0.0.0.0/0` ("Allow Access from Anywhere").
2. **Security Constraint:** Opening Atlas to `0.0.0.0/0` exposes the database ingress TLS proxy to internet-wide brute force, credential stuffing, and scanning attacks.
3. **Regional Colocation:** While pinning `regions: ["bom1"]` in `vercel.json` localized function execution to Mumbai, it did not assign fixed egress IP addresses.
4. **Target Resolution:** Moving operational backend workloads to **Fly.io in Mumbai (`bom`)** provides **app-scoped dedicated static egress IPs** (`fly ips allocate-egress --app umeed-api -r bom`) that persist across deployments and machine restarts. These exact addresses can be whitelisted in MongoDB Atlas without ever compromising firewall boundaries.

---

## 2. High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC CITIZENS & HUMANITARIAN ACTORS          │
│                (Web Browsers, Mobile Viewports, External Coordinators)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS (Same-Origin)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VERCEL HOBBY (Frontend Tier)                     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Next.js 15 App Router Frontend                                        │  │
│  │ - Static Assets, Layouts, UI Components, Client Forms                 │  │
│  │ - Public Routes (/report, /track, /auth/sign-in)                      │  │
│  │ - Role Portals (/app/citizen, /app/coordinator, /app/ngo, /app/admin) │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Internal Invocation                  │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │ API BFF Proxy (/api/*)                                                │  │
│  │ - Computes HMAC-SHA256 signature (Method, Path, Timestamp, Nonce,     │  │
│  │   Body Hash)                                                          │  │
│  │ - Forwards session cookies, client IP, correlation IDs                │  │
│  │ - ZERO direct MongoDB connections                                     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ HTTPS + HMAC-SHA256 Signature
                                       │ (Vercel Mumbai bom1 -> Fly Mumbai bom)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLY.IO APPLICATION: umeed-api (Mumbai bom)              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Process Group: api (Fastify HTTP Service :8080)                       │  │
│  │ - HMAC Proxy Auth Verification & Replay Protection                    │  │
│  │ - Session Authentication & RBAC Policy Enforcement                    │  │
│  │ - Domain Modules: Auth, Incidents, Cases, Assistance Engine,          │  │
│  │   Responders, NGOs, Facilities, Discovery                             │  │
│  │ - Health & Readiness Probes (/health, /ready)                         │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Shared App Network                   │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │ Process Group: worker (Background Asynchronous Engine)                │  │
│  │ - Notification Outbox Processor (Atomic lease lock, retries)          │  │
│  │ - Watchdog Scanner (Overdue distress & SLA escalation)                │  │
│  │ - Gemini Multimodal Triage Jobs                                       │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │ Fly.io App-Scoped Static Egress Allocation (Region: bom)              │  │
│  │ - Persistent Dedicated IPv4 + IPv6 Egress Pair                        │  │
│  │ - Shared across API and Worker containers in Mumbai                   │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ Stable Whitelisted IP Egress
                                       │ TLS 1.2+ / Port 27017
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               MONGODB ATLAS (AWS ap-south-1 Mumbai Replica Set)             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Project Network Access IP Access List                                 │  │
│  │ - ALLOW ONLY: Fly.io Verified App-Scoped Static Egress IP (/32)       │  │
│  │ - DENY: 0.0.0.0/0 (Strictly Blocked)                                  │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ SCRAM-SHA-256 Auth                   │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │ Database: umeed_db                                                    │  │
│  │ - Collections: users, sessions, incidents, cases, assignments,        │  │
│  │   ngos, facilities, notification_outbox, audit_events                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Boundaries & Responsibilities

| Responsibility | Frontend (Vercel) | Backend API (Fly.io) | Backend Worker (Fly.io) | Primary Database (Atlas) |
| :--- | :--- | :--- | :--- | :--- |
| **HTML/CSS/JS Delivery** | **Owner** | None | None | None |
| **User Navigation & Forms** | **Owner** | None | None | None |
| **BFF Request Proxying** | **Owner** | None | None | None |
| **HMAC Signature Generation** | **Owner** | None | None | None |
| **HMAC Signature Verification** | None | **Owner** | None | None |
| **Session State & Cookies** | Forwards cookie | **Owner** (Validates token) | None | Stores `sessions` |
| **RBAC & Authorization** | None (Preserves headers)| **Owner** (Enforces roles) | None | Stores `users`, `roles` |
| **Incident Ingestion** | Proxies payload | **Owner** (Durable write) | None | Stores `incidents` |
| **Case Lifecycle & Matching** | Proxies requests | **Owner** (State machine) | None | Stores `cases` |
| **Notification Delivery** | None | Enqueues to Outbox | **Owner** (Provider dispatch)| Stores `outbox` |
| **SLA & Escalation Watchdog** | None | None | **Owner** (Periodic scanner) | Updates `incidents` |
| **Direct Database Connection** | **FORBIDDEN (0%)** | **Authorized Pool** | **Authorized Pool** | **Host** |

---

## 4. Key Architectural Guarantees

1. **Zero Data Loss Guarantee:** Distress submissions to `/api/incidents/ingest` are proxied with HMAC validation directly to the Fastify backend, which performs a durable write to MongoDB Atlas before emitting a public reference and confidential tracking token.
2. **Permanent In-Memory Elimination:** No in-memory fallback repositories exist in production. If the backend cannot write to MongoDB Atlas, it returns HTTP 503 `SERVICE_UNAVAILABLE`.
3. **Firewall Boundary Integrity:** MongoDB Atlas is never opened to `0.0.0.0/0`. Only the verified Fly.io app-scoped egress IP address in Mumbai (`bom`) is permitted.
4. **BFF Proxy Transparency:** Frontend browser code continues calling `/api/...` on the same origin. No client-side code modification or CORS re-architecture is required.

