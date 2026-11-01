# UMEED — Production Cutover & Release Runbook

**From:** Vercel Monolith (Dynamic IP, Fail-Closed Storage)  
**To:** Vercel Frontend + Fly.io Mumbai Fastify Backend + MongoDB Atlas (`bom` static egress)  
**Target URL:** `https://umeed-platform-nu.vercel.app`  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Cutover Sequence Overview

The migration is executed in five sequential gates. Each gate requires explicit verification before proceeding to the next.

```text
[ Gate 1: Fly Backend Deployed ]
               │
               ▼
[ Gate 2: Static Egress Assigned ]
               │
               ▼
[ Gate 3: Atlas IP Whitelisted & DB Verified ]
               │
               ▼
[ Gate 4: Vercel BFF Proxy Configured ]
               │
               ▼
[ Gate 5: Live Citizen Intake Enabled ]
```

---

## 2. Step-by-Step Cutover Execution

### Gate 1: Deploy Fly.io Backend
1. On your workstation:
   ```bash
   fly launch --name umeed-api --region bom --no-deploy
   ```
2. Configure production secrets:
   ```bash
   fly secrets set --app umeed-api \
     NODE_ENV="production" \
     FLY_REGION="bom" \
     MONGODB_URI="mongodb+srv://punarvashu_db_user:<password>@cluster0.lhqnclv.mongodb.net/umeed_db?retryWrites=true&w=majority&appName=Cluster0" \
     MONGODB_DB="umeed_db" \
     UMEED_PROXY_SIGNING_SECRET="$(openssl rand -hex 32)" \
     GEMINI_API_KEY="<gemini_api_key>" \
     COORDINATOR_API_KEY="$(openssl rand -hex 24)"
   ```
3. Deploy containers:
   ```bash
   fly deploy --app umeed-api
   ```

### Gate 2: Allocate App-Scoped Static Egress
1. Allocate static egress pair in Mumbai:
   ```bash
   fly ips allocate-egress --app umeed-api -r bom
   ```
2. List the assigned IP:
   ```bash
   fly ips list --app umeed-api
   ```
   *Record the IPv4 address (e.g., `137.66.42.100`).*

### Gate 3: Allowlist Static IP in MongoDB Atlas
1. Open [MongoDB Atlas Network Access](https://cloud.mongodb.com/).
2. Click **+ Add IP Address** $\rightarrow$ Enter `<allocated_fly_ipv4>/32`.
3. Set comment: `UMEED Fly API Mumbai Production Egress`.
4. Confirm and wait for status `Active`.
5. Test readiness probe:
   ```bash
   curl -i https://umeed-api.fly.dev/ready
   ```
   *Must return HTTP 200 `READY` with `"storage": "persistent_mongodb"`.*

### Gate 4: Configure Vercel BFF Proxy
1. Add environment variables to Vercel Production:
   ```bash
   npx vercel env add UMEED_BACKEND_URL production
   # Enter: https://umeed-api.fly.dev

   npx vercel env add UMEED_PROXY_SIGNING_SECRET production
   # Enter the exact 32-byte secret generated in Gate 1
   ```
2. Redeploy Vercel to activate proxy configuration:
   ```bash
   npx vercel --prod --yes --scope suvendukungfus-projects
   ```

### Gate 5: End-to-End Live Verification
1. Verify Vercel Readiness:
   ```bash
   curl -i https://umeed-platform-nu.vercel.app/api/ready
   ```
   *Must return HTTP 200 `READY`.*
2. Submit a live citizen distress report via `/api/incidents/ingest`.
3. Confirm receipt of public reference and tracking token.
4. Verify the report survives multiple requests and container cycles.

