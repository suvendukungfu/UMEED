## Description

<!-- Provide a brief summary of the changes introduced by this pull request. -->

Closes #<!-- issue number -->

---

## Type of Change

- [ ] `feat`: New user feature or capability
- [ ] `fix`: Bug fix
- [ ] `docs`: Documentation updates or additions
- [ ] `test`: New or modified tests
- [ ] `refactor`: Internal code refactoring without functional changes
- [ ] `chore`: Maintenance, tooling, or CI updates

---

## Affected Subsystems

- [ ] Citizen Portal (`/report`, `/track`)
- [ ] Coordinator Workspace (`/incidents`, `/cases`)
- [ ] NGO Responder Portal (`/responder`)
- [ ] Contracts & Shared Schemas (`packages/contracts`)
- [ ] Core Library / DB / Logging (`apps/web/src/lib`)
- [ ] Documentation / Governance

---

## Verification Checklist

Please verify that all quality gates pass locally before requesting review:

- [ ] **Tests Passing**: `npm run test` executes with zero failures.
- [ ] **TypeScript Strict**: `npm run typecheck` produces zero compiler errors.
- [ ] **Linter Clean**: `npm run lint` passes with zero warnings or errors.
- [ ] **Production Build**: `npm run build` succeeds cleanly.
- [ ] **Zero Dependency Creep**: No unauthorized dependencies were added.
- [ ] **No Security Advisories**: `npm audit --omit=dev` reports 0 vulnerabilities.
- [ ] **Accessibility (WCAG 2.2 AA)**: Interactive elements have accessible labels, keyboard focus, and adequate contrast.
- [ ] **Privacy & Ethics**: No real beneficiary PII, hardcoded secrets, or unredacted coordinates are committed.
