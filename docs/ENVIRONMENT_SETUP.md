# UMEED Local Environment Setup Guide

This guide walks through configuring and running UMEED locally.

---

## 1. Prerequisites

- **Node.js**: `v24 LTS` (v24.5.0+ installed).
- **npm**: `v10+` / `v11+`
- **NVM** (recommended for version switching):

  ```bash
  nvm use 24
  ```

- **FFmpeg**: Required later for video frame extraction in Phase 8 (`brew install ffmpeg`).

---

## 2. Environment Variables & Production Safety Boundaries

1. Copy `.env.example` to `apps/web/.env.local`:

   ```bash
   cp .env.example apps/web/.env.local
   ```

2. **Development vs Production Safety Rules**:
   - **Development (`NODE_ENV=development`)**:
     - `MONGODB_URI` may be left blank. The system safely falls back to the built-in `InMemoryIncidentRepository`.
     - In-memory data is ephemeral and will be lost on server restart (clearly flagged in `/api/health`).
     - Default keys (`umeed-coordinator-dev-key`, `umeed-crawler-dev-key`) work out of the box.
   - **Production (`NODE_ENV=production`)**:
     - `MONGODB_URI` is **mandatory**. Fallback to in-memory storage is strictly prohibited. If MongoDB is unavailable, incident persistence fails closed with HTTP `503 Service Unavailable`.
     - Default development keys (`umeed-coordinator-dev-key`, `umeed-crawler-dev-key`) and placeholder strings are **strictly rejected**. Strong, unpredictable secrets (min 16 characters) must be configured in the production environment.
3. Configure credentials when ready:
   - `MONGODB_URI`: Your MongoDB Atlas cluster connection string (`mongodb+srv://...`).
   - `COORDINATOR_API_KEY`: Strong coordinator secret key.
   - `CRAWLER_API_KEY`: Service-to-service crawler secret key.
   - `GEMINI_API_KEY`: Google Gemini API key for multimodal triage (Phase 3).
   - `MEKO_API_KEY`: Meko API key for coordination agent memory (Phase 6).
   - `IOMETE_PAT`: (Unused / Out of Scope) Retained as empty compatibility placeholder.

---

## 3. Dependency Installation

Install dependencies from the repository root:

```bash
npm install
```

---

## 4. Running the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Verification Commands

Run code quality checks and tests across all workspaces:

```bash
# Type check all packages and apps
npm run typecheck

# Run test suites
npm run test

# Run linter
npm run lint

# Build production bundle
npm run build
```

---

## 6. Health Check Verification

Test the running application's liveness:

```bash
curl http://localhost:3000/api/health
```

Expected response format:

```json
{
  "status": "healthy",
  "application": "UMEED",
  "tagline": "From distress to real assistance",
  "version": "1.0.0",
  "uptime_seconds": 12,
  "timestamp": "2026-10-31T12:00:00.000Z",
  "services": {
    "core_engine": {
      "status": "operational"
    },
    "database": {
      "configured": false,
      "connected": false,
      "status": "unconfigured"
    }
  }
}
```
