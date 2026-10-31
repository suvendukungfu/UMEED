# Contributing to UMEED

Thank you for your interest in contributing to **UMEED**, an open-source, AI-powered social distress discovery and closed-loop assistance coordination platform built for **HackCBS 9.0**.

By contributing, you help ensure that reports of vulnerable individuals and animals in acute distress lead to real, verified assistance.

---

## 1. Code of Conduct

All contributors and maintainers are expected to abide by our [Code of Conduct](CODE_OF_CONDUCT.md) (Contributor Covenant v2.1). We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone.

---

## 2. Ethical Non-Negotiables

Because UMEED coordinates real-world social assistance and handles sensitive distress reports, all contributors must observe these core principles:
1. **No Autonomous Dispatch**: AI models provide structured recommendations; human coordinators must confirm actions for high-risk cases.
2. **No Autonomous Medical Diagnosis**: Triage flags visible conditions as non-medical observations only.
3. **Beneficiary Privacy**: Never commit real beneficiary phone numbers, unredacted faces of vulnerable individuals, or exact private shelter coordinates.
4. **No Fabricated Data**: Synthetic test fixtures must be explicitly marked (`is_synthetic: true`). Never invent fake partner statistics or misleading rescue counts.

---

## 3. Repository Architecture & Workspaces

UMEED is structured as an npm workspace monorepo:

```
umeed/
├── apps/
│   └── web/                   # Next.js 15 App Router platform & API routes
├── packages/
│   └── contracts/             # Canonical incident schema & shared contracts (Zod)
├── services/
│   └── discovery/             # Independent Python/FastAPI crawler (Phase 8)
├── docs/                      # Architectural decisions, UX specs, accessibility guidelines
└── data/                      # Synthetic data fixtures for evaluation
```

---

## 4. Development Environment

### Prerequisites
- **Node.js**: `v24 LTS` (`>=20.9.0` minimum, `v24.5.0+` recommended). You can use [NVM](https://github.com/nvm-sh/nvm):
  ```bash
  nvm use 24
  ```
- **npm**: `v10+` or `v11+`
- **MongoDB Atlas** or local MongoDB instance (for full integration runs)

### Getting Started
```bash
# 1. Clone the repository
git clone https://github.com/suvendukungfu/UMEED.git
cd UMEED

# 2. Install workspace dependencies
npm install

# 3. Copy environment configuration
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the development dashboard.

---

## 5. Development Workflow & Quality Gates

Before opening a pull request, ensure all quality gates pass locally:

```bash
# 1. Run unit and contract tests across all workspaces
npm run test

# 2. Run strict TypeScript compilation check
npm run typecheck

# 3. Run ESLint code quality check
npm run lint

# 4. Verify production bundle build
npm run build
```

---

## 6. Git & Branching Conventions

- **Branch Naming**:
  - `feat/feature-name` for new user capabilities
  - `fix/bug-description` for bug fixes
  - `docs/topic-name` for documentation improvements
  - `refactor/scope` for internal architectural refactors
- **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add bilingual hindi/english toggle to citizen report`
  - `fix(contracts): enforce maximum bounds on reasoning array`
  - `docs(a11y): add WCAG 2.2 AA touch target audit`
  - `test(web): add unit tests for health check readiness`

---

## 7. Submitting a Pull Request

1. Fork the repository and create your branch from `main`.
2. Follow the parallel workstream guidelines: do not modify unrelated dependency lockfiles or active engineering paths without coordination.
3. Verify that all 4 verification gates (`test`, `typecheck`, `lint`, `build`) succeed with zero errors.
4. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) completely.
5. Link any related issues (e.g., `Closes #42`).
