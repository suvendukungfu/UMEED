# UMEED — Database Schema, Migration & Backup Runbook

**Cluster:** `cluster0.lhqnclv.mongodb.net` (AWS `ap-south-1` Mumbai)  
**Database Name:** `umeed_db`  
**Replica Set:** `atlas-u2r5nt-shard-0`  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Database Identity & Discrepancy Reconciliation

During forensic inspection of configuration history:
- An earlier development document referenced `MONGODB_DB=umeed_production`.
- The actual encrypted Vercel production environment variable is configured as `MONGODB_DB=umeed_db`.
- The connection string default in the monorepo is `umeed_db`.

**Reconciliation Policy:**  
The canonical target database for production is **`umeed_db`**.  
No data will be deleted, renamed, or migrated without explicit operator approval. Both the Fastify backend and the Vercel proxy respect `MONGODB_DB="umeed_db"`.

---

## 2. Core Collections & Schema Definitions

| Collection | Model / Contract | Purpose | Primary Indexes |
| :--- | :--- | :--- | :--- |
| `users` | `UserSchema` | User identity & authentication | `userId` (unique), `email` (unique) |
| `sessions` | `SessionSchema` | Active user sessions | `tokenHash` (unique), `expiresAt` (TTL) |
| `organization_memberships` | `OrganizationMembershipSchema`| User-to-NGO associations | `{ userId: 1, organizationId: 1 }` (unique) |
| `incidents` | `CanonicalIncidentSchema` | Citizen distress reports | `public_reference` (unique), `tracking_token_hash` |
| `cases` | `CaseSchema` | Coordinator assistance cases | `case_id` (unique), `public_case_reference` (unique) |
| `assignments` | `CaseAssignmentSchema` | Field responder assignments | `id` (unique), `assignedNgoId`, `caseId` |
| `ngos` | `NGOSchema` | Verified NGOs & capacities | `ngo_id` (unique), `operational_districts` |
| `facilities` | `Facility` | Hospitals, clinics, shelters | `facility_id` (unique), `district`, `location.geo` (2dsphere) |
| `notification_outbox`| `NotificationOutboxRecord` | Asynchronous delivery queue | `status`, `lockExpiresAt` |
| `audit_events` | `AuditEvent` | Immutable audit trail | `timestamp`, `entityId`, `actor` |
| `_system_healthchecks`| Internal Probe | Non-destructive health checks | `createdAt` (TTL index 60s) |

---

## 3. Backup & Recovery Protocol

Before performing schema updates or index creation:
1. **Atlas Automated Snapshots:**  
   MongoDB Atlas maintains continuous automated point-in-time recovery (PITR) for M10+ tiers, and daily snapshots on shared tiers.
2. **On-Demand Manual Snapshot (Atlas UI):**  
   Navigate to **Cluster0 $\rightarrow$ Backup $\rightarrow$ Snapshots $\rightarrow$ Take Snapshot**.
3. **Command-Line Dump (from Fly.io container):**
   ```bash
   fly ssh console --app umeed-api -C "mongodump --uri=\"\$MONGODB_URI\" --db=umeed_db --archive=umeed_backup.archive"
   ```
4. **Zero-Destruction Guarantee:**  
   The application code contains no `drop()`, `deleteMany({})`, or destructive collection recreation logic.

