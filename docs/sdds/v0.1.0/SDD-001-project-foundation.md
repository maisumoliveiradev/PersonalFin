# SDD-001 --- Project Foundation

## Objective

Create the minimum executable project structure for Web, Android, iOS,
API, shared contracts/domain, quality tooling, and environments without
implementing product features.

## Read first

-   `AGENTS.md`
-   `docs/project/CURRENT-STATE.md`
-   `docs/architecture/ARCHITECTURE.md`
-   `docs/architecture/adr/ADR-0001-platform-strategy.md`
-   `docs/engineering/ENGINEERING-GUIDELINES.md`

## Scope

-   validate and finalize initial platform strategy;
-   create workspace/package structure;
-   configure TypeScript strict mode;
-   configure formatter/linter/import ordering;
-   establish environment configuration pattern;
-   create minimal runnable Web/Mobile/API shells required by the
    selected architecture;
-   establish unit-test runner;
-   establish baseline CI commands;
-   create initial health check when API exists;
-   accept/update ADR-0001 after validation.

## Non-scope

Authentication, database domain schema, Financial Spaces, categories,
transactions, dashboards, offline sync.

## Acceptance

-   Given a clean checkout, when documented setup commands run, then the
    development applications start successfully.
-   Given the repository, when lint/typecheck/tests run, then the
    baseline passes.
-   No product feature is implemented.

## Definition of Done

-   platform decision recorded;
-   project runs;
-   lint/typecheck/test baseline passes;
-   environment strategy documented;
-   `CURRENT-STATE.md` updated;
-   `CHANGELOG.md` updated;
-   no unrelated feature scope.
