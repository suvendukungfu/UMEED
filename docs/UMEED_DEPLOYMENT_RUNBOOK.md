# UMEED Production Deployment Runbook & Operational Procedures

**Document Version**: 2.0.0  
**Status**: APPROVED RUNBOOK  

---

## 1. Production Prerequisites

1. **Node.js Environment**: Node.js 22 LTS or newer.
2. **MongoDB Atlas Cluster**: Dedicated M10+ replica set with TLS 1.3 enabled.
3. **Google Cloud Gemini Access**: API Key with Gemini 2.5 Flash quota provisioned.
4. **Domain & SSL**: Valid domain with HTTPS enforced and HSTS header configured.

---

## 2. Environment Variables Checklist

Ensure the following are set in the production hosting provider (Vercel / Cloud Run / Kubernetes):

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/umeed?retryWrites=true&w=majority
GEMINI_API_KEY=<production_gemini_api_key>
COORDINATOR_API_KEY=<strong_random_secret_at_least_32_characters>
CRAWLER_API_KEY=<strong_random_secret_at_least_32_characters>
NEXT_PUBLIC_APP_URL=https://umeed.org
```

---

## 3. Build & Health Verification Steps

1. **Install Dependencies**:
   ```bash
   npm ci
   ```
2. **Typecheck & Test Execution**:
   ```bash
   npm run typecheck:umeed
   npm run test:umeed
   ```
3. **Production Next.js Compilation**:
   ```bash
   npm run build:umeed
   ```
4. **Health Check Validation**:
   Immediately after startup, query `/api/health`:
   ```bash
   curl -f https://umeed.org/api/health
   ```
   Verify that `database.connected` is `true` and `environment.storage_type` is `"mongodb"`.

---

## 4. Rollback and Disaster Recovery

- **Database Backups**: Continuous point-in-time recovery (PITR) enabled in MongoDB Atlas with daily snapshots retained for 35 days.
- **Rollback Procedure**: In the event of an application regression, immediately revert the container image or deployment git SHA to the previous verified release tag. Database schemas are strictly backward-compatible across minor versions.

