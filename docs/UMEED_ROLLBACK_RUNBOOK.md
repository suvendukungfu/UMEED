# UMEED — Production Rollback Runbook & Incident Recovery

**Target Application:** UMEED Emergency Platform  
**Scope:** Vercel BFF Proxy & Fly.io Fastify Backend  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Absolute Rollback Invariant: Zero In-Memory Fallbacks

**Mandatory Security Policy:**
A rollback must **never** reintroduce in-memory repositories or simulated success responses.
If the dedicated Fly.io backend encounters an unrecoverable failure:
1. **The safe failure mode is HTTP 503 `SERVICE_UNAVAILABLE`.**
2. Citizen intake must remain strictly paused rather than falsely acknowledging submissions into volatile memory.
3. No fake receipts or phantom tracking tokens may ever be issued.

---

## 2. Rollback Scenarios & Remediation Procedures

### Scenario A: Fly.io Container Build or Deployment Failure
**Symptom:** `fly deploy` fails or containers crash on startup.  
**Action:**
1. Revert to the previous known-good deployment on Fly.io:
   ```bash
   fly releases --app umeed-api
   fly rollback --app umeed-api <release_version>
   ```
2. Inspect crash logs:
   ```bash
   fly logs --app umeed-api
   ```

### Scenario B: Atlas Ingress Block / Firewall Rejection
**Symptom:** `GET /ready` returns HTTP 503 `NOT_READY` with `diagnostic_code: NETWORK_ACCESS_DENIED`.  
**Action:**
1. Verify the outbound IP of the running Fly container:
   ```bash
   fly ssh console --app umeed-api -C "curl -s https://api.ipify.org"
   ```
2. Confirm the address matches the MongoDB Atlas IP Access List entry.
3. If Fly allocated a new IP due to manual recreation, update the Atlas access list entry.

### Scenario C: Vercel Proxy Forwarding Failure
**Symptom:** Vercel returns HTTP 503 `BACKEND_UNAVAILABLE`.  
**Action:**
1. Test direct backend connectivity:
   ```bash
   curl -i https://umeed-api.fly.dev/health
   ```
2. Verify `UMEED_BACKEND_URL` and `UMEED_PROXY_SIGNING_SECRET` match on both Vercel and Fly.io.
3. If needed, temporarily roll back the Vercel deployment:
   ```bash
   npx vercel rollback <deployment_url> --scope suvendukungfus-projects
   ```

