# UMEED Project Structure

**Project**: UMEED (HackCBS 9.0)  
**Architecture**: Monorepo with npm workspaces

```
umeed/
├── apps/
│   └── web/                            # Next.js 15 App Router Frontend & API Handlers
│       ├── public/                     # Static assets
│       ├── src/
│       │   ├── app/                    # App Router pages and route handlers
│       │   │   ├── api/                # API Route Handlers
│       │   │   │   └── health/         # GET /api/health endpoint
│       │   │   ├── layout.tsx          # Root layout with Sidebar and Header
│       │   │   ├── page.tsx            # UMEED Dashboard Overview
│       │   │   ├── globals.css         # Tailwind global styles
│       │   │   ├── incidents/          # Incident intake and triage UI
│       │   │   ├── report/             # Citizen report submission UI
│       │   │   ├── ngos/               # NGO registry UI
│       │   │   ├── cases/              # Case coordination UI
│       │   │   ├── agent/              # Meko coordination memory UI
│       │   │   └── analytics/          # Impact analytics UI
│       │   ├── components/             # Reusable UI components
│       │   │   ├── common/             # Common widgets (HealthIndicator, etc.)
│       │   │   └── layout/             # Layout components (Sidebar, Header)
│       │   ├── features/               # Feature domain modules
│       │   │   ├── incidents/          # Incidents logic & schema bindings
│       │   │   ├── ngos/               # NGO registry & verification logic
│       │   │   ├── cases/              # State machine & lifecycle management
│       │   │   ├── evidence/           # Media upload and provenance
│       │   │   ├── matching/           # Capability-aware matching engine
│       │   │   ├── analytics/          # IOMETE event models
│       │   │   └── agent/              # Meko coordination memory agent
│       │   └── lib/                    # Shared core infrastructure
│       │       ├── config/             # Zod environment validation & runtime access
│       │       ├── db/                 # MongoDB Atlas connection pooling & readiness
│       │       ├── errors/             # Standardized ApiError and formatters
│       │       ├── logging/            # Structured JSON logger with PII/secret scrubbing
│       │       ├── security/           # Sanitization & PII scrubbing utilities
│       │       └── validation/         # Request body & query parameter validators
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       └── next.config.ts
├── packages/
│   └── contracts/                      # Shared TypeScript/Zod contract library
│       ├── src/
│       │   ├── incident.ts             # Canonical Incident Contract (v1.0.0)
│       │   ├── incident.test.ts        # Automated unit tests for schema validation
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── services/
│   └── discovery/                      # Python/FastAPI discovery crawler (Phase 8)
│       └── README.md
├── docs/                               # Architecture and foundation documentation
│       ├── PROJECT_STRUCTURE.md
│       ├── FOUNDATION_DECISIONS.md
│       └── ENVIRONMENT_SETUP.md
├── data/
│   └── synthetic/                      # Synthetic data fixtures (Phase 4 NGOs)
├── scripts/                            # Development and maintenance utilities
├── tests/                              # Workspace-level test suites
├── .env.example                        # Template environment variables
├── .gitignore
├── .nvmrc                              # Node 24 runtime constraint
├── package.json                        # Root npm workspace manifest
├── README.md                           # Quickstart and setup instructions
├── IMPLEMENTATION_STATUS.md            # Active milestone tracker
├── ARCHITECTURE.md                     # Core architecture & mathematical formulation
├── ENVIRONMENT_AUDIT.md                # System runtime & integration capabilities
├── REPOSITORY_AUDIT.md                 # Baseline repository inspection
└── IMPLEMENTATION_PLAN.md              # 9-Phase detailed execution plan
```

