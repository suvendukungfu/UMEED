# UMEED — MongoDB Atlas Access Configuration & Zero-Trust Hardening

**Target Cluster:** `cluster0.lhqnclv.mongodb.net`  
**Hosting Provider:** Amazon Web Services (AWS) `ap-south-1` (Mumbai)  
**Replica Set:** `atlas-u2r5nt-shard-0`  
**Security Policy:** Zero-Trust Whitelisting (Strict `/32` IP Restriction)  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Zero-Trust Access Policy: Why `0.0.0.0/0` is Permanently Rejected

The initial deployment audit revealed that Serverless execution on Vercel Hobby lacked dedicated egress IPs, forcing an untenable trade-off between disabling citizen distress intake or opening Atlas to `0.0.0.0/0`.

With Fly.io app-scoped static egress in Mumbai (`bom`), this trade-off is resolved. Under the UMEED Production Security Policy:
- **`0.0.0.0/0` ("Allow Access from Anywhere") is strictly forbidden in production.**
- Permitting global ingress exposes the MongoDB Atlas TLS termination proxy to internet-wide brute force, credential stuffing, and volumetric denial-of-service attacks.
- Only the specific `/32` IPv4 address assigned to `umeed-api` in `bom` is permitted.

---

## 2. Step-by-Step Operator Runbook: Configuring Network Access

Follow these steps once you have allocated the Fly.io static egress IP (`fly ips allocate-egress --app umeed-api -r bom`):

### Step 1: Open MongoDB Atlas Network Access
1. Log in to [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Select the project containing cluster `cluster0.lhqnclv.mongodb.net`.
3. In the left-hand navigation menu under the **SECURITY** header, click **Network Access**.

### Step 2: Add Dedicated Egress IP
1. Click the green **+ Add IP Address** button.
2. In the **Access List Entry** field, enter the exact IPv4 address obtained from `fly ips list` followed by `/32`:
   ```text
   <allocated_fly_ipv4>/32
   ```
   *(e.g., `137.66.42.100/32`)*
3. In the **Comment** field, enter:
   ```text
   UMEED Fly API Mumbai Production Egress (bom)
   ```
4. Click **Confirm**.

### Step 3: Monitor Propagation
Atlas displays entry status as `Pending`. Within 30 to 60 seconds, status transitions to `Active` across all three shard ingress proxies (`ac-suutx6m-shard-00-00`, `-01`, `-02`).

---

## 3. End-to-End Connectivity Verification

Once the status is `Active`, test the connection directly from the running Fly.io backend:

### Step 1: Query Backend Readiness Probe
```bash
curl -i https://umeed-api.fly.dev/ready
```

Expected Response:
```json
{
  "status": "READY",
  "storage": "persistent_mongodb",
  "region": "bom",
  "database": "umeed_db",
  "latency_ms": 7,
  "timestamp": "2026-11-01T05:15:00.000Z"
}
```

### Step 2: Verify TLS Handshake & Authentication Logs
Inspect container logs to verify clean connection pool establishment:
```bash
fly logs --app umeed-api | grep -E "database|ready|MongoClient"
```

Verify that no `SSL alert number 80` or `NETWORK_ACCESS_DENIED` errors are emitted.

