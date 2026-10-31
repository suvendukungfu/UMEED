# Security Policy

The UMEED maintainers take security and data privacy extremely seriously. UMEED handles sensitive real-world distress reports, geolocation data, and emergency NGO coordination. A security compromise could impact real-world human and animal welfare.

---

## 1. Supported Versions

Security updates are actively applied to the following release branches:

| Version | Supported | Status |
|---|---|---|
| `0.1.x` (Development / HackCBS 9.0) | :white_check_mark: | Active Development & Hardening |
| `< 0.1.0` | :x: | Unsupported / Deprecated |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue**.

Instead, report the issue responsibly by:
1. Submitting a private security advisory via GitHub Security Advisories tab (`/security/advisories/new`), OR
2. Emailing the project security team directly at `security@umeed.org` (or reaching out privately to the maintainers).

### What to Include in Your Report
- A clear description of the vulnerability and its potential security/privacy impact.
- Step-by-step reproduction instructions or a minimal proof-of-concept.
- The affected component (e.g., `packages/contracts`, `apps/web/api`, or auth handlers).
- Any proposed remediation or patches if available.

### Disclosure Timeline
- **Initial Response**: Within 24 hours of report receipt.
- **Triage & Assessment**: Within 48 hours.
- **Fix & Public Advisory**: Coordinated release within 7 days (or sooner for critical severity).

---

## 3. Platform Security Guardrails

UMEED enforces strict foundational security controls across the codebase:

### 3.1 Server-Side Secret Isolation
All database credentials (`MONGODB_URI`), model keys (`GEMINI_API_KEY`), and partner secrets (`MEKO_API_KEY`) are restricted to the Node.js server runtime. No sensitive environment variables are prefixed with `NEXT_PUBLIC_` or bundled into client assets.

### 3.2 Strict Schema Validation & Resource Exhaustion Protection
All ingestion endpoints validate input via `@umeed/contracts` using Zod 4.6.6+. Strict `.max()` bounds are enforced on all strings, reasoning arrays (max 20 items), and URLs to prevent memory exhaustion and Denial-of-Service attacks.

### 3.3 Beneficiary Privacy & PII Scrubbing
- **No Biometrics or Facial Storage**: Media pipelines scrub unredacted faces before long-term storage or analytics export.
- **Geographic Blurring**: Public tracking views (`/track/[code]`) and public analytics never display exact lat/long coordinates or doorstep landmarks. Public views only render aggregated district or sub-locality levels.
- **Logging Redaction**: Application logs automatically sanitize phone numbers, emails, and authorization tokens via `apps/web/src/lib/security`.

### 3.4 Dependency Vulnerability Auditing
We maintain a zero-vulnerability standard for production dependencies:
```bash
npm audit --omit=dev
```
All dependencies are locked, reviewed, and audited against known CVE advisories.
