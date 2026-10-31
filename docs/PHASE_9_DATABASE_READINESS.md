# UMEED — Phase 9 Database & Demo-Mode Readiness Report

**Document Version**: 1.0.0  
**Phase**: Phase 9 — Final Competition Readiness, Check T & Release Freeze  
**Owner**: Senior Database Engineer  
**Date**: 2026-11-01  

---

## 1. Executive Summary & Configuration State

In the current local deployment:
- **`MONGODB_URI`**: Unconfigured (`length: 0` in `apps/web/.env.local`).
- **Active Operational Mode**: **High-Fidelity Ephemeral Demo Mode** (`InMemoryIncidentRepository`, `InMemoryCaseRepository`, `InMemoryNGORepository`).
- **Production Safety Boundary**: Fail-closed policy active. If `NODE_ENV=production`, the application refuses to boot without a validated MongoDB Atlas connection string.

---

## 2. Deterministic Demo Mode Architecture

When running without MongoDB Atlas, UMEED operates completely self-contained in process memory:

```
[npm run dev]
      │
      ▼
[getServerEnv()] -> MONGODB_URI is empty
      │
      ├──> Incident Repository: InMemoryIncidentRepository
      ├──> Case Repository:     InMemoryCaseRepository
      └──> NGO Repository:      InMemoryNGORepository
```

### Key Guarantees:
1. **Deterministic Seeding**: Running `npm run seed:demo` guarantees the exact same 8 synthetic Delhi NGOs (`DEMO-NGO-001` through `DEMO-NGO-008`) and A1 incident fixtures (`UMD-A1-OFF` / `UMD-A1-ON`).
2. **Safe Demo Reset**: Running `npm run reset:demo` clears ephemeral in-memory state without deleting configuration or affecting any real databases.
3. **Transparent Warnings**: Every health check (`GET /api/health`) explicitly outputs:
   ```json
   {
     "status": "healthy_demo_mode",
     "environment": {
       "storage_type": "in_memory_ephemeral",
       "is_ephemeral_warning": "Ephemeral in-memory storage active. Ingested incident reports will be lost on application restart."
     }
   }
   ```
4. **Honest Persistence Disclosure**: UMEED **never claims persistence across restarts** while running in demo mode. All data resets when the Next.js process terminates.

---

## 3. Dedicated Demo CLI Commands

The following package scripts are configured in `package.json`:

| Command | Action | Scope / Safety |
| :--- | :--- | :--- |
| **`npm run seed:demo`** | Seeds 8 synthetic NGOs and A1 incident scenarios into the active repository. | Idempotent; skips existing IDs. |
| **`npm run reset:demo`** | Resets the in-memory repository store for a clean demonstration run. | Targets demo memory only. |
| **`npm run dev`** | Starts the Next.js development server at [http://localhost:3000](http://localhost:3000). | Defaults to safe demo mode. |

---

## 4. Production MongoDB Atlas Transition Readiness

When transitioning from the hackathon demo to production deployment:
1. Create a dedicated MongoDB Atlas cluster (M0 or higher).
2. Set `MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority` in the production environment.
3. Set `MONGODB_DB=umeed_prod`.
4. Repositories automatically switch to `MongoIncidentRepository`, `MongoCaseRepository`, and `MongoNGORepository`.
5. Unique and geospatial indexes initialize automatically on first access.

---

## 5. Database Verdict

**PASS (DEMO_MODE)**. Safe, deterministic demo mode is fully functional with explicit ephemeral warnings, reliable seeding scripts, and zero risk of data corruption.

