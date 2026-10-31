# Changelog

All notable changes to the **UMEED** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added (Parallel Workstream — Product Experience & Open-Source Readiness)
- **Product Experience Architecture**: Comprehensive multi-role specification for Citizen, Coordinator, NGO Responder, and Platform Admin in `docs/PRODUCT_EXPERIENCE.md`.
- **User Journey Maps & State Machine**: Sequence diagrams, duplicate merge flows, and component inventory in `docs/USER_JOURNEYS.md`.
- **WCAG 2.2 AA Accessibility Specification**: Contrast audits, keyboard patterns, touch target sizing, and low-bandwidth handling in `docs/ACCESSIBILITY.md`.
- **Open-Source Governance Scaffolding**: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and issue/PR templates in `.github/`.
- **Privacy & AI Safety Charters**: `docs/PRIVACY.md` (zero-knowledge tracking, location blurring) and `docs/AI_SAFETY.md` (human-in-the-loop, no autonomous diagnosis/dispatch).
- **Local Setup Troubleshooting Guide**: Comprehensive step-by-step onboarding and local debugging guide in `docs/LOCAL_SETUP.md`.
- **Continuous Integration Pipeline**: Automated GitHub Actions workflow (`.github/workflows/ci.yml`) validating Node.js 24, typecheck, lint, test, and build.
- **Synthetic Evaluation Fixtures**: Standardized JSON test fixtures for canine trauma, elderly welfare, and homeless medical assistance in `data/synthetic/fixtures.json`.
- **Evaluation Storyboard**: End-to-end two-cycle recursive assistance demonstration guide in `docs/DEMO_STORYBOARD.md`.
- **UX Gap & Prioritization Matrix**: P0/P1/P2 feature roadmap with engineering complexity and dependencies in `docs/UX_GAPS.md`.

---

## [0.1.0] - 2026-10-31

### Added (Phase 1 — Project Foundation)
- Initialized Next.js 15 App Router platform with React 19, TypeScript strict mode, and Tailwind CSS.
- Created `@umeed/contracts` workspace with Canonical Incident Contract `v1.0.0` and Zod schema validation.
- Implemented `apps/web/src/lib/config/env.ts` with runtime environment validation and fail-fast checks.
- Implemented `apps/web/src/lib/db/mongodb.ts` with client promise caching and readiness probing.
- Implemented `apps/web/src/lib/logging` structured JSON logger with PII and secret redaction.
- Implemented `apps/web/src/lib/errors` standardized `ApiError` hierarchy.
- Implemented `GET /api/health` health check endpoint verifying database connectivity and uptime.
- Created root responsive layout with Header, Sidebar, and live health status indicator.
- Added 17 unit and contract tests across `@umeed/contracts` and `@umeed/web`.

### Security Hardening (Phase 1.1 & Phase 1.2)
- Upgraded Next.js to `15.5.28` to patch upstream CVE advisories.
- Upgraded Vitest to `4.1.12` and eliminated vulnerable `tinypool` transitive dependency.
- Upgraded Vite to `8.3.5` and PostCSS to `8.5.32`.
- Upgraded Zod to `4.6.7` with explicit `.max()` bounds preventing regex/array resource exhaustion (GHSA-mrhx-c7xc-m3w5).
- Achieved **0 vulnerabilities** on `npm audit --omit=dev` and **0 High / 0 Critical** on full audit.

### Added (Phase 0 — Repository & Architectural Baseline)
- Created `REPOSITORY_AUDIT.md`, `ENVIRONMENT_AUDIT.md`, `ARCHITECTURE.md`, and `IMPLEMENTATION_PLAN.md`.
