# UMEED — Vercel BFF Proxy Architecture & Security Specification

**Proxy Architecture:** Server-Side Next.js Backend-for-Frontend (BFF)  
**Security Standard:** HMAC-SHA256 Request Signing & Nonce Replay Defense  
**Source Code:** `apps/web/src/lib/proxy/backend-proxy.ts`  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Architectural Purpose & Contract Continuity

The UMEED frontend relies on same-origin paths (`/api/*`) for user sign-in, citizen intake, case management, and real-time operational coordination. Changing every frontend call to a cross-origin URL (`https://umeed-api.fly.dev`) would introduce:
1. Cross-Origin Resource Sharing (CORS) pre-flight latency on every state-changing request.
2. Cross-site third-party cookie restrictions in modern browsers (e.g. Chrome Privacy Sandbox, Safari ITP).
3. Public exposure of backend internal topology.

To resolve this, Vercel Serverless Functions act as a **lightweight, secure BFF reverse-proxy**. The browser continues calling `/api/...` on the existing domain; the Next.js server signs the request and forwards it to the Fly.io Fastify backend.

---

## 2. Cryptographic Proxy Authentication (HMAC-SHA256)

To guarantee that requests arriving at Fly.io originate exclusively from the authorized Vercel frontend, each request is signed using HMAC-SHA256.

### 2.1 Canonical Payload Construction
```text
payload = `${METHOD}:${PATH}:${TIMESTAMP}:${NONCE}:${BODY_HASH}`
```
Where:
- `METHOD`: Uppercase HTTP verb (e.g., `POST`, `GET`).
- `PATH`: Canonical request path (e.g., `/v1/incidents/ingest`).
- `TIMESTAMP`: Epoch seconds string (e.g., `1793509000`).
- `NONCE`: Cryptographically random UUID v4 string.
- `BODY_HASH`: SHA-256 hex digest of the raw request body (or empty string hash for bodyless requests).

### 2.2 Inbound Security Headers Attached by Proxy
- `x-umeed-signature`: Hex string of `HMAC-SHA256(secret, payload)`.
- `x-umeed-timestamp`: Inbound timestamp string.
- `x-umeed-nonce`: Inbound nonce string.
- `x-umeed-client-ip`: Original client IP extracted from `x-forwarded-for` (ensures accurate rate limiting on the backend).

### 2.3 Backend Verification & Defenses
The Fastify backend (`apps/backend/src/plugins/proxy-auth.ts`) enforces:
1. **Clock Skew Defense:** Rejects requests where `|now - timestamp| > 60` seconds with `401 EXPIRED_PROXY_SIGNATURE`.
2. **Replay Defense:** Tracks nonces in a time-bounded cache; rejects duplicate nonces with `401 REPLAYED_PROXY_NONCE`.
3. **Constant-Time Verification:** Uses `crypto.timingSafeEqual` to prevent timing attacks.

---

## 3. Session Cookie Propagation & State Isolation

1. **Inbound Cookie Preservation:** The proxy forwards the client's `Cookie` header (`umeed_session=sess_...`) directly to Fastify.
2. **Outbound Set-Cookie Preservation:** When Fastify emits `Set-Cookie: umeed_session=sess_...; HttpOnly; Secure; SameSite=Lax; Path=/`, the proxy propagates the header directly to the browser.
3. **No Domain Overwriting:** Cookies are bound to the public frontend domain (`umeed-platform-nu.vercel.app`), ensuring seamless authentication without invalid `.fly.dev` scoping.

---

## 4. Error Translation & Resilience

If the Fly.io backend is temporarily unreachable:
```json
{
  "error": {
    "code": "BACKEND_UNAVAILABLE",
    "message": "The dedicated UMEED backend in Mumbai could not be reached. Fail-closed policy active.",
    "status": 503,
    "timestamp": "2026-11-01T05:20:00.000Z"
  }
}
```
**No internal stack traces or private URLs are exposed to the browser.**

