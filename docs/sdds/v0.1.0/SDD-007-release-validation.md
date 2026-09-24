# SDD-007 --- v0.1.0 Release Validation

## Objective

Validate the first usable vertical slice and prepare the release without
adding new product functionality.

## Dependencies

SDD-001 through SDD-006 complete.

## Validate

-   clean installation/setup;
-   authentication;
-   protected access;
-   create Financial Space;
-   default categories;
-   create Income;
-   create Expense;
-   list transactions;
-   user/space isolation;
-   lint;
-   typecheck;
-   automated tests;
-   migrations from clean database;
-   environment configuration;
-   basic Web responsiveness;
-   Android/iOS startup where applicable.

## Documentation

Verify: - `CURRENT-STATE.md` describes reality; - `CHANGELOG.md`
contains v0.1.0; - OpenAPI matches API; - ADR statuses are accurate; -
C4/architecture reflect implemented boundaries; - no roadmap feature is
falsely marked implemented.

## Acceptance

The complete v0.1.0 user journey works in supported development targets
with no known critical integrity/security defect.

## Definition of Done

Release validation report recorded in this SDD or linked artifact; all
required checks pass or unresolved blockers are explicitly documented.
No new feature is added under the guise of validation.
