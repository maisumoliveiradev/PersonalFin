# AGENTS.md

## Purpose

This file defines the global operating rules for AI coding agents working on this project.

The project is developed incrementally through small, verifiable releases and SDDs. Agents must preserve the existing architecture, financial-domain integrity, documentation, and delivered behavior while implementing only the scope explicitly requested.

This file is the primary instruction entry point for implementation work.

---

## Core Principles

1. Implement only the scope of the current SDD or explicit task.
2. Do not implement future roadmap features prematurely.
3. Prefer the simplest implementation that satisfies the current requirements without blocking known future evolution.
4. Inspect the existing codebase before creating new abstractions, patterns, dependencies, or structures.
5. Preserve financial data integrity and historical traceability.
6. Never silently change established architecture or domain rules.
7. Documentation is part of the implementation.
8. Keep changes small, reviewable, testable, and reversible when practical.
9. Do not introduce speculative abstractions for requirements that are not part of the current increment.
10. Existing behavior must not be changed unless the current task explicitly requires it.

---

## Required Workflow

Before implementing any SDD:

1. Read `docs/project/CURRENT-STATE.md`.
2. Read the current SDD completely.
3. Identify the skills relevant to the task.
4. Read only those relevant skills from `.ai/skills/`.
5. Read `docs/engineering/ENGINEERING-GUIDELINES.md`.
6. Read the domain rules relevant to the feature from `docs/product/DOMAIN-RULES.md`.
7. Read ADRs referenced by the SDD or affected architecture.
8. Inspect the existing implementation and tests.
9. Confirm that the requested behavior is not already implemented.

Do not begin implementation based only on the SDD title or task summary.

---

## Source of Truth

Use project documentation according to the following responsibilities:

- `docs/product/PRODUCT-VISION.md` — long-term product direction.
- `docs/product/REQUIREMENTS.md` — accepted product requirements.
- `docs/product/DOMAIN-RULES.md` — financial and business rules.
- `docs/product/ROADMAP.md` — planned delivery sequence.
- `docs/architecture/ARCHITECTURE.md` — current architecture.
- `docs/architecture/C4.md` — architecture diagrams and system boundaries.
- `docs/architecture/adr/` — architectural decisions and their history.
- `docs/engineering/ENGINEERING-GUIDELINES.md` — implementation standards.
- `docs/engineering/TESTING-STRATEGY.md` — testing strategy.
- `docs/engineering/GIT-WORKFLOW.md` — repository workflow.
- `docs/engineering/TECHNICAL-DEBT.md` — known intentional technical debt.
- `docs/project/CURRENT-STATE.md` — what actually exists now.
- `docs/project/CHANGELOG.md` — delivered changes.
- `docs/sdds/` — implementation specifications for individual increments.

When documents appear to conflict, do not guess.

Use this priority for implementation scope:

1. Current explicit task or approved SDD.
2. Accepted ADRs.
3. Current-state documentation.
4. Domain rules.
5. Requirements.
6. Architecture documentation.
7. Product vision and roadmap.

If a contradiction can materially affect behavior, architecture, financial data, security, or compatibility, stop and report it before implementing.

---

## SDD Scope

An SDD defines the implementation boundary of the current increment.

Agents must:

- implement its requirements;
- satisfy its acceptance criteria;
- satisfy its Definition of Done;
- execute the required tests and validations;
- update only documentation affected by the change.

Agents must not:

- implement unrelated roadmap items;
- expand the feature because a future requirement is already documented;
- refactor unrelated areas without necessity;
- introduce infrastructure solely for hypothetical future use;
- silently modify another module's behavior.

Future requirements may influence boundaries and interfaces only when explicitly required to avoid a known architectural dead end.

---

## Incremental Delivery

The project evolves through small releases.

The first usable milestone is `v0.1.0`:

`Authentication → Financial Space → Initial Categories → Manual Income/Expense Entry`

Capabilities such as advanced dashboards, cards, recurring transactions, debts, goals, OCR, advanced analytics, complete offline synchronization, sharing, multi-currency workflows, Super Admin, and other roadmap features must be introduced through later SDDs.

Do not attempt to build the final product architecture in a single implementation step.

---

## Skills

Skills are located under `.ai/skills/`.

Available base responsibilities include:

- `architecture`
- `frontend`
- `backend`
- `financial-domain`
- `database`
- `testing`
- `security`
- `documentation`

Load only skills relevant to the current task.

Feature names are not agent specialties. Do not create feature-specific architectural patterns merely because a feature has its own SDD.

For example, a credit-card SDD may require:

- financial-domain;
- backend;
- database;
- frontend;
- testing.

The SDD remains responsible for feature scope. Skills define how the agent should reason and work within its specialty.

---

## Architecture

Do not change architectural boundaries implicitly.

When a task requires a meaningful architectural decision:

1. identify the decision;
2. inspect existing ADRs;
3. determine whether an ADR already governs it;
4. if not, create or propose an ADR;
5. implement according to the accepted decision;
6. update architecture documentation when affected.

ADRs use lifecycle states such as:

- `Proposed`
- `Accepted`
- `Superseded`
- `Deprecated`

Never erase architectural history when a decision changes. Supersede the previous ADR.

Use the C4 Model for architecture documentation where appropriate:

- System Context;
- Container;
- Component when useful.

Use sequence or flow diagrams when they communicate behavior better than static structural diagrams.

Do not create diagrams solely for documentation volume.

---

## Financial Domain Safety

Financial-domain correctness takes priority over implementation convenience.

Never:

- use binary floating-point arithmetic for monetary calculations;
- silently alter historical financial records;
- silently discard imported financial records;
- treat invoice payment as a new expense when purchases already represent the expense;
- treat a consolidated balance snapshot as a transaction;
- overwrite balance history when a new balance snapshot is created;
- resolve meaningful financial synchronization conflicts by silently discarding one side;
- modify historical exchange rates already applied to transactions;
- infer missing financial information when the requirement requires user confirmation.

Monetary values must use a safe representation appropriate to the currency's minor unit.

Financial dates are calendar dates and must not accidentally shift because of timezone conversion.

Technical events and audit timestamps must represent actual instants consistently.

When financial behavior is ambiguous, consult `DOMAIN-RULES.md`. If the rule remains undefined and the choice can change financial meaning, stop and request clarification.

---

## Data Integrity

Preserve historical and relational integrity.

Important records should use the project's soft-delete strategy when applicable.

Historical entities that are no longer available for new operations should generally be archived rather than removed when deletion would damage historical interpretation.

Batch operations must be auditable.

Where supported, batch operations should be reversible when reversal is technically safe.

Imports must not silently discard suspected duplicates.

Migration and import workflows should favor:

`Read → Validate → Preview → Resolve → Confirm → Import`

After the initial spreadsheet migration has been validated, the application becomes the source of truth.

---

## Offline and Synchronization

The target architecture supports offline-first mobile behavior, introduced incrementally according to the roadmap.

Records that may be created offline must use globally unique identifiers generated without requiring a server round trip.

Synchronization must not silently overwrite meaningful concurrent changes.

General conflict policy:

- independent field changes may be merged when safe;
- conflicting edits to the same field require explicit resolution;
- edit-versus-delete conflicts require explicit resolution;
- conflict history must remain auditable.

Do not implement the complete offline architecture before the SDD that introduces it.

---

## API Contracts

The API contract is defined through OpenAPI when the API layer is introduced.

OpenAPI is the source of truth for public application API contracts.

Where supported by the architecture, generate TypeScript types or clients from the contract rather than manually duplicating schemas.

When changing an API:

1. update the contract;
2. evaluate backward compatibility;
3. update generated artifacts;
4. update affected tests;
5. update documentation.

Mobile clients may remain on older versions. Avoid unnecessary breaking API changes.

When compatibility can no longer be safely maintained, use the project's minimum-supported-version strategy.

---

## Database Changes

Database schema changes must use versioned migrations.

Do not manually alter production schema outside the migration process.

Before destructive or difficult-to-reverse migrations:

- assess compatibility;
- assess data-loss risk;
- ensure an appropriate backup or snapshot strategy exists;
- document the recovery procedure when required.

A migration does not need a fake or unsafe `down` operation merely to appear reversible.

Recovery may use:

- application rollback;
- safe reverse migration;
- forward corrective migration;
- backup/snapshot restoration.

Choose according to the actual failure mode.

---

## Security

Security is an architectural requirement.

Always preserve:

- encryption in transit;
- encryption at rest through approved infrastructure;
- secure secret management;
- least privilege;
- isolation between users and financial spaces;
- authorization checks on protected resources;
- auditability of sensitive actions;
- protection of sensitive financial information from logs and telemetry.

Never:

- commit secrets;
- expose tokens or credentials;
- log sensitive financial payloads unnecessarily;
- rely only on frontend authorization;
- create silent administrative access to private financial data.

Super Admin is a platform role and does not imply unrestricted access to user financial data.

Any support access to private financial information must follow the project's explicit authorization, scope, expiration, reason, and audit requirements.

---

## Authentication and Authorization

Authentication and authorization are separate concerns.

The target product supports:

- email/password authentication;
- email verification;
- password recovery;
- Google authentication;
- Apple authentication;
- future MFA/2FA readiness;
- multiple active devices;
- remote session revocation.

These capabilities must be introduced incrementally according to their SDDs.

Financial-space authorization uses granular permissions with predefined permission presets where applicable.

A financial space has exactly one Owner.

Do not use ownership as a substitute for authorization checks.

---

## Frontend

Web, Android, and iOS target functional parity while allowing platform-appropriate UX.

The Web application must be responsive but does not need to imitate the native mobile interface.

Use the project's Design System.

The Design System evolves incrementally and should contain only foundations and components justified by actual product needs.

Accessibility uses WCAG 2.2 AA as the reference target and is applied progressively to implemented interfaces.

Support the configured application themes:

- Light;
- Dark;
- System.

Support localization architecture for:

- `pt-BR`;
- English.

Locale controls presentation and formatting. It must not silently change financial currency or financial meaning.

---

## Code Quality

Follow `ENGINEERING-GUIDELINES.md`.

Unless an accepted project decision states otherwise:

- use strict TypeScript;
- avoid `any`;
- prefer explicit domain types;
- use semantic English naming in source code;
- keep functions and components focused;
- avoid unnecessary abstractions;
- avoid unnecessary effects;
- avoid nested ternaries;
- organize imports consistently;
- validate external input at boundaries;
- handle errors explicitly;
- preserve separation of concerns.

Do not add comments to source code by default.

Code should communicate intent through:

- names;
- types;
- structure;
- tests;
- living documentation.

Comments are acceptable only when technically required or when a non-obvious constraint cannot reasonably be expressed through code or documentation.

Do not leave explanatory comments merely narrating what the code does.

---

## Dependencies

Before adding a dependency:

1. confirm the capability does not already exist in the project;
2. verify that the dependency solves a real requirement;
3. prefer actively maintained and appropriately scoped libraries;
4. consider Web/Android/iOS compatibility where applicable;
5. consider bundle/runtime/security impact;
6. avoid adding libraries for trivial functionality.

Meaningful dependency choices that constrain the architecture may require an ADR.

---

## Testing

Testing evolves progressively with the product.

Initially, prioritize unit tests for important business rules.

Do not introduce a complete E2E, contract, or integration test platform before the roadmap requires it.

When modifying existing behavior:

- update affected tests;
- add regression coverage for corrected defects when practical;
- test important financial calculations deterministically;
- avoid tests that depend unnecessarily on implementation details.

A task is not complete merely because the application compiles.

Run the validations required by the current SDD and project CI.

---

## Git and CI

The initial branch strategy is:

- `main`
- `develop`
- `feature/*`

`release/*` and `hotfix/*` may be introduced later when release complexity justifies them.

Changes to `develop` and `main` must go through Pull Requests.

Protected branches require the configured CI validations to pass before merge.

Early CI should include at least the checks established by the project, such as:

- lint;
- typecheck;
- existing automated tests.

Do not bypass failing validations to complete an SDD.

---

## Environments

The project uses isolated:

- Development;
- Staging/Homologation;
- Production.

Environment-specific configuration and data must remain isolated.

Use feature flags when required to enable or disable functionality by environment.

Do not hardcode environment behavior throughout business logic.

---

## Observability

Observability evolves progressively.

Early implementations should favor:

- structured logs;
- health checks;
- error capture.

Later releases may introduce:

- performance monitoring;
- technical metrics;
- tracing;
- richer operational dashboards;
- aggregate product analytics.

Never send sensitive financial information to observability tooling unless explicitly required and safely designed.

---

## Documentation

Documentation is living project infrastructure.

After implementation, update only documents affected by the change.

Depending on the SDD, this may include:

- `CURRENT-STATE.md`;
- `CHANGELOG.md`;
- `ARCHITECTURE.md`;
- `C4.md`;
- OpenAPI;
- ADRs;
- `DOMAIN-RULES.md`;
- `REQUIREMENTS.md`;
- `TECHNICAL-DEBT.md`.

Do not rewrite unrelated documents.

Do not alter historical ADRs to make them appear as if the current decision always existed.

Do not mark roadmap functionality as implemented until it actually exists.

`CURRENT-STATE.md` must describe reality, not intention.

---

## Technical Debt

Intentional shortcuts must not become invisible architecture.

When a temporary implementation creates meaningful future work, record it in `docs/engineering/TECHNICAL-DEBT.md`.

A debt entry should include, when applicable:

- ID;
- description;
- reason;
- impact;
- priority;
- originating SDD/release;
- status;
- optional target version.

Typical statuses:

- `Open`
- `Planned`
- `Resolved`
- `Accepted`

Do not classify every unfinished roadmap feature as technical debt.

Technical debt is an intentional compromise in the implementation, not simply functionality scheduled for later.

---

## Definition of Done

Each SDD owns its specific Definition of Done.

At minimum, before declaring an SDD complete:

1. all required behavior is implemented;
2. acceptance criteria are satisfied;
3. relevant tests pass;
4. lint and typecheck pass when configured;
5. no known regression was introduced;
6. required migrations are included;
7. API contracts are updated when affected;
8. relevant documentation is updated;
9. architectural decisions are recorded when required;
10. new intentional technical debt is documented;
11. `CURRENT-STATE.md` reflects the resulting system;
12. the implementation contains no unrelated future scope.

Do not claim completion when required validation could not be executed. State exactly what remains unverified.

---

## Agent Completion Report

When completing an implementation task, provide a concise report containing:

### Implemented

What changed.

### Validation

What tests/checks were executed and their results.

### Documentation

Which documentation files were updated.

### Decisions

Any ADRs created or architectural decisions made.

### Technical Debt

Any debt introduced or resolved.

### Remaining Issues

Anything required by the SDD that could not be completed or verified.

Do not hide failures or incomplete work.

---

## Final Rule

The goal is not to generate the largest amount of code.

The goal is to evolve the product through small, correct, understandable, documented, and verifiable increments while preserving financial integrity and keeping the codebase maintainable for both humans and AI agents.
