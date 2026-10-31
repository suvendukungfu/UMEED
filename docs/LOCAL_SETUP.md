# UMEED Local Development Setup & Troubleshooting Guide

**System**: UMEED (Closed-Loop Social Distress Assistance Platform)  
**Hackathon**: HackCBS 9.0  
**Authors**: Senior Open Source Maintainer, Staff DevOps Engineer  
**Status**: Engineering Guide  

---

## 1. Prerequisites & Toolchain Verification

Ensure your local development machine satisfies these minimum toolchain requirements:

| Tool | Required Version | Verification Command | Notes |
|---|---|---|---|
| **Node.js** | `>=20.9.0` (`v24.5.0+` recommended) | `node -v` | Node 24 LTS recommended. Enforced via `.nvmrc`. |
| **npm** | `10.x` or `11.x` | `npm -v` | Native npm workspaces are utilized. |
| **Git** | `2.30+` | `git --version` | Standard git client. |
| **MongoDB** | `6.x+` or MongoDB Atlas | `mongod --version` | Local or cloud connection string. |
| **Python** (Optional) | `3.11+` / `3.14+` | `python3 --version` | Required only for discovery crawler in Phase 8. |
| **FFmpeg** (Optional) | `6.0+` | `ffmpeg -version` | Required only for video extraction in Phase 8. |

---

## 2. Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/suvendukungfu/UMEED.git
cd UMEED
```

### Step 2: Enforce Node.js 24 Runtime
If you use Node Version Manager (`nvm`):
```bash
nvm use 24
```
If Node 24 is not installed:
```bash
nvm install 24
nvm use 24
```

### Step 3: Install Workspace Dependencies
```bash
npm install
```
> [!NOTE]
> Do NOT use `pnpm` or `yarn` directly; the repository uses root npm workspaces (`workspaces: ["packages/*", "apps/*"]`) and is pinned via `package-lock.json`.

---

## 3. Environment Configuration

Copy the template configuration into `apps/web`:
```bash
cp .env.example .env.local
```

### Key Environment Variables (`.env.local`):
```bash
# Application Configuration
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_NAME="UMEED"
NEXT_PUBLIC_APP_VERSION=1.0.0

# Database (MongoDB Atlas)
# Leave empty to use the zero-setup InMemoryIncidentRepository fallback.
MONGODB_URI=
MONGODB_DB=umeed_dev

# Access Control Keys (Phase 2.1)
COORDINATOR_API_KEY=umeed-coordinator-dev-key
CRAWLER_API_KEY=umeed-crawler-dev-key

# Multimodal AI Model (Server-Side Only - Phase 3)
GEMINI_API_KEY=

# Persistent Coordination Memory (Phase 6)
# MEKO_API_KEY=
# MEKO_DATAPACK_ID=

# Historical Analytics Stream (Phase 7)
# IOMETE_PAT=
# IOMETE_EVENT_STREAM_URL=https://workspace.iomete.cloud/api/v1/event-stream

# Discovery Crawler (Phase 8)
DISCOVERY_SERVICE_URL=http://localhost:8000
```

---

## 4. Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verify Health Check
In a separate terminal:
```bash
curl http://localhost:3000/api/health
```
Expected output:
```json
{
  "status": "healthy",
  "application": "UMEED",
  "tagline": "From distress to real assistance",
  "version": "0.1.0",
  "services": {
    "core_engine": { "status": "operational" },
    "database": { "configured": false, "connected": false, "status": "unconfigured" }
  }
}
```

---

## 5. Running Quality Verification Checks

Run the 4 verification gates before any commit:

```bash
# 1. Automated Vitest Suite (Contracts & Unit tests)
npm run test

# 2. Strict TypeScript Compiler Check
npm run typecheck

# 3. Next.js / ESLint Code Quality
npm run lint

# 4. Next.js Production Build
npm run build
```

---

## 6. Troubleshooting Common Issues

### Issue 1: Port 3000 Already in Use
**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`  
**Fix**: Next.js will automatically fall back to port 3001, or you can specify a custom port:
```bash
npm run dev -- -p 3005
```

### Issue 2: Node.js Version Mismatch
**Symptom**: `TypeError: crypto.randomUUID is not a function` or Vitest worker failure.  
**Fix**: Ensure your shell is running Node 24:
```bash
node -v  # Must report v20.9.0+ or v24.x
nvm use 24
```

### Issue 3: Trailing Whitespace in Workspace Path
**Symptom**: File not found when accessing workspace paths.  
**Fix**: Quote shell arguments if your parent folder contains trailing spaces:
```bash
cd "$PWD"
```
