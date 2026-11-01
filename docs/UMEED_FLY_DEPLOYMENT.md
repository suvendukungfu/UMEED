# UMEED — Fly.io Deployment Runbook & Operational Guide

**Application:** `umeed-api`  
**Deployment Region:** `bom` (Mumbai, India)  
**Process Groups:** `api` (HTTP Service), `worker` (Background Tasks)  
**Container Base:** Node.js 22 LTS Alpine  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Prerequisites & CLI Installation

On your development workstation (macOS):

```bash
# 1. Install flyctl via Homebrew
brew install flyctl

# 2. Authenticate with Fly.io
fly auth login
```

Verify authentication:
```bash
fly auth whoami
```

---

## 2. Launching the Application (No Initial Deploy)

Run from the root of the `hackcbs` workspace:

```bash
# Initialize application without immediate deployment
fly launch --name umeed-api --region bom --no-deploy
```

When prompted:
- Do not add a Postgres database (we use MongoDB Atlas).
- Do not add a Redis database (we use MongoDB outbox with atomic leases).
- Confirm configuration using the existing `fly.toml` and `apps/backend/Dockerfile`.

---

## 3. Allocating App-Scoped Static Egress in Mumbai

**Critical Step:** This allocates the dedicated outbound IPv4/IPv6 egress addresses that will be whitelisted in MongoDB Atlas.

```bash
# Allocate app-scoped static egress in Mumbai (bom)
fly ips allocate-egress --app umeed-api -r bom

# Inspect the allocated addresses
fly ips list --app umeed-api
```

Record the allocated IPv4 address (e.g. `137.66.x.x`). This address is persistent across all container recreations, scaling operations, and rolling deployments.

---

## 4. Configuring Production Secrets on Fly.io

Set production secrets securely using `fly secrets set`. Never commit secrets into source control or Docker image layers.

```bash
fly secrets set --app umeed-api \
  NODE_ENV="production" \
  FLY_REGION="bom" \
  MONGODB_URI="mongodb+srv://punarvashu_db_user:<password>@cluster0.lhqnclv.mongodb.net/umeed_db?retryWrites=true&w=majority&appName=Cluster0" \
  MONGODB_DB="umeed_db" \
  UMEED_PROXY_SIGNING_SECRET="$(openssl rand -hex 32)" \
  GEMINI_API_KEY="<your_gemini_api_key>" \
  COORDINATOR_API_KEY="$(openssl rand -hex 24)"
```

*Note: Copy the generated `UMEED_PROXY_SIGNING_SECRET` value. You will add this exact secret to Vercel environment variables for the BFF proxy.*

---

## 5. Deploying the Backend & Worker Services

Deploy the multi-stage container build to Fly.io:

```bash
fly deploy --app umeed-api
```

Fly.io will:
1. Build the multi-stage Dockerfile (`apps/backend/Dockerfile`).
2. Provision machine instances for both the `api` and `worker` process groups in `bom`.
3. Execute container healthchecks on `GET http://127.0.0.1:8080/health`.
4. Route public HTTPS traffic to `https://umeed-api.fly.dev`.

---

## 6. Verifying Live Machine & Process Group Status

Inspect the running processes:
```bash
fly status --app umeed-api
```

Expected output:
```text
App
  Name     = umeed-api
  Owner    = ...
  Hostname = umeed-api.fly.dev
  Image    = umeed-api:...

Machines
PROCESS  ID            VERSION  REGION  STATE    ROLE   CHECKS                 CREATED
api      9080e72b...   1        bom     started  app    2 total, 2 passing     ...
worker   148e450a...   1        bom     started  app    -                      ...
```

Tail live runtime logs:
```bash
fly logs --app umeed-api
```

---

## 7. Operational Health Verification

Once deployed:

```bash
# 1. Public Liveness Probe
curl -i https://umeed-api.fly.dev/health

# 2. Database Readiness Probe (Strict Fail-Closed)
curl -i https://umeed-api.fly.dev/ready
```

When Atlas access list propagation is complete:
- `/ready` returns HTTP 200 with `{"status":"READY","storage":"persistent_mongodb","region":"bom"}`.

